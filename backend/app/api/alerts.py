from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertAcknowledge
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

# Seed default alerts matching the demo devices seeded in devices.py
DEFAULT_ALERTS = [
    {
        "alert_id": 1,
        "device_id": "DV-1025",
        "alert_type": "Bearing Wear",
        "severity": "warning",
        "status": "active",
        "llm_remediation_guide": "### Automated Diagnostics Report (Warning Priority)\n\n**Root Cause isolated:**\nElevated vibration threshold exceeded due to bearing wear.\n\n**Immediate Actions:**\n1. Check motor casing temperature.\n2. Schedule bearing grease service.\n3. Inspect vibration spectrum during off-peak shifts."
    },
    {
        "alert_id": 2,
        "device_id": "DV-1027",
        "alert_type": "Overheating",
        "severity": "critical",
        "status": "active",
        "llm_remediation_guide": "### Automated Diagnostics Report (Critical Priority)\n\n**Root Cause isolated:**\nBlocked cooling channels resulting in thermal overload on windings.\n\n**Immediate Actions:**\n1. E-STOP turbine to prevent catastrophic insulation failure.\n2. Inspect coolant levels and check pump status.\n3. Clean air filters and radiator grills."
    },
    {
        "alert_id": 3,
        "device_id": "DV-1028",
        "alert_type": "Motor Overload",
        "severity": "warning",
        "status": "active",
        "llm_remediation_guide": "### Automated Diagnostics Report (Warning Priority)\n\n**Root Cause isolated:**\nMechanical binding in output shaft coupling.\n\n**Immediate Actions:**\n1. Inspect output shafts for soft foot or misaligned coupling pads.\n2. Review torque levels on variable frequency drive."
    }
]

def seed_alerts_if_empty(db: Session):
    """Seeds typical demo alerts if none are present in database."""
    if db.query(Alert).count() == 0:
        for a_data in DEFAULT_ALERTS:
            alert = Alert(**a_data)
            db.add(alert)
        db.commit()

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves all system alerts, seeding demo warnings if empty."""
    seed_alerts_if_empty(db)
    return db.query(Alert).order_by(Alert.recorded_at.desc()).all()

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int, 
    payload: AlertAcknowledge, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks an active alarm alert as acknowledged or resolved."""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )
    
    alert.status = payload.status
    db.commit()
    db.refresh(alert)
    return alert
