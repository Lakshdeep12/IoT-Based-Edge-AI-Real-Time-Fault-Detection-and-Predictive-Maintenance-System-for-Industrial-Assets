from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AlertResponse(BaseModel):
    alert_id: int
    device_id: str
    prediction_id: Optional[int] = None
    alert_type: str
    llm_remediation_guide: Optional[str] = None
    severity: str
    status: str
    recorded_at: datetime

    class Config:
        from_attributes = True

class AlertAcknowledge(BaseModel):
    status: str = "acknowledged"
