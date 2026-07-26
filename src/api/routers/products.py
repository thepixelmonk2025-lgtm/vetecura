"""Product API — /api/v1/products"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.product import Product

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    unit: str = "unit"
    reorder_level: int = 0
    manufacturer_barcode: Optional[str] = None
    is_batch_tracked: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[int] = None
    manufacturer_barcode: Optional[str] = None
    is_batch_tracked: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    sku: str
    name: str
    category: Optional[str]
    unit: str
    reorder_level: int
    manufacturer_barcode: Optional[str]
    is_batch_tracked: bool

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProductOut])
async def list_products(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team
    ])),
):
    query = select(Product)
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
        )
    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    return result.scalars().all()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    # Check SKU uniqueness
    existing = await db.execute(select(Product).where(Product.sku == body.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="SKU already exists")

    product = Product(**body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product
