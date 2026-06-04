from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database.session import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.alert_id", ondelete="SET NULL"), nullable=True)
    action = Column(Text, nullable=False)
    technician = Column(String, nullable=True)
    status = Column(String, default="planned", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
