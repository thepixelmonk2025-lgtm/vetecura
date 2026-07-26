"""Anti-theft domain models: DamageWriteoff, Return, CycleCount, CycleCountVariance"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class WriteoffStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class WriteoffReasonEnum(str, enum.Enum):
    damaged = "damaged"
    expired = "expired"
    quality_issue = "quality_issue"
    other = "other"


class ReturnTypeEnum(str, enum.Enum):
    customer = "customer"
    supplier = "supplier"


class ReturnConditionEnum(str, enum.Enum):
    good = "good"
    damaged = "damaged"
    expired = "expired"


class CycleCountStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"


class DamageWriteoff(Base):
    __tablename__ = "damage_writeoffs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_barcode_id = Column(UUID(as_uuid=True), ForeignKey("item_barcodes.id"), nullable=False)
    reason = Column(String(50), nullable=False)
    photo_proof_url = Column(Text, nullable=False)  # MANDATORY — cannot be approved without this
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String(20), default=WriteoffStatusEnum.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))


class Return(Base):
    __tablename__ = "returns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_type = Column(String(20), nullable=False)  # customer / supplier
    reference_order_id = Column(UUID(as_uuid=True))   # sales_order or purchase_order
    item_barcode_id = Column(UUID(as_uuid=True), ForeignKey("item_barcodes.id"), nullable=False)
    condition = Column(String(20))                     # good / damaged / expired (set at inspect time)
    routed_to_rack_id = Column(UUID(as_uuid=True), ForeignKey("racks.id"))
    inspected_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CycleCount(Base):
    __tablename__ = "cycle_counts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rack_id = Column(UUID(as_uuid=True), ForeignKey("racks.id"), nullable=False)
    scheduled_date = Column(Date)
    status = Column(String(20), default=CycleCountStatusEnum.scheduled, nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    completed_at = Column(DateTime(timezone=True))


class CycleCountVariance(Base):
    __tablename__ = "cycle_count_variances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_count_id = Column(UUID(as_uuid=True), ForeignKey("cycle_counts.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False)
    system_qty = Column(Integer, nullable=False)
    counted_qty = Column(Integer, nullable=False)
    # variance = counted_qty - system_qty (computed in application, not DB stored computed column for portability)
