import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base

class AnomalyConfig(Base):
    __tablename__ = "anomaly_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_name = Column(String(60), unique=True, nullable=False, index=True)
    threshold_value = Column(Numeric(10, 2), nullable=False)
    window_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
