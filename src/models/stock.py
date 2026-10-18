import uuid
import enum
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(60), nullable=False)
    mfg_date = Column(Date)
    expiry_date = Column(Date, index=True)
    received_via_grn = Column(UUID(as_uuid=True), ForeignKey("goods_receipts.id"))


class ItemBarcodeStatusEnum(str, enum.Enum):
    available = "available"
    reserved_pick = "reserved_pick"
    dispatched = "dispatched"
    damaged_hold = "damaged_hold"
    quarantine = "quarantine"
    returned_hold = "returned_hold"
    disposed = "disposed"


class ItemBarcode(Base):
    __tablename__ = "item_barcodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode_value = Column(String(120), unique=True, nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    status = Column(String(30), default=ItemBarcodeStatusEnum.available.value, nullable=False, index=True)
    current_rack_id = Column(UUID(as_uuid=True), ForeignKey("racks.id"), nullable=True, index=True)
    is_system_generated = Column(Boolean, default=False)
    printed_at = Column(DateTime(timezone=True))
    last_scanned_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=False, index=True)
    rack_id = Column(UUID(as_uuid=True), ForeignKey("racks.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ScanEventTypeEnum(str, enum.Enum):
    stock_in = "stock_in"
    stock_out = "stock_out"
    cycle_count = "cycle_count"
    return_in = "return_in"
    writeoff_out = "writeoff_out"
    transfer = "transfer"


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(20), nullable=False)
    barcode_value = Column(String(120), nullable=False, index=True)
    item_barcode_id = Column(UUID(as_uuid=True), ForeignKey("item_barcodes.id"))
    reference_id = Column(UUID(as_uuid=True), index=True)  # GRN/dispatch/etc. id
    rack_id = Column(UUID(as_uuid=True), ForeignKey("racks.id"))
    scanned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
    device_info = Column(String(150))
