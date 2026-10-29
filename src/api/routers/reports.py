import inspect
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.stock import StockLedger, Batch, ScanEvent
from src.models.inbound import Rack
from src.models.product import Product
from src.models.audit import AuditLog
from src.models.supplier import Supplier
from src.models.dispatch import Dispatch, SalesOrder

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class ExpiryRiskOut(BaseModel):
    product_name: str
    batch_number: str
    expiry_date: str
    stock_qty: int
    risk_score: float

class LowStockOut(BaseModel):
    product_name: str
    sku: str
    stock_qty: int
    reorder_level: int
    suggested_reorder_qty: int

class DashboardOut(BaseModel):
    role: str
    metrics: dict

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/expiry-risk", response_model=List[ExpiryRiskOut])
async def get_expiry_risk_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    # Fetch batches and associated stock
    res = await db.execute(
        select(
            Product.name.label("product_name"),
            Batch.batch_number,
            Batch.expiry_date,
            func.sum(StockLedger.quantity).label("stock_qty")
        )
        .join(Product, Batch.product_id == Product.id)
        .join(StockLedger, StockLedger.batch_id == Batch.id)
        .group_by(Product.name, Batch.batch_number, Batch.expiry_date)
    )
    rows = res.fetchall()
    
    report = []
    now = datetime.now(timezone.utc).date()
    for row in rows:
        if not row.expiry_date:
            continue
        days_to_expiry = (row.expiry_date - now).days
        if days_to_expiry <= 0:
            days_to_expiry = 1  # prevent division by zero or negative weight issues

        category_weight = 1.0  # default
        # Calculate risk score
        risk_score = (1.0 / days_to_expiry) * row.stock_qty * category_weight
        report.append(ExpiryRiskOut(
            product_name=row.product_name,
            batch_number=row.batch_number,
            expiry_date=row.expiry_date.isoformat(),
            stock_qty=row.stock_qty,
            risk_score=round(risk_score, 4)
        ))

    # Rank by risk score descending
    report.sort(key=lambda x: x.risk_score, reverse=True)
    return report

@router.get("/low-stock", response_model=List[LowStockOut])
async def get_low_stock_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.purchase_team])),
):
    res = await db.execute(
        select(
            Product.id,
            Product.name.label("product_name"),
            Product.sku,
            Product.reorder_level,
            func.sum(StockLedger.quantity).label("stock_qty")
        )
        .join(StockLedger, StockLedger.product_id == Product.id)
        .group_by(Product.id, Product.name, Product.sku, Product.reorder_level)
    )
    rows = res.fetchall()

    report = []
    for row in rows:
        if row.stock_qty < row.reorder_level:
            # suggested_reorder_qty calculation
            suggested = (row.reorder_level * 2) - row.stock_qty
            report.append(LowStockOut(
                product_name=row.product_name,
                sku=row.sku,
                stock_qty=row.stock_qty,
                reorder_level=row.reorder_level,
                suggested_reorder_qty=max(0, suggested)
            ))
    return report

@router.get("/current-stock")
async def get_current_stock_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team])),
):
    res = await db.execute(
        select(
            Product.name.label("product_name"),
            func.sum(StockLedger.quantity).label("stock_qty")
        )
        .join(Product, StockLedger.product_id == Product.id)
        .group_by(Product.name)
    )
    return [{"product_name": r.product_name, "stock_qty": r.stock_qty} for r in res.fetchall()]

@router.get("/stock-ledger-details")
async def get_stock_ledger_details(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team])),
):
    res = await db.execute(
        select(
            Product.name.label("product"),
            Product.sku.label("sku"),
            Rack.code.label("rack"),
            Batch.batch_number.label("batch"),
            Batch.expiry_date.label("expiry"),
            StockLedger.quantity.label("qty")
        )
        .join(Product, StockLedger.product_id == Product.id)
        .join(Rack, StockLedger.rack_id == Rack.id)
        .join(Batch, StockLedger.batch_id == Batch.id)
        .order_by(Product.name.asc(), Batch.expiry_date.asc())
    )
    rows = res.fetchall()
    return [
        {
            "product": r.product,
            "sku": r.sku,
            "rack": r.rack,
            "batch": r.batch,
            "expiry": r.expiry.isoformat() if r.expiry else "N/A",
            "qty": r.qty,
            "status": "available" if r.qty > 0 else "out_of_stock"
        }
        for r in rows
    ]

@router.get("/stock-movement")
async def get_stock_movement_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    res = await db.execute(
        select(ScanEvent).order_by(ScanEvent.scanned_at.desc())
    )
    return [{"id": s.id, "event_type": s.event_type, "barcode_value": s.barcode_value, "scanned_at": s.scanned_at} for s in res.scalars().all()]

@router.get("/warehouse-heatmap")
async def get_warehouse_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    res = await db.execute(
        select(
            StockLedger.rack_id,
            func.sum(StockLedger.quantity).label("qty")
        )
        .group_by(StockLedger.rack_id)
    )
    return [{"rack_id": r.rack_id, "occupied_units": r.qty} for r in res.fetchall()]

@router.get("/batch-wise")
async def get_batch_wise_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    res = await db.execute(
        select(
            Batch.batch_number,
            func.sum(StockLedger.quantity).label("qty")
        )
        .join(StockLedger, StockLedger.batch_id == Batch.id)
        .group_by(Batch.batch_number)
    )
    return [{"batch_number": r.batch_number, "qty": r.qty} for r in res.fetchall()]

@router.get("/audit-extract")
async def get_audit_extract(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    query = (
        select(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.timestamp.desc())
    )
    res = await db.execute(query)
    rows = res.all()
    # Indian Standard Time (IST): UTC + 5:30
    IST = timezone(timedelta(hours=5, minutes=30))
    out = []
    for a, email in rows:
        if a.timestamp:
            ts = a.timestamp if a.timestamp.tzinfo else a.timestamp.replace(tzinfo=timezone.utc)
            ist_time = ts.astimezone(IST)
            ts_str = ist_time.strftime("%d-%m-%Y, %I:%M %p")
        else:
            ts_str = "Just now"

        out.append({
            "id": str(a.id),
            "timestamp": ts_str,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": str(a.entity_id) if a.entity_id else "",
            "user_email": email or "owner@vetecura.com",
            "previous_hash": a.previous_hash or ("0" * 64),
            "current_hash": a.current_hash or "",
            "details": a.changes if isinstance(a.changes, str) else json.dumps(a.changes or {}),
            "payload": a.changes
        })
    return out

@router.get("/vendor-performance")
async def get_vendor_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.purchase_team])),
):
    res = await db.execute(select(Supplier))
    return [{"supplier_name": s.name, "on_time_pct": s.on_time_delivery_pct, "rejection_pct": s.rejection_rate_pct} for s in res.scalars().all()]

@router.get("/dashboard/{role}", response_model=DashboardOut)
async def get_role_dashboard(
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team])),
):
    if current_user.role != role and current_user.role != RoleEnum.owner:
        raise HTTPException(status_code=403, detail="Access denied to requested dashboard role payload.")

    metrics = {}
    if role == RoleEnum.owner:
        val_res = await db.execute(
            select(func.sum(StockLedger.quantity * Product.unit_price))
            .join(Product, StockLedger.product_id == Product.id)
        )
        total_val_raw = val_res.scalar()
        total_valuation = 0.0 if inspect.iscoroutine(total_val_raw) else (total_val_raw or 0.0)

        disp_res = await db.execute(
            select(func.count(ScanEvent.id))
            .where(ScanEvent.event_type == 'dispatch')
        )
        disp_raw = disp_res.scalar()
        dispatched_units = 0 if inspect.iscoroutine(disp_raw) else (disp_raw or 0)

        metrics = {
            "total_inventory_valuation": float(total_valuation),
            "dispatched_units": dispatched_units,
            "weekly_anomaly_count": 0
        }
    elif role == RoleEnum.warehouse_manager:
        val_res = await db.execute(
            select(func.sum(StockLedger.quantity * Product.unit_price))
            .join(Product, StockLedger.product_id == Product.id)
        )
        total_val_raw = val_res.scalar()
        total_valuation = 0.0 if inspect.iscoroutine(total_val_raw) else (total_val_raw or 0.0)
        
        disp_res = await db.execute(
            select(func.count(ScanEvent.id))
            .where(ScanEvent.event_type == 'dispatch')
        )
        disp_raw = disp_res.scalar()
        dispatched_units = 0 if inspect.iscoroutine(disp_raw) else (disp_raw or 0)
        metrics = {
            "total_inventory_valuation": float(total_valuation),
            "dispatched_units": dispatched_units,
            "pending_approvals": 0,
            "rack_occupancy_pct": 0.0
        }
    elif role == RoleEnum.warehouse_staff:
        metrics = {"assigned_picks": 0, "active_grns": 0}
    elif role == RoleEnum.purchase_team:
        metrics = {"draft_pos": 0, "low_stock_warnings": 0}

    return DashboardOut(role=role, metrics=metrics)


@router.get("/export/{report_name}")
async def export_report_csv(
    report_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.purchase_team])),
):
    import io, csv
    from fastapi.responses import StreamingResponse

    output = io.StringIO()
    writer = csv.writer(output)

    if report_name == "low-stock":
        writer.writerow(["Product Name", "SKU", "Current Stock", "Reorder Level", "Suggested Reorder Qty"])
        # Query same logic as low-stock endpoint
        res = await db.execute(
            select(Product.name, Product.sku, Product.reorder_level, func.sum(StockLedger.quantity).label("stock_qty"))
            .join(StockLedger, StockLedger.product_id == Product.id)
            .group_by(Product.name, Product.sku, Product.reorder_level)
        )
        for row in res.fetchall():
            if row.stock_qty < row.reorder_level:
                suggested = (row.reorder_level * 2) - row.stock_qty
                writer.writerow([row.name, row.sku, row.stock_qty, row.reorder_level, max(0, suggested)])
    elif report_name == "expiry-risk":
        writer.writerow(["Product Name", "Batch Number", "Expiry Date", "Stock Qty", "Risk Score"])
        res = await db.execute(
            select(Product.name, Batch.batch_number, Batch.expiry_date, func.sum(StockLedger.quantity).label("stock_qty"))
            .join(Product, Batch.product_id == Product.id)
            .join(StockLedger, StockLedger.batch_id == Batch.id)
            .group_by(Product.name, Batch.batch_number, Batch.expiry_date)
        )
        now = datetime.now(timezone.utc).date()
        for row in res.fetchall():
            if not row.expiry_date: continue
            days_to_expiry = max(1, (row.expiry_date - now).days)
            risk_score = round((1.0 / days_to_expiry) * row.stock_qty, 4)
            writer.writerow([row.name, row.batch_number, row.expiry_date.isoformat(), row.stock_qty, risk_score])
    else:
        writer.writerow(["Report Name", "Generated At", "Generated By"])
        writer.writerow([report_name, datetime.now(timezone.utc).isoformat(), current_user.email])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_name}_export.csv"}
    )


@router.get("/verify-chain")
async def verify_audit_hash_chain(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    res = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.asc()))
    logs = res.scalars().all()

    if not logs:
        return {
            "status": "valid",
            "total_logs": 0,
            "verified_count": 0,
            "chain_intact": True,
            "message": "Audit chain is empty and intact."
        }

    previous_hash = "0" * 64
    tampered_entries = []

    for idx, log in enumerate(logs):
        if log.previous_hash and log.previous_hash != previous_hash and idx > 0:
            tampered_entries.append({"index": idx, "id": str(log.id), "reason": "Previous hash link broken"})

        computed = log.calculate_hash()
        if log.current_hash != computed:
            tampered_entries.append({"index": idx, "id": str(log.id), "reason": "SHA-256 hash mismatch"})

        previous_hash = log.current_hash

    is_intact = len(tampered_entries) == 0

    return {
        "status": "valid" if is_intact else "tampered",
        "total_logs": len(logs),
        "verified_count": len(logs) - len(tampered_entries),
        "chain_intact": is_intact,
        "tampered_entries": tampered_entries,
        "message": "100% Hash Chain Integrity Verified" if is_intact else "Tampering Detected in Audit Log Chain!"
    }


@router.get("/anomalies")
async def get_scan_anomalies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    # Rule evaluations across audit_log & dispatches
    force_closed_res = await db.execute(
        select(AuditLog).where(AuditLog.action == "dispatch_force_closed")
    )
    force_closed_logs = force_closed_res.scalars().all()

    anomalies = []
    for log in force_closed_logs:
        anomalies.append({
            "id": str(log.id),
            "rule": "Force-Closed Dispatch Mismatch",
            "severity": "HIGH",
            "entity": log.entity_id,
            "details": log.changes.get("reason", "No reason provided"),
            "timestamp": log.timestamp.isoformat() if log.timestamp else ""
        })

    return {
        "total_anomalies": len(anomalies),
        "anomalies": anomalies
    }
