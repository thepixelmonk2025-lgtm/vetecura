import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class TelegramAlertLog(Base):
    __tablename__ = "telegram_alerts_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)
    related_entity_type = Column(String(60))
    related_entity_id = Column(UUID(as_uuid=True))
    status = Column(String(20), default="queued", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
