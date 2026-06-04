from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MaintenanceLogCreate(BaseModel):
    device_id: str
    alert_id: Optional[int] = None
    action: str
    technician: Optional[str] = None
    status: str = "planned"


class MaintenanceLogUpdate(BaseModel):
    action: Optional[str] = None
    technician: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class MaintenanceLogResponse(BaseModel):
    log_id: int
    device_id: str
    alert_id: Optional[int] = None
    action: str
    technician: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
