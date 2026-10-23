"""Purchase Order API — /api/v1/purchase-orders"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, field_validator
from src.db.session import get_db
from src.api.deps import require_role, get_current_active_user
from src.models.user import RoleEnum, User
from src.models.inbound import PurchaseOrder, PurchaseOrderItem, POStatusEnum
from src.models.supplier import Supplier
from src.models.audit import AuditLog
from src.core.notifications import NotificationService

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

from typing import Optional, Union, Any

class POItemCreate(BaseModel):
    product_id: UUID
    ordered_qty: int
    unit_price: Optional[Union[float, str]] = None


class POCreate(BaseModel):
    supplier_id: UUID
    items: list[POItemCreate]


class POItemOut(BaseModel):
    id: UUID
    product_id: UUID
    ordered_qty: int
    unit_price: Optional[Any] = None

    class Config:
        from_attributes = True


class POOut(BaseModel):
    id: UUID
    po_number: str
    supplier_id: UUID
    status: str
    created_by: UUID
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime
    items: list[POItemOut] = []

    class Config:
        from_attributes = True


class PORejectBody(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_min_length(cls, v):
        if len(v.strip()) < 10:
            raise ValueError("Rejection reason must be at least 10 characters")
        return v.strip()


# ── Helpers ────────────────────────────────────────────────────────────────

def _next_po_number() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"PO-{ts}"


async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(1).with_for_update()
    )
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    uid = user_id if isinstance(user_id, UUID) else UUID(str(user_id))

    log = AuditLog(
        user_id=uid,
        action=action,
        entity_type="purchase_orders",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[POOut])
async def list_purchase_orders(
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    query = select(PurchaseOrder).options(selectinload(PurchaseOrder.items))
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    return result.scalars().all()


@router.post("", response_model=POOut, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    body: POCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.purchase_team, RoleEnum.owner])),
):
    po = PurchaseOrder(
        po_number=_next_po_number(),
        supplier_id=body.supplier_id,
        status=POStatusEnum.draft,
        created_by=current_user.id,
    )
    db.add(po)
    await db.flush()

    total_qty = 0
    for item in body.items:
        total_qty += item.ordered_qty
        db.add(PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item.product_id,
            ordered_qty=item.ordered_qty,
            unit_price=str(item.unit_price) if item.unit_price else None,
        ))

    # Fetch supplier name for rich alert
    sup_res = await db.execute(select(Supplier).where(Supplier.id == body.supplier_id))
    supplier = sup_res.scalar_one_or_none()
    supplier_name = supplier.name if supplier else "Unknown Supplier"

    await _write_audit(db, current_user.id, "po_drafted", po.id, {"po_number": po.po_number})

    # Enqueue Telegram notification to Operations Group (Stock In)
    alert_msg = (
        f"📋 <b>[NEW PURCHASE ORDER CREATED]</b>\n"
        f"<b>PO Number:</b> <code>{po.po_number}</code>\n"
        f"<b>Supplier:</b> {supplier_name}\n"
        f"<b>Total Units:</b> {total_qty} units ({len(body.items)} line items)\n"
        f"<b>Status:</b> Draft\n"
        f"<b>Created By:</b> {current_user.email}\n"
        f"<i>Ready for manager approval and inbound barcode scanning.</i>"
    )
    await NotificationService.enqueue(
        db,
        topic="stock_in",
        message=alert_msg,
        entity_type="purchase_orders",
        entity_id=po.id,
    )

    await db.commit()
    res = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    )
    return res.scalar_one()


@router.post("/{po_id}/submit", response_model=POOut)
async def submit_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.purchase_team, RoleEnum.owner])),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status != POStatusEnum.draft:
        raise HTTPException(status_code=409, detail=f"Cannot submit PO with status '{po.status}'")

    po.status = POStatusEnum.pending_approval
    await _write_audit(db, current_user.id, "po_submitted", po.id, {"status": "pending_approval"})

    await NotificationService.enqueue(
        db,
        topic="stock_in",
        message=f"⏳ <b>[PO SUBMITTED FOR APPROVAL]</b>\n<b>PO Number:</b> <code>{po.po_number}</code>\n<b>Submitted By:</b> {current_user.email}\n<i>Awaiting Warehouse Manager sign-off.</i>",
        entity_type="purchase_orders",
        entity_id=po.id,
    )

    await db.commit()
    res = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    )
    return res.scalar_one()


@router.post("/{po_id}/approve", response_model=POOut)
async def approve_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status != POStatusEnum.pending_approval:
        raise HTTPException(status_code=409, detail=f"Cannot approve PO with status '{po.status}'")

    po.status = POStatusEnum.approved
    po.approved_by = current_user.id
    po.approved_at = datetime.now(timezone.utc)
    await _write_audit(db, current_user.id, "po_approved", po.id, {"approved_by": str(current_user.id)})

    await NotificationService.enqueue(
        db,
        topic="stock_in",
        message=f"✅ <b>[PURCHASE ORDER APPROVED]</b>\n<b>PO Number:</b> <code>{po.po_number}</code>\n<b>Approved By:</b> {current_user.email}\n<i>Inbound dock is cleared for goods arrival & barcode scanning.</i>",
        entity_type="purchase_orders",
        entity_id=po.id,
    )

    await db.commit()
    res = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    )
    return res.scalar_one()


@router.post("/{po_id}/reject", response_model=POOut)
async def reject_purchase_order(
    po_id: UUID,
    body: PORejectBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status not in [POStatusEnum.pending_approval, POStatusEnum.draft]:
        raise HTTPException(status_code=409, detail=f"Cannot reject PO with status '{po.status}'")

    po.status = POStatusEnum.rejected
    await _write_audit(db, current_user.id, "po_rejected", po.id, {"reason": body.reason})

    await NotificationService.enqueue(
        db,
        topic="stock_in",
        message=f"❌ <b>[PURCHASE ORDER REJECTED]</b>\n<b>PO Number:</b> <code>{po.po_number}</code>\n<b>Reason:</b> {body.reason}\n<b>Rejected By:</b> {current_user.email}",
        entity_type="purchase_orders",
        entity_id=po.id,
    )

    await db.commit()
    res = await db.execute(
        select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    )
    return res.scalar_one()


@router.get("/{po_id}", response_model=POOut)
async def get_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    items_result = await db.execute(
        select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
    )
    items = items_result.scalars().all()

    return POOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        status=po.status,
        created_by=po.created_by,
        approved_by=po.approved_by,
        approved_at=po.approved_at,
        created_at=po.created_at,
        items=[POItemOut(
            id=i.id,
            product_id=i.product_id,
            ordered_qty=i.ordered_qty,
            unit_price=float(i.unit_price) if i.unit_price else None,
        ) for i in items],
    )
