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
from src.models.product import Product
from src.models.audit import AuditLog

router = APIRouter()

class WriteoffCreate(BaseModel):
    item_barcode_id: Optional[uuid.UUID] = None
    product_id: Optional[uuid.UUID] = None
    reason: str
    photo_proof_url: Optional[str] = None
    photo_url: Optional[str] = None
    qty_to_remove: Optional[int] = 1

class WriteoffApproveBody(BaseModel):
    notes: Optional[str] = None

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
        entity_type="damage_writeoffs",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=None)
async def list_writeoffs(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    query = select(DamageWriteoff)
    if status:
        query = query.where(DamageWriteoff.status == status)
    query = query.order_by(DamageWriteoff.created_at.desc())
    result = await db.execute(query)
    writeoffs = result.scalars().all()

    items = []
    for wo in writeoffs:
        bc = await db.get(ItemBarcode, wo.item_barcode_id) if wo.item_barcode_id else None
        prod_name = "Damaged Product"
        barcode_val = "VET-ITEM"
        if bc:
            barcode_val = bc.barcode_value
            if bc.product_id:
                prod = await db.get(Product, bc.product_id)
                if prod:
                    prod_name = prod.name

        req_email = "staff@vetecura.com"
        if wo.requested_by:
            req_user = await db.get(User, wo.requested_by)
            if req_user and req_user.email:
                req_email = req_user.email

        items.append({
            "id": str(wo.id),
            "item": f"{prod_name} ({barcode_val})",
            "reason": wo.reason,
            "photo_url": wo.photo_proof_url,
            "requested_by": req_email,
            "status": wo.status,
            "created_at": wo.created_at.isoformat() if wo.created_at else None,
        })
    return items

@router.post("", response_model=None, status_code=status.HTTP_201_CREATED)
async def request_writeoff(
    body: WriteoffCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    photo_url = body.photo_proof_url or body.photo_url or ""
    if not photo_url or photo_url.strip() == "":
        raise HTTPException(status_code=422, detail="photo_proof_url is required")

    target_barcode = None
    if body.item_barcode_id:
        target_barcode = await db.get(ItemBarcode, body.item_barcode_id)
    elif body.product_id:
        bc_res = await db.execute(
            select(ItemBarcode).where(
                ItemBarcode.product_id == body.product_id,
                ItemBarcode.status == "available"
            ).limit(1)
        )
        target_barcode = bc_res.scalar_one_or_none()

    if not target_barcode and body.item_barcode_id:
        raise HTTPException(status_code=404, detail="Item barcode not found")

    if not target_barcode:
        target_barcode = ItemBarcode(
            barcode_value=f"VET-DMG-{uuid.uuid4().hex[:6].upper()}",
            product_id=body.product_id or uuid.uuid4(),
            status="damaged_hold"
        )
        db.add(target_barcode)
        await db.flush()

    if target_barcode.status != "available" and target_barcode.status != "damaged_hold":
        raise HTTPException(
            status_code=409,
            detail={"error": "invalid_item_status", "message": f"Item cannot be written off because current status is '{target_barcode.status}'."}
        )

    target_barcode.status = "damaged_hold"
    target_barcode.last_scanned_at = datetime.now(timezone.utc)

    writeoff = DamageWriteoff(
        item_barcode_id=target_barcode.id,
        reason=body.reason,
        photo_proof_url=photo_url,
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
        # 1. Decrement source rack StockLedger
        if bc.current_rack_id:
            sl_src_res = await db.execute(
                select(StockLedger).where(
                    StockLedger.product_id == bc.product_id,
                    StockLedger.batch_id == bc.batch_id,
                    StockLedger.rack_id == bc.current_rack_id
                ).with_for_update()
            )
            sl_src = sl_src_res.scalar_one_or_none()
            if sl_src and sl_src.quantity > 0:
                sl_src.quantity -= 1
                sl_src.updated_at = datetime.now(timezone.utc)

        # 2. Find damage warehouse & rack
        wh_res = await db.execute(select(Warehouse).where(Warehouse.is_damage_warehouse == True).limit(1))
        dmg_wh = wh_res.scalar_one_or_none()
        if not dmg_wh:
            raise HTTPException(status_code=500, detail="Damage Warehouse not configured.")

        rack_res = await db.execute(select(Rack).where(Rack.warehouse_id == dmg_wh.id).limit(1))
        dmg_rack = rack_res.scalar_one_or_none()
        if not dmg_rack:
            raise HTTPException(status_code=500, detail="Damage Warehouse has no racks.")

        # 3. Find or create StockLedger for damage rack
        sl_dmg_res = await db.execute(
            select(StockLedger).where(
                StockLedger.product_id == bc.product_id,
                StockLedger.batch_id == bc.batch_id,
                StockLedger.rack_id == dmg_rack.id
            ).with_for_update()
        )
        sl_dmg = sl_dmg_res.scalar_one_or_none()
        if sl_dmg:
            sl_dmg.quantity += 1
            sl_dmg.updated_at = datetime.now(timezone.utc)
        else:
            sl_dmg = StockLedger(
                product_id=bc.product_id,
                batch_id=bc.batch_id,
                rack_id=dmg_rack.id,
                quantity=1
            )
            db.add(sl_dmg)

        # 4. Update barcode location and status
        bc.status = "damaged_hold"
        bc.current_rack_id = dmg_rack.id
        bc.last_scanned_at = datetime.now(timezone.utc)

        # 5. Log scan event
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

    # Restore item barcode status to available
    bc = await db.get(ItemBarcode, wo.item_barcode_id)
    if bc and bc.status == "damaged_hold":
        bc.status = "available"
        bc.last_scanned_at = datetime.now(timezone.utc)

    await _write_audit(db, current_user.id, "writeoff_rejected", wo.id, {})
    await db.commit()
    return {"status": "rejected"}
