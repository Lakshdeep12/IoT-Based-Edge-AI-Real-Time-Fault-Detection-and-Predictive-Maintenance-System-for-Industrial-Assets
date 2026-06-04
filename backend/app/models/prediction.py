from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from app.database.session import Base

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    telemetry_id = Column(Integer, ForeignKey("telemetry.telemetry_id", ondelete="SET NULL"), nullable=True)
    ml_model_used = Column(String, nullable=False)
    predicted_state = Column(String, nullable=False)  # "Healthy", "Bearing Wear", "Overheating", etc.
    predicted_code = Column(Integer, nullable=False)  # 0: normal, 1: failure
    confidence = Column(Float, default=0.0, nullable=False)  # prediction confidence percentage
    time_to_failure_sec = Column(Float, nullable=True)
    failure_probability = Column(Float, nullable=True)  # failure percentage
    remaining_useful_life = Column(Float, nullable=True)  # hours/days
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
