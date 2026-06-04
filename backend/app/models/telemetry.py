from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from app.database.session import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    telemetry_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    vibration_mps2 = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    runtime = Column(Float, default=0.0, nullable=False)  # cumulative run hours
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
