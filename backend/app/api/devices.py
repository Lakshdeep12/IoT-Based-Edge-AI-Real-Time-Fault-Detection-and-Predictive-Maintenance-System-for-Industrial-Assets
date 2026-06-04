from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/devices", tags=["Devices"])

# List of typical industrial machinery to seed as default assets if empty
DEFAULT_DEVICES = [
    {"id": "DV-1024", "name": "Centrifugal Pump #3", "location": "Plant A — Line 1", "type": "Centrifugal Pump", "status": "healthy", "health": 92, "failure_prob": 3.5, "rul": 165},
    {"id": "DV-1025", "name": "Industrial Motor #7", "location": "Plant A — Line 3", "type": "Industrial Motor", "status": "warning", "health": 74, "failure_prob": 28.4, "rul": 88},
    {"id": "DV-1026", "name": "Compressor #2", "location": "Plant B — Cooling", "type": "Compressor", "status": "healthy", "health": 88, "failure_prob": 7.2, "rul": 142},
    {"id": "DV-1027", "name": "Turbine #1", "location": "Plant B — Assembly", "type": "Turbine", "status": "critical", "health": 35, "failure_prob": 82.5, "rul": 8},
    {"id": "DV-1028", "name": "Gearbox #5", "location": "Plant C — Packaging", "type": "Gearbox", "status": "warning", "health": 68, "failure_prob": 38.1, "rul": 62},
    {"id": "DV-1029", "name": "Conveyor #6", "location": "Plant C — Utilities", "type": "Conveyor", "status": "healthy", "health": 95, "failure_prob": 1.8, "rul": 178}
]

def seed_devices_if_empty(db: Session):
    """Seeds typical demo devices if none are present in database."""
    if db.query(Device).count() == 0:
        for d_data in DEFAULT_DEVICES:
            device = Device(**d_data)
            db.add(device)
        db.commit()

@router.get("", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves all registered devices, seeding demo assets if empty."""
    seed_devices_if_empty(db)
    return db.query(Device).all()

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Registers a new industrial asset."""
    existing = db.query(Device).filter(Device.id == device_in.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with ID '{device_in.id}' already exists."
        )
    
    device = Device(
        id=device_in.id,
        name=device_in.name,
        location=device_in.location,
        type=device_in.type,
        status="healthy",
        health=100,
        failure_prob=0.0,
        rul=180
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches details for a single asset."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found."
        )
    return device

@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: str,
    device_in: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates properties or statuses of an asset."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found."
        )
    
    update_data = device_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
        
    db.commit()
    db.refresh(device)
    return device

@router.delete("/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes an asset from monitoring records."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found."
        )
    db.delete(device)
    db.commit()
    return {"message": f"Device '{device_id}' deleted successfully."}
