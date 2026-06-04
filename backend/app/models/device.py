from sqlalchemy import Column, String, Integer, Float, DateTime, func
from app.database.session import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True)  # e.g., "DV-1024"
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="healthy", nullable=False)  # healthy, warning, critical
    health = Column(Integer, default=100, nullable=False)  # 0 to 100
    failure_prob = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0 (percentage)
    rul = Column(Integer, default=180, nullable=False)  # remaining useful life (in days/hours)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
