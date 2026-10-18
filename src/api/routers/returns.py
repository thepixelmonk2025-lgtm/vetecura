import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.antitheft import Return, DamageWriteoff, WriteoffStatusEnum, ReturnConditionEnum, ReturnTypeEnum
from src.models.stock import ItemBarcode, StockLedger, ScanEvent
from src.models.inbound import Warehouse, Rack
from src.models.audit import AuditLog

router = APIRouter()

class ReturnCreate(BaseModel):
    return_type: str  # customer / supplier
    item_barcode_id: uuid.UUID
    reference_order_id: Optional[uuid.UUID] = None

class ReturnInspect(BaseModel):
    condition: str  # good / damaged / expired
    routed_to_rack_id: uuid.UUID

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(1).with_for_update()
    )
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    log = AuditLog(
        user_id=uid,
        action=action,
        entity_type="returns",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def log_return(
    body: ReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    bc = await db.get(ItemBarcode, body.item_barcode_id)
    if not bc:
        raise HTTPException(status_code=404, detail="Item barcode not found")

    bc.status = "returned_hold"
    bc.last_scanned_at = datetime.now(timezone.utc)

    ret = Return(
        return_type=body.return_type,
        reference_order_id=body.reference_order_id,
        item_barcode_id=body.item_barcode_id
    )
    db.add(ret)
    await db.commit()
    await db.refresh(ret)
    return ret

@router.post("/{return_id}/inspect")
async def inspect_return(
    return_id: uuid.UUID,
    body: ReturnInspect,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Return).where(Return.id == return_id))
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return not found")

    rack = await db.get(Rack, body.routed_to_rack_id)
    if not rack:
        raise HTTPException(status_code=422, detail="Destination rack not found")

    ret.condition = body.condition
    ret.routed_to_rack_id = body.routed_to_rack_id
    ret.inspected_by = current_user.id

    bc = await db.get(ItemBarcode, ret.item_barcode_id)
    if not bc:
        raise HTTPException(status_code=404, detail="Item barcode not found")

    # Increment stock on destination rack
    sl_res = await db.execute(
        select(StockLedger).where(
            StockLedger.product_id == bc.product_id,
            StockLedger.batch_id == bc.batch_id,
            StockLedger.rack_id == body.routed_to_rack_id
        ).with_for_update()
    )
    sl = sl_res.scalar_one_or_none()
    if sl:
        sl.quantity += 1
        sl.updated_at = datetime.now(timezone.utc)
    else:
        sl = StockLedger(
            product_id=bc.product_id,
            batch_id=bc.batch_id,
            rack_id=body.routed_to_rack_id,
            quantity=1
        )
        db.add(sl)

    # Update item barcode state
    if body.condition == "good":
        bc.status = "available"
    else:
        bc.status = "damaged_hold"
    
    bc.current_rack_id = body.routed_to_rack_id
    bc.last_scanned_at = datetime.now(timezone.utc)

    # Log scan_event return_in
    scan = ScanEvent(
        event_type="return_in",
        barcode_value=bc.barcode_value,
        item_barcode_id=bc.id,
        reference_id=ret.id,
        rack_id=body.routed_to_rack_id,
        scanned_by=current_user.id
    )
    db.add(scan)

    await _write_audit(db, current_user.id, "return_inspected", ret.id, {
        "condition": body.condition,
        "routed_to_rack_id": str(body.routed_to_rack_id)
    })
    await db.commit()
    return {"status": "inspected"}
