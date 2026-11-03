"""Customers API — /api/v1/customers"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.customer import Customer

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None


class CustomerOut(BaseModel):
    id: uuid.UUID
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    gstin: Optional[str]

    class Config:
        from_attributes = True


class CustomerBulkRequest(BaseModel):
    customers: List[CustomerCreate]


class BulkResultOut(BaseModel):
    total_received: int
    inserted: int
    updated: int
    skipped: int
    message: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[CustomerOut])
async def list_customers(
    search: Optional[str] = None,
    limit: Optional[int] = 5000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team
    ])),
):
    query = select(Customer)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(Customer.name.ilike(s) | Customer.phone.ilike(s) | Customer.email.ilike(s))
    if limit:
        query = query.limit(limit)
    res = await db.execute(query.order_by(Customer.name.asc()))
    return res.scalars().all()


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    clean_name = body.name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Customer name is required.")

    # Check for existing
    existing = await db.execute(select(Customer).where(func.lower(Customer.name) == clean_name.lower()))
    cust = existing.scalar_one_or_none()
    if cust:
        return cust

    cust = Customer(
        name=clean_name,
        contact_person=body.contact_person,
        phone=body.phone,
        email=body.email,
        address=body.address,
        gstin=body.gstin
    )
    db.add(cust)
    await db.commit()
    await db.refresh(cust)
    return cust


@router.post("/bulk", response_model=BulkResultOut)
async def bulk_create_customers(
    body: CustomerBulkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    """
    Bulk import customers from Excel or CSV.
    Inserts new or updates existing customers by name match.
    """
    if not body.customers:
        return BulkResultOut(total_received=0, inserted=0, updated=0, skipped=0, message="No customers provided.")

    inserted = 0
    updated = 0
    skipped = 0

    # Load existing customer names for fast in-memory indexing
    existing_res = await db.execute(select(Customer))
    existing_map = {c.name.strip().lower(): c for c in existing_res.scalars().all()}

    for item in body.customers:
        name = item.name.strip() if item.name else ""
        if not name:
            skipped += 1
            continue

        lower_name = name.lower()
        if lower_name in existing_map:
            cust = existing_map[lower_name]
            if item.contact_person: cust.contact_person = item.contact_person
            if item.phone: cust.phone = item.phone
            if item.email: cust.email = item.email
            if item.address: cust.address = item.address
            if item.gstin: cust.gstin = item.gstin
            updated += 1
        else:
            new_cust = Customer(
                name=name,
                contact_person=item.contact_person,
                phone=item.phone,
                email=item.email,
                address=item.address,
                gstin=item.gstin
            )
            db.add(new_cust)
            existing_map[lower_name] = new_cust
            inserted += 1

    await db.commit()
    return BulkResultOut(
        total_received=len(body.customers),
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        message=f"Bulk import finished: {inserted} inserted, {updated} updated, {skipped} skipped."
    )
