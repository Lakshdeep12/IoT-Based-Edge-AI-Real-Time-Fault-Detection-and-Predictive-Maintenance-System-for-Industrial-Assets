from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.prediction import Prediction
from app.models.device import Device
from app.schemas.prediction import PredictionResponse
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/predictions", tags=["Predictions & ML Analytics"])

def _compute_risk(failure_prob: float) -> str:
    """Maps a failure probability percentage to a human-readable risk tier."""
    if failure_prob >= 75:
        return "Critical"
    elif failure_prob >= 50:
        return "High"
    elif failure_prob >= 25:
        return "Medium"
    return "Low"

@router.get("", response_model=List[Dict[str, Any]])
def get_all_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the latest ML prediction for every registered device.
    Each entry includes device name, predicted fault, confidence, failure
    probability, remaining useful life (RUL) and a risk tier label.
    """
    # Subquery: latest recorded_at per device
    latest_sub = db.query(
        Prediction.device_id,
        func.max(Prediction.recorded_at).label("max_date")
    ).group_by(Prediction.device_id).subquery()

    rows = db.query(Prediction, Device).join(
        latest_sub,
        (Prediction.device_id == latest_sub.c.device_id) &
        (Prediction.recorded_at == latest_sub.c.max_date)
    ).join(Device, Device.id == Prediction.device_id).all()

    results = []
    for pred, device in rows:
        fp = float(pred.failure_probability or 0)
        conf = float(pred.confidence or 0)
        rul_days = round(float(pred.remaining_useful_life or 0) / 24.0, 1)
        results.append({
            "prediction_id": pred.prediction_id,
            "device_id": pred.device_id,
            "device_name": device.name,
            "predicted_state": pred.predicted_state,
            "confidence": round(conf, 1),
            "failure_probability": round(fp, 1),
            "rul_days": rul_days,
            "risk": _compute_risk(fp),
            "recorded_at": pred.recorded_at.isoformat() if pred.recorded_at else None,
        })

    # Sort by failure probability descending (most critical first)
    results.sort(key=lambda x: x["failure_probability"], reverse=True)
    return results

@router.get("/device/{device_id}", response_model=List[PredictionResponse])
def get_device_predictions(
    device_id: str, 
    limit: int = 30, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves the history of ML predictions for a specific machine."""
    return db.query(Prediction).filter(Prediction.device_id == device_id).order_by(Prediction.recorded_at.desc()).limit(limit).all()

@router.get("/analytics")
def get_fleet_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compiles aggregated fleet-wide analytics:
    - Average health index
    - Fault distribution profiles
    - Average remaining useful life (RUL)
    """
    total_devices = db.query(Device).count()
    if total_devices == 0:
        return {
            "average_health_score": 100,
            "average_rul_days": 180,
            "fault_distribution": {},
            "active_warnings_count": 0
        }

    # 1. Average Health & RUL
    stats = db.query(
        func.avg(Device.health).label("avg_health"),
        func.avg(Device.rul).label("avg_rul")
    ).first()

    # 2. Fault distribution
    # Group latest predictions per device
    latest_sub = db.query(
        Prediction.device_id,
        func.max(Prediction.recorded_at).label("max_date")
    ).group_by(Prediction.device_id).subquery()

    faults_query = db.query(
        Prediction.predicted_state,
        func.count(Prediction.prediction_id)
    ).join(
        latest_sub,
        (Prediction.device_id == latest_sub.c.device_id) & (Prediction.recorded_at == latest_sub.c.max_date)
    ).filter(
        Prediction.predicted_state != "Healthy"
    ).group_by(Prediction.predicted_state).all()

    fault_distribution = {state: count for state, count in faults_query}

    # 3. Active warnings count
    active_warnings = db.query(Device).filter(Device.status != "healthy").count()

    return {
        "average_health_score": round(float(stats.avg_health or 100), 1),
        "average_rul_days": round(float(stats.avg_rul or 180), 1),
        "fault_distribution": fault_distribution,
        "active_warnings_count": active_warnings
    }
