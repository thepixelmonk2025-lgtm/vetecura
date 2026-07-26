import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.antitheft import DamageWriteoff, WriteoffStatusEnum
from src.models.stock import ItemBarcode, StockLedger, ScanEvent
from src.models.inbound import Warehouse, Rack
from src.models.audit import AuditLog

router = APIRouter()

class WriteoffCreate(BaseModel):
    item_barcode_id: uuid.UUID
    reason: str
    photo_proof_url: str

class WriteoffApproveBody(BaseModel):
    notes: Optional[str] = None

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type="damage_writeoffs",
        entity_id=entity_id,
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def request_writeoff(
    body: WriteoffCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    if not body.photo_proof_url or body.photo_proof_url.strip() == "":
        raise HTTPException(status_code=422, detail="photo_proof_url is required")

    writeoff = DamageWriteoff(
        item_barcode_id=body.item_barcode_id,
        reason=body.reason,
        photo_proof_url=body.photo_proof_url,
        requested_by=current_user.id,
        status=WriteoffStatusEnum.pending
    )
    db.add(writeoff)
    await db.commit()
    await db.refresh(writeoff)
    return writeoff

@router.post("/{writeoff_id}/approve")
async def approve_writeoff(
    writeoff_id: uuid.UUID,
    body: WriteoffApproveBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(DamageWriteoff).where(DamageWriteoff.id == writeoff_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Write-off request not found")

    if wo.status != WriteoffStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Write-off is not pending approval")

    wo.status = WriteoffStatusEnum.approved
    wo.approved_by = current_user.id
    wo.resolved_at = datetime.now(timezone.utc)

    # Move stock to Damage Warehouse
    bc = await db.get(ItemBarcode, wo.item_barcode_id)
    if bc:
        # Find damage warehouse
        wh_res = await db.execute(select(Warehouse).where(Warehouse.is_damage_warehouse == True).limit(1))
        dmg_wh = wh_res.scalar_one_or_none()
        if not dmg_wh:
            raise HTTPException(status_code=500, detail="Damage Warehouse not configured.")

        rack_res = await db.execute(select(Rack).where(Rack.warehouse_id == dmg_wh.id).limit(1))
        dmg_rack = rack_res.scalar_one_or_none()
        if not dmg_rack:
            raise HTTPException(status_code=500, detail="Damage Warehouse has no racks.")

        # Find or create StockLedger for damage rack
        sl_dmg_res = await db.execute(
            select(StockLedger).where(
                StockLedger.product_id == bc.product_id,
                StockLedger.batch_id == bc.batch_id,
                StockLedger.rack_id == dmg_rack.id
            )
        )
        sl_dmg = sl_dmg_res.scalar_one_or_none()
        if sl_dmg:
            sl_dmg.quantity += 1
        else:
            sl_dmg = StockLedger(
                product_id=bc.product_id,
                batch_id=bc.batch_id,
                rack_id=dmg_rack.id,
                quantity=1
            )
            db.add(sl_dmg)

        # Log scan event
        scan = ScanEvent(
            event_type="writeoff_out",
            barcode_value=bc.barcode_value,
            item_barcode_id=bc.id,
            reference_id=wo.id,
            rack_id=dmg_rack.id,
            scanned_by=current_user.id
        )
        db.add(scan)

    await _write_audit(db, current_user.id, "writeoff_approved", wo.id, {"notes": body.notes})
    await db.commit()
    return {"status": "approved"}

@router.post("/{writeoff_id}/reject")
async def reject_writeoff(
    writeoff_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(DamageWriteoff).where(DamageWriteoff.id == writeoff_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Write-off request not found")

    if wo.status != WriteoffStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Write-off is not pending approval")

    wo.status = WriteoffStatusEnum.rejected
    wo.resolved_at = datetime.now(timezone.utc)

    await _write_audit(db, current_user.id, "writeoff_rejected", wo.id, {})
    await db.commit()
    return {"status": "rejected"}
