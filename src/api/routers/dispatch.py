import uuid
from typing import Optional, List, Union
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
    rack_id: Optional[uuid.UUID] = None
    batch_id: Optional[uuid.UUID] = None

class CompleteDispatchBody(BaseModel):
    scanned_count: Optional[int] = None
    total_expected: Optional[int] = None
    force_close: bool = False
    reason: Optional[str] = None

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(1).with_for_update()
    )
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    now = datetime.now(timezone.utc)
    log = AuditLog(
        user_id=uid,
        action=action,
        entity_type="dispatches",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
        timestamp=now,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)


async def _get_dispatch_or_create(
    reference_id: Union[uuid.UUID, str],
    db: AsyncSession,
    current_user: User
) -> Dispatch:
    """
    Finds or creates a Dispatch session by Dispatch ID, SalesOrder ID,
    or SalesOrder order_reference (e.g. 'SO-40753').
    """
    disp = None
    parsed_uuid = None
    try:
        parsed_uuid = reference_id if isinstance(reference_id, uuid.UUID) else uuid.UUID(str(reference_id))
        result = await db.execute(select(Dispatch).where(Dispatch.id == parsed_uuid))
        disp = result.scalar_one_or_none()
    except (ValueError, AttributeError):
        pass

    if disp:
        return disp

    # Find SalesOrder by UUID or order_reference
    so = None
    if parsed_uuid:
        so_res = await db.execute(select(SalesOrder).where(SalesOrder.id == parsed_uuid))
        so = so_res.scalar_one_or_none()

    if not so:
        clean_str = str(reference_id).strip()
        so_res = await db.execute(select(SalesOrder).where(SalesOrder.order_reference == clean_str))
        so = so_res.scalar_one_or_none()

    if not so:
        clean_norm = str(reference_id).replace("-", "").strip().upper()
        all_sos = (await db.execute(select(SalesOrder))).scalars().all()
        for s in all_sos:
            if s.order_reference.replace("-", "").strip().upper() == clean_norm:
                so = s
                break

    if not so:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": f"Sales Order or Dispatch '{reference_id}' not found."}
        )

    # Look for existing active Dispatch for this Sales Order
    disp_res = await db.execute(
        select(Dispatch)
        .where(Dispatch.sales_order_id == so.id)
        .order_by(Dispatch.created_at.desc(), Dispatch.id.desc())
    )
    existing_disp = disp_res.scalars().first()

    if existing_disp and existing_disp.status == DispatchStatusEnum.in_progress:
        return existing_disp

    # If completed dispatch already exists and no new dispatch requested
    if existing_disp and existing_disp.status == DispatchStatusEnum.completed:
        return existing_disp

    # Ensure a PickList exists
    pl_res = await db.execute(
        select(PickList).where(PickList.sales_order_id == so.id).order_by(PickList.created_at.desc())
    )
    pl = pl_res.scalars().first()
    if not pl:
        pl = PickList(
            sales_order_id=so.id,
            assigned_to=current_user.id,
            status=PickListStatusEnum.in_progress
        )
        db.add(pl)
        await db.flush()

    # Calculate expected units from SalesOrderItem
    items_res = await db.execute(select(SalesOrderItem).where(SalesOrderItem.sales_order_id == so.id))
    so_items = items_res.scalars().all()
    expected_qty = sum(it.ordered_qty for it in so_items) if so_items else 0

    new_disp = Dispatch(
        sales_order_id=so.id,
        pick_list_id=pl.id,
        dispatched_by=current_user.id,
        scanned_count=0,
        expected_count=expected_qty,
        status=DispatchStatusEnum.in_progress
    )
    db.add(new_disp)
    so.status = SalesOrderStatusEnum.picking
    await db.flush()
    return new_disp


async def _dispatch_scan_item_logic(
    reference_id: Union[uuid.UUID, str],
    body: ScanItemBody,
    db: AsyncSession,
    current_user: User,
) -> Dispatch:
    disp = await _get_dispatch_or_create(reference_id, db, current_user)

    if disp.status != DispatchStatusEnum.in_progress:
        raise HTTPException(
            status_code=409,
            detail={"error": "dispatch_not_active", "message": f"Dispatch session status is '{disp.status}' and cannot accept scans."}
        )

    clean_barcode = body.barcode_value.strip()

    # 1. Strict Over-scan Limit: Zero Tolerance
    if disp.expected_count > 0 and disp.scanned_count >= disp.expected_count:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "order_full",
                "message": f"Target reached: All {disp.expected_count} units for this Sales Order have already been verified!"
            }
        )

    # 2. Duplicate scan check within this dispatch session
    dup_result = await db.execute(
        select(ScanEvent).where(
            ScanEvent.barcode_value == clean_barcode,
            ScanEvent.reference_id == disp.id,
            ScanEvent.event_type == "stock_out"
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": "duplicate_scan", "message": f"Barcode '{clean_barcode}' was already scanned in this dispatch session."}
        )

    # 3. Barcode must exist in warehouse inventory (ItemBarcode table)
    bc_res = await db.execute(
        select(ItemBarcode).where(ItemBarcode.barcode_value == clean_barcode)
    )
    bc = bc_res.scalar_one_or_none()
    if not bc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "barcode_not_found",
                "message": f"Invalid barcode '{clean_barcode}': Barcode does not exist in warehouse inventory."
            }
        )

    # 4. Item status checks
    if bc.status == "dispatched":
        raise HTTPException(
            status_code=409,
            detail={"error": "item_already_dispatched", "message": f"Barcode '{clean_barcode}' has already been dispatched from warehouse."}
        )
    if bc.status != "available":
        raise HTTPException(
            status_code=409,
            detail={"error": "item_not_available", "message": f"Item cannot be dispatched: current status is '{bc.status}' (must be 'available')."}
        )

    # 5. Validate that product belongs to this Sales Order
    item_res = await db.execute(
        select(SalesOrderItem).where(
            SalesOrderItem.sales_order_id == disp.sales_order_id,
            SalesOrderItem.product_id == bc.product_id
        )
    )
    so_item = item_res.scalar_one_or_none()
    if not so_item:
        raise HTTPException(
            status_code=422,
            detail={"error": "product_not_on_order", "message": "Scanned product does not belong to this Sales Order."}
        )

    # 6. Validate that line item quota has not been exceeded
    prod_scanned_res = await db.execute(
        select(func.count(ScanEvent.id))
        .join(ItemBarcode, ScanEvent.item_barcode_id == ItemBarcode.id)
        .where(
            ScanEvent.reference_id == disp.id,
            ScanEvent.event_type == "stock_out",
            ItemBarcode.product_id == bc.product_id
        )
    )
    prod_scanned_count = prod_scanned_res.scalar() or 0
    if prod_scanned_count >= so_item.ordered_qty:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "product_quota_reached",
                "message": f"Product quota reached: All {so_item.ordered_qty} units of this product already scanned."
            }
        )

    # 7. Physical rack assignment
    effective_rack_id = body.rack_id or bc.current_rack_id
    if not effective_rack_id:
        rack_res = await db.execute(select(Rack).limit(1))
        rack_obj = rack_res.scalar_one_or_none()
        if rack_obj:
            effective_rack_id = rack_obj.id

    # 8. Mark barcode reserved for this dispatch
    bc.status = "reserved_pick"
    bc.last_scanned_at = datetime.now(timezone.utc)

    # 9. Record ScanEvent
    scan_event = ScanEvent(
        event_type="stock_out",
        barcode_value=clean_barcode,
        item_barcode_id=bc.id,
        reference_id=disp.id,
        rack_id=effective_rack_id,
        scanned_by=current_user.id
    )
    db.add(scan_event)

    disp.scanned_count += 1
    await db.commit()
    await db.refresh(disp)
    return disp


async def _dispatch_complete_logic(
    reference_id: Union[uuid.UUID, str],
    body: CompleteDispatchBody,
    db: AsyncSession,
    current_user: User,
) -> Dispatch:
    disp = await _get_dispatch_or_create(reference_id, db, current_user)

    if disp.scanned_count != disp.expected_count:
        if not body.force_close:
            raise HTTPException(
                status_code=409,
                detail={"error": "count_mismatch", "message": f"Scanned count mismatch: {disp.scanned_count} scanned of {disp.expected_count} expected."}
            )

        if current_user.role not in [RoleEnum.warehouse_manager, RoleEnum.owner]:
            raise HTTPException(status_code=403, detail="Staff cannot force-close dispatches.")

        if not body.reason or len(body.reason.strip()) < 10:
            raise HTTPException(status_code=422, detail="Reason of at least 10 chars required for force close.")

        disp.status = DispatchStatusEnum.completed
        disp.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "dispatch_force_closed", disp.id, {"reason": body.reason})
        await NotificationService.enqueue(db, "security_audit", f"Dispatch {disp.id} force-closed. Reason: {body.reason}")
    else:
        disp.status = DispatchStatusEnum.completed
        disp.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "dispatch_completed", disp.id, {})
        await NotificationService.enqueue(db, "stock_out", f"Dispatch {disp.id} completed successfully.")

    # Update parent SalesOrder status to dispatched
    so_res = await db.execute(select(SalesOrder).where(SalesOrder.id == disp.sales_order_id))
    so = so_res.scalar_one_or_none()
    if so:
        so.status = SalesOrderStatusEnum.dispatched

    # Atomic stock deduction for all items verified in this dispatch
    scans_result = await db.execute(
        select(ScanEvent).where(
            ScanEvent.reference_id == disp.id,
            ScanEvent.event_type == "stock_out"
        )
    )
    scans = scans_result.scalars().all()
    for scan in scans:
        if not scan.item_barcode_id:
            continue
        bc_res = await db.get(ItemBarcode, scan.item_barcode_id)
        if bc_res:
            # Deduct 1 from stock ledger if exists
            sl_res = await db.execute(
                select(StockLedger).where(
                    StockLedger.product_id == bc_res.product_id,
                    StockLedger.batch_id == bc_res.batch_id,
                ).with_for_update()
            )
            sl = sl_res.scalar_one_or_none()
            if sl and sl.quantity > 0:
                sl.quantity -= 1
                sl.updated_at = datetime.now(timezone.utc)

            bc_res.status = "dispatched"
            bc_res.current_rack_id = None
            bc_res.last_scanned_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(disp)
    return disp


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/sales-orders", response_model=List[SOOut])
async def list_sales_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(SalesOrder).options(selectinload(SalesOrder.items)))
    sos = result.scalars().all()
    out = []
    for so in sos:
        items_out = [SOItemOut(product_id=it.product_id, ordered_qty=it.ordered_qty) for it in so.items]
        out.append(SOOut(
            id=so.id,
            order_reference=so.order_reference,
            customer_name=so.customer_name,
            status=so.status,
            created_at=so.created_at,
            items=items_out
        ))
    return out

@router.get("/dispatches", response_model=List[DispatchOut])
async def list_dispatches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Dispatch))
    return result.scalars().all()

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

@router.post("/{reference_id}/scan-item", response_model=DispatchOut)
async def scan_item_by_ref(
    reference_id: str,
    body: ScanItemBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    return await _dispatch_scan_item_logic(reference_id, body, db, current_user)

@router.post("/dispatches/{dispatch_id}/scan-item", response_model=DispatchOut)
async def dispatch_scan_item(
    dispatch_id: str,
    body: ScanItemBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    return await _dispatch_scan_item_logic(dispatch_id, body, db, current_user)

@router.post("/{reference_id}/complete", response_model=DispatchOut)
async def complete_dispatch_by_ref(
    reference_id: str,
    body: CompleteDispatchBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    return await _dispatch_complete_logic(reference_id, body, db, current_user)

@router.post("/dispatches/{id}/complete", response_model=DispatchOut)
async def complete_dispatch(
    id: str,
    body: CompleteDispatchBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    return await _dispatch_complete_logic(id, body, db, current_user)

@router.get("/{reference_id}/status", response_model=DispatchOut)
async def get_dispatch_status_by_ref(
    reference_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    disp = await _get_dispatch_or_create(reference_id, db, current_user)
    return disp

@router.get("/dispatches/{id}/status", response_model=DispatchOut)
async def get_dispatch_status(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    disp = await _get_dispatch_or_create(id, db, current_user)
    return disp

