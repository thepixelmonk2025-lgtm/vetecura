import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(150))
    phone = Column(String(20))
    email = Column(String(150))
    address = Column(Text)
    gstin = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
