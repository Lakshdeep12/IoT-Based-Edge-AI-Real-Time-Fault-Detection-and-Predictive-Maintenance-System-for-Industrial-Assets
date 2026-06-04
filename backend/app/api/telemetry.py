import csv
import io
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.device import Device
from app.models.telemetry import Telemetry
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.schemas.telemetry import TelemetryResponse, ManualEntryCreate
from app.services.ml_service import MLService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Ingestion"])

# Schema representing the raw JSON payload sent directly by ESP32 nodes
class ESP32TelemetryInput(BaseModel):
    device_id: str
    temperature: float
    vibration: float
    timestamp: Optional[str] = None

@router.post("", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
def ingest_live_telemetry(payload: ESP32TelemetryInput, db: Session = Depends(get_db)):
    """
    Ingests high-frequency real-time telemetry from ESP32 edge nodes.
    Performs real-time ML classification, triggers alerts, and updates asset health.
    """
    # 1. Verify device exists, or create on the fly
    device = db.query(Device).filter(Device.id == payload.device_id).first()
    if not device:
        # Auto-create device for convenience in demo setup
        device = Device(
            id=payload.device_id,
            name=f"Edge Sensor Node ({payload.device_id})",
            location="Plant A — Live Ingestion Line",
            type="Industrial Asset",
            status="healthy",
            health=100,
            failure_prob=0.0,
            rul=180
        )
        db.add(device)
        db.commit()
        db.refresh(device)

    # Calculate cumulative runtime (add 0.1 hours per telemetry packet as standard incremental step)
    # Fetch last telemetry runtime
    last_telemetry = db.query(Telemetry).filter(Telemetry.device_id == payload.device_id).order_by(Telemetry.recorded_at.desc()).first()
    runtime = (last_telemetry.runtime + 0.1) if last_telemetry else 0.1

    # 2. Store Raw Telemetry Record
    telemetry = Telemetry(
        device_id=payload.device_id,
        vibration_mps2=payload.vibration,
        temperature_c=payload.temperature,
        runtime=runtime
    )
    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    # 3. Evaluate ML Prediction
    pred_res = MLService.predict(payload.temperature, payload.vibration, runtime)
    
    # Store Prediction
    prediction = Prediction(
        device_id=payload.device_id,
        telemetry_id=telemetry.telemetry_id,
        ml_model_used="Random Forest (Machine Failure)",
        predicted_state=pred_res["predicted_state"],
        predicted_code=pred_res["predicted_code"],
        confidence=pred_res["confidence"],
        failure_probability=pred_res["failure_probability"],
        remaining_useful_life=pred_res["rul_days"] * 24.0, # convert to hours
        time_to_failure_sec=float(pred_res["rul_days"] * 24.0 * 3600.0)
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # 4. Handle System Alerts (If failure state is isolated)
    alert_triggered = False
    if pred_res["predicted_code"] == 1:
        # Determine Severity based on failure probability
        severity = "critical" if pred_res["failure_probability"] > 70.0 else "warning"
        
        # Check if an active alert for this device and fault type already exists (to prevent alert flooding)
        existing_alert = db.query(Alert).filter(
            Alert.device_id == payload.device_id,
            Alert.alert_type == pred_res["predicted_state"],
            Alert.status == "active"
        ).first()

        if not existing_alert:
            # Call Gemini (with rule-based fallback) to generate diagnosis
            guide = LLMService.generate_remediation_guide(
                pred_res["predicted_state"], 
                payload.temperature, 
                payload.vibration, 
                payload.device_id
            )
            
            alert = Alert(
                device_id=payload.device_id,
                prediction_id=prediction.prediction_id,
                alert_type=pred_res["predicted_state"],
                llm_remediation_guide=guide,
                severity=severity,
                status="active"
            )
            db.add(alert)
            alert_triggered = True

    # 5. Synchronize State to Device Table
    device.status = "critical" if pred_res["predicted_code"] == 1 and pred_res["failure_probability"] > 70.0 else (
        "warning" if pred_res["predicted_code"] == 1 else "healthy"
    )
    device.health = pred_res["health_score"]
    device.failure_prob = pred_res["failure_probability"]
    device.rul = pred_res["rul_days"]
    device.updated_at = datetime.now()
    
    db.commit()

    logger.info(f"Ingested live telemetry for device {payload.device_id}: Temp={payload.temperature}, Vib={payload.vibration}. Alert={alert_triggered}")
    return telemetry

@router.get("/device/{device_id}", response_model=List[TelemetryResponse])
def get_device_telemetry(device_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Fetches historical time-series telemetry records for trend plotting."""
    return db.query(Telemetry).filter(Telemetry.device_id == device_id).order_by(Telemetry.recorded_at.desc()).limit(limit).all()

@router.post("/manual", response_model=TelemetryResponse)
def create_manual_telemetry(payload: ManualEntryCreate, db: Session = Depends(get_db)):
    """Allows technicians to manually submit machine metrics from on-site walkdowns."""
    # Convert manual entry create format to standard ESP32 format
    esp32_input = ESP32TelemetryInput(
        device_id=payload.device_id,
        temperature=payload.temperature_c,
        vibration=payload.vibration_mps2
    )
    return ingest_live_telemetry(esp32_input, db)

@router.post("/upload")
def upload_historical_csv(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Parses, validates, and imports historical telemetry CSV datasets.
    Checks for missing fields, required columns, and data type correctness.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a standard CSV file."
        )

    try:
        contents = file.file.read().decode("utf-8")
        csv_file = io.StringIO(contents)
        reader = csv.DictReader(csv_file)
        
        # Verify Headers
        headers = [h.strip().lower() for h in reader.fieldnames] if reader.fieldnames else []
        required_variations = {
            "device_id": ["device_id", "device", "id", "asset_id"],
            "temperature": ["temperature", "temperature_c", "temp_c", "temp"],
            "vibration": ["vibration", "vibration_mps2", "vibration_mms", "vib"]
        }

        # Find mappings
        col_mappings = {}
        for key, aliases in required_variations.items():
            found = None
            for alias in aliases:
                if alias in headers:
                    # Get original header casing
                    idx = headers.index(alias)
                    found = reader.fieldnames[idx]
                    break
            if not found:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required column mapping for '{key}' is missing. Expected one of {aliases}."
                )
            col_mappings[key] = found

        success_count = 0
        error_rows = []
        
        for idx, row in enumerate(reader, start=1):
            try:
                # 1. Extract values
                dev_id = row[col_mappings["device_id"]].strip()
                temp_str = row[col_mappings["temperature"]].strip()
                vib_str = row[col_mappings["vibration"]].strip()
                
                # Retrieve optional runtime
                runtime_str = row.get("runtime", "0").strip() or row.get("runtime_hours", "0").strip()

                # 2. Validation Checks
                if not dev_id or not temp_str or not vib_str:
                    error_rows.append(f"Row {idx}: Missing required cell values.")
                    continue
                
                # Convert types
                temp = float(temp_str)
                vib = float(vib_str)
                runtime = float(runtime_str) if runtime_str else 0.0

                # 3. Insert telemetry and perform inference
                # To avoid overloading DB triggers we create it as standard live ingestion flow
                esp32_input = ESP32TelemetryInput(
                    device_id=dev_id,
                    temperature=temp,
                    vibration=vib
                )
                ingest_live_telemetry(esp32_input, db)
                success_count += 1

            except ValueError:
                error_rows.append(f"Row {idx}: Invalid numeric conversion (temperature/vibration/runtime).")
            except Exception as e:
                error_rows.append(f"Row {idx}: Unexpected error: {str(e)}")

        return {
            "message": "CSV upload processed successfully.",
            "records_imported": success_count,
            "failed_records_count": len(error_rows),
            "errors": error_rows[:10]  # Return top 10 errors for feedback
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"CSV import handler failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the CSV: {str(e)}"
        )
