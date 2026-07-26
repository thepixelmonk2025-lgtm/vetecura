import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.stock import StockLedger, Batch, ScanEvent
from src.models.product import Product
from src.models.audit import AuditLog
from src.models.supplier import Supplier

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
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    res = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()))
    return [{"id": a.id, "action": a.action, "entity_type": a.entity_type, "payload": a.changes} for a in res.scalars().all()]

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
    if current_user.role != role:
        raise HTTPException(status_code=403, detail="Access denied to requested dashboard role payload.")

    metrics = {}
    if role == RoleEnum.owner:
        metrics = {"total_stock_value": 150000.0, "weekly_anomaly_count": 0}
    elif role == RoleEnum.warehouse_manager:
        metrics = {"pending_approvals": 2, "rack_occupancy_pct": 65.0}
    elif role == RoleEnum.warehouse_staff:
        metrics = {"assigned_picks": 1, "active_grns": 0}
    elif role == RoleEnum.purchase_team:
        metrics = {"draft_pos": 3, "low_stock_warnings": 5}

    return DashboardOut(role=role, metrics=metrics)
