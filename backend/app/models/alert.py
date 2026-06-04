from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database.session import Base

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.prediction_id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String, nullable=False)
    llm_remediation_guide = Column(Text, nullable=True)
    severity = Column(String, default="warning", nullable=False)  # info, warning, critical
    status = Column(String, default="active", nullable=False)  # active, acknowledged, resolved
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
