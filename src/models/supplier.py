import uuid
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(150))
    phone = Column(String(20))
    email = Column(String(150))
    address = Column(Text)
    gstin = Column(String(20))
    on_time_delivery_pct = Column(Numeric(5, 2), default=0)
    rejection_rate_pct = Column(Numeric(5, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SupplierPriceHistory(Base):
    __tablename__ = "supplier_price_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    unit_price = Column(Numeric(12, 2), nullable=False)
    effective_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
