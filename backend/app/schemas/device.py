from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DeviceBase(BaseModel):
    id: str  # "DV-1024"
    name: str
    location: str
    type: str

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    health: Optional[int] = None
    failure_prob: Optional[float] = None
    rul: Optional[int] = None

class DeviceResponse(DeviceBase):
    status: str
    health: int
    failure_prob: float
    rul: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
