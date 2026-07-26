"""GRN (Goods Receipt Note) API — /api/v1/grn"""
import re
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel, field_validator
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.inbound import (
    GoodsReceipt, GRNStatusEnum,
    PurchaseOrder, PurchaseOrderItem, POStatusEnum,
    Rack,
)
from src.models.stock import Batch, ItemBarcode, StockLedger, ScanEvent
from src.models.audit import AuditLog
from src.models.product import Product
from src.core.barcode import generate_system_barcode
from src.core.notifications import NotificationService

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────

async def _next_grn_number(db: AsyncSession) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    pattern = f"GRN-{today}-%"
    result = await db.execute(
        select(GoodsReceipt.grn_number)
        .where(GoodsReceipt.grn_number.like(pattern))
        .order_by(GoodsReceipt.grn_number.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    seq = 1 if not last else int(last.split("-")[-1]) + 1
    return f"GRN-{today}-{seq:04d}"


async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type="goods_receipts",
        entity_id=entity_id,
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)


async def _get_grn_or_404(grn_id: UUID, db: AsyncSession) -> GoodsReceipt:
    result = await db.execute(select(GoodsReceipt).where(GoodsReceipt.id == grn_id))
    grn = result.scalar_one_or_none()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    return grn


async def _expected_qty(po_id: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.sum(PurchaseOrderItem.ordered_qty))
        .where(PurchaseOrderItem.purchase_order_id == po_id)
    )
    return result.scalar_one() or 0


async def _scanned_qty(grn_id: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).where(
            ScanEvent.reference_id == grn_id,
            ScanEvent.event_type == "stock_in",
        )
    )
    return result.scalar_one() or 0


# ── Schemas ────────────────────────────────────────────────────────────────

class GateEntryCreate(BaseModel):
    purchase_order_id: UUID


class GRNOut(BaseModel):
    id: UUID
    grn_number: str
    purchase_order_id: UUID
    status: str
    gate_entry_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_by: UUID
    scanned_count: int = 0
    expected_count: int = 0

    class Config:
        from_attributes = True


class ConfirmItemField(BaseModel):
    product_id: UUID
    batch_number: str
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None


class ConfirmFieldsBody(BaseModel):
    items: list[ConfirmItemField]


class ScanItemBody(BaseModel):
    barcode_value: str
    rack_id: UUID
    batch_id: UUID


class ScanItemResponse(BaseModel):
    status: str
    scan_event_id: UUID
    current_rack_count: int


class GenerateLabelResponse(BaseModel):
    barcode_value: str
    is_system_generated: bool


class CompleteGRNBody(BaseModel):
    force_close: bool = False
    reason: Optional[str] = None

    @field_validator("reason")
    @classmethod
    def reason_required_on_force(cls, v, info):
        # Validator runs per field; cross-field check done in endpoint
        return v


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/gate-entry", response_model=GRNOut, status_code=status.HTTP_201_CREATED)
async def gate_entry(
    body: GateEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    # Verify PO is approved
    result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == body.purchase_order_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    if po.status != POStatusEnum.approved:
        raise HTTPException(
            status_code=409,
            detail={"error": "po_not_approved", "message": "GRN can only be created against an approved PO"}
        )

    grn = GoodsReceipt(
        grn_number=await _next_grn_number(db),
        purchase_order_id=body.purchase_order_id,
        status=GRNStatusEnum.in_progress,
        gate_entry_at=datetime.now(timezone.utc),
        created_by=current_user.id,
    )
    db.add(grn)
    await db.flush()

    await _write_audit(db, current_user.id, "grn_gate_entry", grn.id, {
        "grn_number": grn.grn_number,
        "po_id": str(body.purchase_order_id),
    })
    await db.commit()
    await db.refresh(grn)

    expected = await _expected_qty(grn.purchase_order_id, db)
    return GRNOut(
        id=grn.id, grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id, status=grn.status,
        gate_entry_at=grn.gate_entry_at, completed_at=grn.completed_at,
        created_by=grn.created_by, scanned_count=0, expected_count=expected,
    )


@router.post("/{grn_id}/confirm-fields", response_model=GRNOut)
async def confirm_fields(
    grn_id: UUID,
    body: ConfirmFieldsBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    grn = await _get_grn_or_404(grn_id, db)
    if grn.status != GRNStatusEnum.in_progress:
        raise HTTPException(status_code=409, detail="GRN is not in progress")

    for item in body.items:
        # Validate batch fields for tracked products
        product = await db.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if product.is_batch_tracked and not item.expiry_date:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "validation_error",
                    "message": f"Product '{product.name}' is batch-tracked — expiry_date is required"
                }
            )

        # Create Batch row
        batch = Batch(
            product_id=item.product_id,
            batch_number=item.batch_number,
            mfg_date=item.mfg_date,
            expiry_date=item.expiry_date,
            received_via_grn=grn_id,
        )
        db.add(batch)
        await db.flush()

        # Create ItemBarcode for manufacturer barcodes
        if product.manufacturer_barcode:
            existing_bc = await db.execute(
                select(ItemBarcode).where(ItemBarcode.barcode_value == product.manufacturer_barcode)
            )
            if not existing_bc.scalar_one_or_none():
                db.add(ItemBarcode(
                    barcode_value=product.manufacturer_barcode,
                    product_id=item.product_id,
                    batch_id=batch.id,
                    is_system_generated=False,
                ))

    grn.ocr_extracted_json = {"confirmed_items": [i.model_dump(mode="json") for i in body.items]}
    await _write_audit(db, current_user.id, "grn_fields_confirmed", grn.id, {
        "item_count": len(body.items)
    })
    await db.commit()
    await db.refresh(grn)

    scanned = await _scanned_qty(grn_id, db)
    expected = await _expected_qty(grn.purchase_order_id, db)
    return GRNOut(
        id=grn.id, grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id, status=grn.status,
        gate_entry_at=grn.gate_entry_at, completed_at=grn.completed_at,
        created_by=grn.created_by, scanned_count=scanned, expected_count=expected,
    )


@router.post("/{grn_id}/scan-item", response_model=ScanItemResponse)
async def scan_item(
    grn_id: UUID,
    body: ScanItemBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    """
    Core scan endpoint. All validations and DB writes are atomic in one transaction.
    """
    grn = await _get_grn_or_404(grn_id, db)

    # ── 1. GRN must be in_progress ─────────────────────────────────────
    if grn.status != GRNStatusEnum.in_progress:
        raise HTTPException(status_code=409, detail={
            "error": "grn_not_active",
            "message": f"GRN is '{grn.status}' — scanning not allowed"
        })

    # ── 2. Rack must exist ─────────────────────────────────────────────
    rack = await db.get(Rack, body.rack_id)
    if not rack:
        raise HTTPException(status_code=422, detail={
            "error": "validation_error", "message": "Rack not found"
        })

    # ── 3. Check for duplicate scan in this GRN session ───────────────
    dup_result = await db.execute(
        select(ScanEvent).where(
            ScanEvent.barcode_value == body.barcode_value,
            ScanEvent.reference_id == grn_id,
            ScanEvent.event_type == "stock_in",
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={
            "error": "duplicate_scan",
            "message": "This barcode was already scanned in this GRN session."
        })

    # ── 4. Resolve ItemBarcode and validate against PO ─────────────────
    bc_result = await db.execute(
        select(ItemBarcode).where(ItemBarcode.barcode_value == body.barcode_value)
    )
    item_barcode = bc_result.scalar_one_or_none()

    if not item_barcode:
        raise HTTPException(status_code=422, detail={
            "error": "barcode_not_found",
            "message": "Barcode does not match any expected item on this GRN."
        })

    # Validate the product belongs to this GRN's PO
    po_item_result = await db.execute(
        select(PurchaseOrderItem).where(
            PurchaseOrderItem.purchase_order_id == grn.purchase_order_id,
            PurchaseOrderItem.product_id == item_barcode.product_id,
        )
    )
    if not po_item_result.scalar_one_or_none():
        raise HTTPException(status_code=422, detail={
            "error": "barcode_not_found",
            "message": "Barcode does not match any expected item on this GRN."
        })

    # ── 5. Atomic write: scan_event + stock_ledger upsert + audit ──────
    scan_event = ScanEvent(
        event_type="stock_in",
        barcode_value=body.barcode_value,
        item_barcode_id=item_barcode.id,
        reference_id=grn_id,
        rack_id=body.rack_id,
        scanned_by=current_user.id,
        scanned_at=datetime.now(timezone.utc),
    )
    db.add(scan_event)
    await db.flush()  # get scan_event.id

    # Upsert stock_ledger
    existing_sl = await db.execute(
        select(StockLedger).where(
            StockLedger.product_id == item_barcode.product_id,
            StockLedger.batch_id == body.batch_id,
            StockLedger.rack_id == body.rack_id,
        )
    )
    sl = existing_sl.scalar_one_or_none()
    if sl:
        sl.quantity += 1
        sl.updated_at = datetime.now(timezone.utc)
    else:
        sl = StockLedger(
            product_id=item_barcode.product_id,
            batch_id=body.batch_id,
            rack_id=body.rack_id,
            quantity=1,
        )
        db.add(sl)

    await db.flush()

    # Write audit log
    await _write_audit(db, current_user.id, "stock_in_scan", scan_event.id, {
        "barcode_value": body.barcode_value,
        "rack_id": str(body.rack_id),
        "grn_id": str(grn_id),
        "product_id": str(item_barcode.product_id),
        "batch_id": str(body.batch_id),
    })

    # Get current rack count for response
    rack_count_result = await db.execute(
        select(func.sum(StockLedger.quantity)).where(StockLedger.rack_id == body.rack_id)
    )
    current_rack_count = rack_count_result.scalar_one() or 1

    await db.commit()

    return ScanItemResponse(
        status="accepted",
        scan_event_id=scan_event.id,
        current_rack_count=current_rack_count,
    )


@router.post("/{grn_id}/generate-label", response_model=GenerateLabelResponse)
async def generate_label(
    grn_id: UUID,
    product_id: UUID,
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    grn = await _get_grn_or_404(grn_id, db)
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    barcode_value = await generate_system_barcode(product.sku, db)

    item_bc = ItemBarcode(
        barcode_value=barcode_value,
        product_id=product_id,
        batch_id=batch_id,
        is_system_generated=True,
        printed_at=datetime.now(timezone.utc),
    )
    db.add(item_bc)
    await db.flush()

    await _write_audit(db, current_user.id, "internal_barcode_generated", item_bc.id, {
        "barcode_value": barcode_value,
        "product_id": str(product_id),
        "grn_id": str(grn_id),
    })
    await db.commit()

    return GenerateLabelResponse(barcode_value=barcode_value, is_system_generated=True)


@router.post("/{grn_id}/complete", response_model=GRNOut)
async def complete_grn(
    grn_id: UUID,
    body: CompleteGRNBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    grn = await _get_grn_or_404(grn_id, db)
    if grn.status == GRNStatusEnum.completed:
        raise HTTPException(status_code=409, detail="GRN is already completed")

    expected = await _expected_qty(grn.purchase_order_id, db)
    scanned = await _scanned_qty(grn_id, db)

    if scanned == expected:
        # Perfect match — complete normally
        grn.status = GRNStatusEnum.completed
        grn.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "grn_completed", grn.id, {
            "scanned": scanned, "expected": expected
        })
        await NotificationService.enqueue(
            db, "stock_in",
            f"GRN {grn.grn_number} completed: {scanned}/{expected} units received.",
            "goods_receipts", grn.id,
        )
    else:
        # Mismatch
        if not body.force_close:
            raise HTTPException(status_code=409, detail={
                "error": "count_mismatch",
                "message": "Scanned quantity does not match expected quantity.",
                "details": {
                    "expected": expected,
                    "scanned": scanned,
                    "discrepancy": scanned - expected,
                }
            })

        # Force close — Manager must provide reason
        if not body.reason or len(body.reason.strip()) < 20:
            raise HTTPException(status_code=422, detail={
                "error": "validation_error",
                "message": "force_close requires a reason of at least 20 characters"
            })

        grn.status = GRNStatusEnum.completed
        grn.completed_at = datetime.now(timezone.utc)
        await _write_audit(db, current_user.id, "grn_force_closed", grn.id, {
            "reason": body.reason,
            "expected": expected,
            "scanned": scanned,
            "discrepancy": scanned - expected,
        })
        # Alert both stock_in AND security_audit topics
        msg = f"GRN {grn.grn_number} force-closed with discrepancy: {scanned}/{expected} units. Reason: {body.reason}"
        await NotificationService.enqueue(db, "stock_in", msg, "goods_receipts", grn.id)
        await NotificationService.enqueue(db, "security_audit", msg, "goods_receipts", grn.id)

    await db.commit()
    await db.refresh(grn)

    return GRNOut(
        id=grn.id, grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id, status=grn.status,
        gate_entry_at=grn.gate_entry_at, completed_at=grn.completed_at,
        created_by=grn.created_by, scanned_count=scanned, expected_count=expected,
    )


@router.get("/{grn_id}", response_model=GRNOut)
async def get_grn(
    grn_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    grn = await _get_grn_or_404(grn_id, db)
    scanned = await _scanned_qty(grn_id, db)
    expected = await _expected_qty(grn.purchase_order_id, db)

    return GRNOut(
        id=grn.id, grn_number=grn.grn_number,
        purchase_order_id=grn.purchase_order_id, status=grn.status,
        gate_entry_at=grn.gate_entry_at, completed_at=grn.completed_at,
        created_by=grn.created_by, scanned_count=scanned, expected_count=expected,
    )
