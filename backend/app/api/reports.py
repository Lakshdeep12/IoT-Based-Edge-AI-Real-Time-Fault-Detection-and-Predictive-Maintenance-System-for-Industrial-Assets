from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.database.session import get_db
from app.models.device import Device
from app.models.alert import Alert
from app.services.report_service import ReportService
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/download")
def download_fleet_report(
    format: str = Query("pdf", regex="^(pdf|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and downloads a fleet-wide status report.
    Supports PDF ('format=pdf') and CSV ('format=csv').
    """
    # 1. Fetch current devices
    db_devices = db.query(Device).all()
    devices = []
    for d in db_devices:
        devices.append({
            "id": d.id,
            "name": d.name,
            "location": d.location,
            "type": d.type,
            "status": d.status,
            "health": d.health,
            "failure_prob": d.failure_prob,
            "rul": d.rul
        })

    # 2. Fetch recent alerts
    db_alerts = db.query(Alert).filter(Alert.status == "active").all()
    alerts = []
    for a in db_alerts:
        alerts.append({
            "device_id": a.device_id,
            "severity": a.severity,
            "message": a.llm_remediation_guide or f"{a.alert_type} detected",
            "recorded_at": a.recorded_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    # 3. Compile and generate
    if format == "csv":
        csv_content = ReportService.generate_csv_report(devices)
        filename = f"maintenance_report_{current_user.name or 'fleet'}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    else: # PDF
        pdf_bytes = ReportService.generate_pdf_report(
            devices=devices,
            alerts=alerts,
            executive_summary=f"Report compiled by authorized technician: {current_user.email}."
        )
        filename = f"maintenance_report_{current_user.name or 'fleet'}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
