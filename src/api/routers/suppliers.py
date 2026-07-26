"""Supplier API — /api/v1/suppliers"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from src.db.session import get_db
from src.api.deps import get_current_active_user, require_role
from src.models.user import RoleEnum, User
from src.models.supplier import Supplier, SupplierPriceHistory

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None


class SupplierOut(BaseModel):
    id: UUID
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    on_time_delivery_pct: float
    rejection_rate_pct: float

    class Config:
        from_attributes = True


class SupplierPerformance(BaseModel):
    supplier_id: UUID
    on_time_delivery_pct: float
    rejection_rate_pct: float


class PriceHistoryEntry(BaseModel):
    id: UUID
    product_id: UUID
    unit_price: float
    effective_date: str

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[SupplierOut])
async def list_suppliers(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    offset = (page - 1) * limit
    result = await db.execute(select(Supplier).offset(offset).limit(limit))
    return result.scalars().all()


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.purchase_team, RoleEnum.owner])),
):
    supplier = Supplier(**body.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}/performance", response_model=SupplierPerformance)
async def get_supplier_performance(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return SupplierPerformance(
        supplier_id=supplier.id,
        on_time_delivery_pct=float(supplier.on_time_delivery_pct or 0),
        rejection_rate_pct=float(supplier.rejection_rate_pct or 0),
    )


@router.get("/{supplier_id}/price-history", response_model=list[PriceHistoryEntry])
async def get_price_history(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.owner
    ])),
):
    result = await db.execute(
        select(SupplierPriceHistory)
        .where(SupplierPriceHistory.supplier_id == supplier_id)
        .order_by(SupplierPriceHistory.effective_date.desc())
    )
    return result.scalars().all()
