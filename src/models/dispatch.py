"""Dispatch domain models: SalesOrder, PickList, Dispatch"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from src.db.session import Base


class SalesOrderStatusEnum(str, enum.Enum):
    pending = "pending"
    picking = "picking"
    ready = "ready"
    dispatched = "dispatched"
    cancelled = "cancelled"


class PickListStatusEnum(str, enum.Enum):
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"


class DispatchStatusEnum(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_reference = Column(String(60), nullable=False, index=True)
    customer_name = Column(String(200))
    status = Column(String(20), default=SalesOrderStatusEnum.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sales_order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    ordered_qty = Column(Integer, nullable=False)


class PickList(Base):
    __tablename__ = "pick_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sales_order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default=PickListStatusEnum.assigned, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sales_order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id"), nullable=False)
    pick_list_id = Column(UUID(as_uuid=True), ForeignKey("pick_lists.id"), nullable=False)
    dispatched_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scanned_count = Column(Integer, default=0, nullable=False)
    expected_count = Column(Integer, nullable=False)
    status = Column(String(20), default=DispatchStatusEnum.in_progress, nullable=False)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
