import uuid
import enum
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(60), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    unit = Column(String(20), default="unit")
    reorder_level = Column(Integer, default=0)
    manufacturer_barcode = Column(String(100), index=True)
    is_batch_tracked = Column(Boolean, default=True)
    unit_price = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
