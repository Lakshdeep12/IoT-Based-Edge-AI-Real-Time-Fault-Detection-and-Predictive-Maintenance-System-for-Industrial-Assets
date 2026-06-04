from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PredictionResponse(BaseModel):
    prediction_id: int
    device_id: str
    telemetry_id: Optional[int] = None
    ml_model_used: str
    predicted_state: str
    predicted_code: int
    confidence: float
    time_to_failure_sec: Optional[float] = None
    failure_probability: Optional[float] = None
    remaining_useful_life: Optional[float] = None
    recorded_at: datetime

    class Config:
        from_attributes = True
