import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base

class UserNotificationPreference(Base):
    __tablename__ = "user_notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    topic = Column(String(30), nullable=False)
    is_subscribed = Column(Boolean, default=True, nullable=False)
