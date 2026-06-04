from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database.session import get_db
from app.models.device import Device
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.schemas.maintenance_log import (
    MaintenanceLogCreate,
    MaintenanceLogResponse,
    MaintenanceLogUpdate,
)

router = APIRouter(prefix="/maintenance-logs", tags=["Maintenance Logs"])


@router.get("", response_model=List[MaintenanceLogResponse])
def list_maintenance_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(MaintenanceLog).order_by(MaintenanceLog.created_at.desc()).all()


@router.post("", response_model=MaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(
    payload: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = db.query(Device).filter(Device.id == payload.device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{payload.device_id}' not found.",
        )

    log = MaintenanceLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/{log_id}", response_model=MaintenanceLogResponse)
def update_maintenance_log(
    log_id: int,
    payload: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.log_id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance log {log_id} not found.",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return log
