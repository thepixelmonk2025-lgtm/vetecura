import uuid
from typing import Optional, List
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.antitheft import CycleCount, CycleCountVariance, CycleCountStatusEnum
from src.models.stock import StockLedger, ScanEvent, ItemBarcode
from src.models.audit import AuditLog

router = APIRouter()

class CycleCountCreate(BaseModel):
    rack_id: uuid.UUID
    scheduled_date: Optional[date] = None

class ScanItemBody(BaseModel):
    barcode_value: str

class VarianceOut(BaseModel):
    product_id: uuid.UUID
    batch_id: uuid.UUID
    system_qty: int
    counted_qty: int
    variance: int

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type="cycle_counts",
        entity_id=entity_id,
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def schedule_cycle_count(
    body: CycleCountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    cc = CycleCount(
        rack_id=body.rack_id,
        scheduled_date=body.scheduled_date or datetime.now(timezone.utc).date(),
        status=CycleCountStatusEnum.scheduled
    )
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    return cc

@router.post("/{cc_id}/scan-item")
async def cycle_count_scan(
    cc_id: uuid.UUID,
    body: ScanItemBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(CycleCount).where(CycleCount.id == cc_id))
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle Count not found")

    if cc.status == CycleCountStatusEnum.scheduled:
        cc.status = CycleCountStatusEnum.in_progress
        cc.performed_by = current_user.id

    bc_res = await db.execute(select(ItemBarcode).where(ItemBarcode.barcode_value == body.barcode_value))
    bc = bc_res.scalar_one_or_none()
    if not bc:
        raise HTTPException(status_code=422, detail="Barcode not recognized")

    scan = ScanEvent(
        event_type="cycle_count",
        barcode_value=body.barcode_value,
        item_barcode_id=bc.id,
        reference_id=cc_id,
        rack_id=cc.rack_id,
        scanned_by=current_user.id
    )
    db.add(scan)
    await db.commit()
    return {"status": "accepted"}

@router.post("/{cc_id}/complete")
async def complete_cycle_count(
    cc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(CycleCount).where(CycleCount.id == cc_id))
    cc = result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Cycle Count not found")

    cc.status = CycleCountStatusEnum.completed
    cc.completed_at = datetime.now(timezone.utc)

    # 1. Fetch system quantities on this rack
    ledger_res = await db.execute(
        select(StockLedger).where(StockLedger.rack_id == cc.rack_id)
    )
    ledger_items = ledger_res.scalars().all()
    ledger_map = {(sl.product_id, sl.batch_id): sl.quantity for sl in ledger_items}

    # 2. Fetch scanned quantities for this cycle count
    scanned_res = await db.execute(
        select(
            ItemBarcode.product_id,
            ItemBarcode.batch_id,
            func.count(ScanEvent.id).label("cnt")
        )
        .join(ItemBarcode, ScanEvent.item_barcode_id == ItemBarcode.id)
        .where(ScanEvent.reference_id == cc_id)
        .group_by(ItemBarcode.product_id, ItemBarcode.batch_id)
    )
    scanned_items = scanned_res.fetchall()
    scanned_map = {(row.product_id, row.batch_id): row.cnt for row in scanned_items}

    # Gather all product+batch keys
    all_keys = set(ledger_map.keys()) | set(scanned_map.keys())

    variances = []
    for (pid, bid) in all_keys:
        sys_qty = ledger_map.get((pid, bid), 0)
        cnt_qty = scanned_map.get((pid, bid), 0)
        variance = cnt_qty - sys_qty

        if variance != 0:
            var_record = CycleCountVariance(
                cycle_count_id=cc_id,
                product_id=pid,
                batch_id=bid,
                system_qty=sys_qty,
                counted_qty=cnt_qty
            )
            db.add(var_record)
            variances.append(VarianceOut(
                product_id=pid,
                batch_id=bid,
                system_qty=sys_qty,
                counted_qty=cnt_qty,
                variance=variance
            ))

    await db.commit()
    return {"status": "completed", "variances": variances}

@router.post("/{cc_id}/confirm-variance")
async def confirm_variance(
    cc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    # Fetch variances
    var_res = await db.execute(
        select(CycleCountVariance).where(CycleCountVariance.cycle_count_id == cc_id)
    )
    variances = var_res.scalars().all()

    cc_res = await db.execute(select(CycleCount).where(CycleCount.id == cc_id))
    cc = cc_res.scalar_one_or_none()

    for var in variances:
        # Update stock ledger
        sl_res = await db.execute(
            select(StockLedger).where(
                StockLedger.product_id == var.product_id,
                StockLedger.batch_id == var.batch_id,
                StockLedger.rack_id == cc.rack_id
            )
        )
        sl = sl_res.scalar_one_or_none()
        if sl:
            sl.quantity = var.counted_qty
        else:
            sl = StockLedger(
                product_id=var.product_id,
                batch_id=var.batch_id,
                rack_id=cc.rack_id,
                quantity=var.counted_qty
            )
            db.add(sl)

    # Log manual stock adjustment in audit log
    await _write_audit(
        db,
        current_user.id,
        "manual_stock_adjustment",
        cc_id,
        {"justification": f"cycle_count_{cc_id}"}
    )
    await db.commit()
    return {"status": "adjusted"}
