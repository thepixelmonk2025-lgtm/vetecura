"""Supplier API — /api/v1/suppliers"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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


class SupplierBulkRequest(BaseModel):
    suppliers: List[SupplierCreate]


class SupplierBulkResultOut(BaseModel):
    total_received: int
    inserted: int
    updated: int
    skipped: int
    message: str


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
    limit: Optional[int] = 5000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.purchase_team, RoleEnum.warehouse_manager, RoleEnum.owner
    ])),
):
    query = select(Supplier).order_by(Supplier.name.asc())
    if limit:
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.purchase_team, RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    clean_name = body.name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Supplier name is required.")

    existing = await db.execute(select(Supplier).where(func.lower(Supplier.name) == clean_name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Supplier '{clean_name}' already exists.")

    supplier = Supplier(**body.model_dump())
    supplier.name = clean_name
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.post("/bulk", response_model=SupplierBulkResultOut)
async def bulk_create_suppliers(
    body: SupplierBulkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.purchase_team, RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    """
    Bulk import suppliers from Excel or CSV.
    Inserts new or updates existing suppliers by name match.
    """
    if not body.suppliers:
        return SupplierBulkResultOut(total_received=0, inserted=0, updated=0, skipped=0, message="No suppliers received.")

    existing_res = await db.execute(select(Supplier))
    existing_map = {s.name.strip().lower(): s for s in existing_res.scalars().all()}

    inserted = 0
    updated = 0
    skipped = 0

    for item in body.suppliers:
        clean_name = item.name.strip() if item.name else ""
        if not clean_name:
            skipped += 1
            continue

        lower_name = clean_name.lower()
        if lower_name in existing_map:
            sup = existing_map[lower_name]
            if item.contact_person: sup.contact_person = item.contact_person.strip()
            if item.phone: sup.phone = item.phone.strip()
            if item.email: sup.email = item.email.strip()
            if item.address: sup.address = item.address.strip()
            if item.gstin: sup.gstin = item.gstin.strip()
            updated += 1
        else:
            new_sup = Supplier(
                name=clean_name,
                contact_person=item.contact_person.strip() if item.contact_person else None,
                phone=item.phone.strip() if item.phone else None,
                email=item.email.strip() if item.email else None,
                address=item.address.strip() if item.address else None,
                gstin=item.gstin.strip() if item.gstin else None
            )
            db.add(new_sup)
            existing_map[lower_name] = new_sup
            inserted += 1

    await db.commit()
    return SupplierBulkResultOut(
        total_received=len(body.suppliers),
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        message=f"Bulk import finished: {inserted} inserted, {updated} updated, {skipped} skipped."
    )

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
