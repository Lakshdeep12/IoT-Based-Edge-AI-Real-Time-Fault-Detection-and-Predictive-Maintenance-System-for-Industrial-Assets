from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TelemetryBase(BaseModel):
    device_id: str
    vibration_mps2: float
    temperature_c: float
    runtime: Optional[float] = 0.0

class TelemetryCreate(TelemetryBase):
    pass

class TelemetryResponse(TelemetryBase):
    telemetry_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True

class ManualEntryCreate(BaseModel):
    device_id: str
    temperature_c: float
    vibration_mps2: float
    runtime: float
