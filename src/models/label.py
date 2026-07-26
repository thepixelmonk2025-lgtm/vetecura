import uuid
import enum
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from src.db.session import Base

class LabelTypeEnum(str, enum.Enum):
    ITEM = "ITEM"
    BATCH = "BATCH"
    RACK = "RACK"
    PALLET = "PALLET"

class PrinterConnectionTypeEnum(str, enum.Enum):
    usb = "usb"
    bluetooth = "bluetooth"
    network = "network"

class PrinterProtocolEnum(str, enum.Enum):
    escpos = "escpos"
    zpl = "zpl"

class PrintJobStatusEnum(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    printed = "printed"
    failed = "failed"
    cancelled = "cancelled"

class LabelTemplate(Base):
    __tablename__ = "label_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    preset_code = Column(String(30), unique=True, nullable=False, index=True)
    label_type = Column(String(20), nullable=False)
    width_mm = Column(Numeric(5, 2), nullable=False)
    height_mm = Column(Numeric(5, 2), nullable=False)
    dpi = Column(Integer, default=203)
    symbology = Column(String(20), nullable=False)
    layout_json = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Printer(Base):
    __tablename__ = "printers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    connection_type = Column(String(20), nullable=False)
    protocol = Column(String(20), nullable=False)
    ip_address = Column(String(50))
    location = Column(String(100))
    is_active = Column(Boolean, default=True)
    last_seen_at = Column(DateTime(timezone=True))

class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label_type = Column(String(20), nullable=False)
    entity_type = Column(String(30), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("label_templates.id"))
    printer_id = Column(UUID(as_uuid=True), ForeignKey("printers.id"))
    status = Column(String(20), default=PrintJobStatusEnum.queued, nullable=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    printed_at = Column(DateTime(timezone=True))
