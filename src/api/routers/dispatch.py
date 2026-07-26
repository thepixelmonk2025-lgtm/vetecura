import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.dispatch import (
    SalesOrder, SalesOrderItem, PickList, Dispatch,
    SalesOrderStatusEnum, PickListStatusEnum, DispatchStatusEnum
)
from src.models.stock import StockLedger, Batch, ItemBarcode, ScanEvent
from src.models.inbound import Rack
from src.models.audit import AuditLog
from src.core.notifications import NotificationService

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class SOItemCreate(BaseModel):
    product_id: uuid.UUID
    ordered_qty: int

class SOCreate(BaseModel):
    order_reference: str
    customer_name: Optional[str] = None
    items: List[SOItemCreate]

class SOItemOut(BaseModel):
    product_id: uuid.UUID
    ordered_qty: int

class SOOut(BaseModel):
    id: uuid.UUID
    order_reference: str
    customer_name: Optional[str]
    status: str
    created_at: datetime
    items: List[SOItemOut] = []

    class Config:
        from_attributes = True

class PickListOut(BaseModel):
    id: uuid.UUID
    sales_order_id: uuid.UUID
    assigned_to: uuid.UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DispatchOut(BaseModel):
    id: uuid.UUID
    sales_order_id: uuid.UUID
    pick_list_id: uuid.UUID
    dispatched_by: uuid.UUID
    scanned_count: int
    expected_count: int
    status: str
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class ScanItemBody(BaseModel):
    barcode_value: str
    rack_id: uuid.UUID
    batch_id: uuid.UUID

class CompleteDispatchBody(BaseModel):
    force_close: bool = False
    reason: Optional[str] = None

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type="dispatches",
        entity_id=entity_id,
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/sales-orders", response_model=SOOut, status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    body: SOCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    so = SalesOrder(
        order_reference=body.order_reference,
        customer_name=body.customer_name,
        status=SalesOrderStatusEnum.pending
    )
    db.add(so)
    await db.flush()

    items_out = []
    for item in body.items:
        so_item = SalesOrderItem(
            sales_order_id=so.id,
            product_id=item.product_id,
            ordered_qty=item.ordered_qty
        )
        db.add(so_item)
        items_out.append(SOItemOut(product_id=item.product_id, ordered_qty=item.ordered_qty))

    await db.commit()
    await db.refresh(so)

    return SOOut(
        id=so.id,
        order_reference=so.order_reference,
        customer_name=so.customer_name,
        status=so.status,
        created_at=so.created_at,
        items=items_out
    )

@router.post("/pick-lists/{sales_order_id}/generate", response_model=PickListOut)
async def generate_pick_list_endpoint(
    sales_order_id: uuid.UUID,
    assigned_to: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    from src.core.pick_list import generate_pick_list
    try:
        pick_list = await generate_pick_list(sales_order_id, assigned_to, db)
        await db.commit()
        await db.refresh(pick_list)
        return pick_list
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/pick-lists/{id}", response_model=PickListOut)
async def get_pick_list(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(PickList).where(PickList.id == id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Pick List not found")
    return pl

@router.post("/dispatches/{dispatch_id}/scan-item", response_model=DispatchOut)
async def dispatch_scan_item(
    dispatch_id: uuid.UUID,
    body: ScanItemBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Dispatch).where(Dispatch.id == dispatch_id))
    disp = result.scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    if disp.status != DispatchStatusEnum.in_progress:
        raise HTTPException(status_code=409, detail="Dispatch is not active")

    # Duplicate scan check in this dispatch
    dup_result = await db.execute(
        select(ScanEvent).where(
            ScanEvent.barcode_value == body.barcode_value,
            ScanEvent.reference_id == dispatch_id,
            ScanEvent.event_type == "stock_out"
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"error": "duplicate_scan", "message": "This barcode was already scanned."})

    # Validate barcode exists
    bc_res = await db.execute(select(ItemBarcode).where(ItemBarcode.barcode_value == body.barcode_value))
    bc = bc_res.scalar_one_or_none()
    if not bc:
        raise HTTPException(status_code=422, detail={"error": "barcode_not_found", "message": "Barcode not recognized."})

    # Validate product is on order
    item_res = await db.execute(
        select(SalesOrderItem).where(
            SalesOrderItem.sales_order_id == disp.sales_order_id,
            SalesOrderItem.product_id == bc.product_id
        )
    )
    if not item_res.scalar_one_or_none():
        raise HTTPException(status_code=422, detail={"error": "barcode_not_found", "message": "Product not on this order."})

    # Write scan_event
    scan_event = ScanEvent(
        event_type="stock_out",
        barcode_value=body.barcode_value,
        item_barcode_id=bc.id,
        reference_id=dispatch_id,
        rack_id=body.rack_id,
        scanned_by=current_user.id
    )
    db.add(scan_event)

    disp.scanned_count += 1
    await db.commit()
    await db.refresh(disp)
    return disp

@router.get("/dispatches/{id}/status", response_model=DispatchOut)
async def get_dispatch_status(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Dispatch).where(Dispatch.id == id))
    disp = result.scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return disp

@router.post("/dispatches/{id}/complete", response_model=DispatchOut)
async def complete_dispatch(
    id: uuid.UUID,
    body: CompleteDispatchBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Dispatch).where(Dispatch.id == id))
    disp = result.scalar_one_or_none()
    if not disp:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    if disp.scanned_count != disp.expected_count:
        if not body.force_close:
            raise HTTPException(status_code=409, detail={"error": "count_mismatch", "message": "Scanned count mismatch."})

        # Check role for force-close
        if current_user.role not in [RoleEnum.warehouse_manager, RoleEnum.owner]:
            raise HTTPException(status_code=403, detail="Staff cannot force-close dispatches.")

        if not body.reason or len(body.reason.strip()) < 20:
            raise HTTPException(status_code=422, detail="Reason of at least 20 chars required for force close.")

        disp.status = DispatchStatusEnum.completed
        disp.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "dispatch_force_closed", disp.id, {"reason": body.reason})
        await NotificationService.enqueue(db, "security_audit", f"Dispatch {disp.id} force-closed. Reason: {body.reason}")
    else:
        disp.status = DispatchStatusEnum.completed
        disp.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "dispatch_completed", disp.id, {})
        await NotificationService.enqueue(db, "stock_out", f"Dispatch {disp.id} completed successfully.")

    # Deduct stock on completion
    scans_result = await db.execute(
        select(ScanEvent).where(
            ScanEvent.reference_id == id,
            ScanEvent.event_type == "stock_out"
        )
    )
    scans = scans_result.scalars().all()
    for scan in scans:
        bc_res = await db.get(ItemBarcode, scan.item_barcode_id)
        if bc_res:
            sl_res = await db.execute(
                select(StockLedger).where(
                    StockLedger.product_id == bc_res.product_id,
                    StockLedger.batch_id == bc_res.batch_id,
                    StockLedger.rack_id == scan.rack_id
                )
            )
            sl = sl_res.scalar_one_or_none()
            if sl:
                sl.quantity = max(0, sl.quantity - 1)

    await db.commit()
    await db.refresh(disp)
    return disp
