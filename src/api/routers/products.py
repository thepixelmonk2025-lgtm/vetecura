"""Product API — /api/v1/products"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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
    unit_price: Optional[float] = 0.0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[int] = None
    manufacturer_barcode: Optional[str] = None
    is_batch_tracked: Optional[bool] = None
    unit_price: Optional[float] = None


class ProductOut(BaseModel):
    id: UUID
    sku: str
    name: str
    category: Optional[str]
    unit: str
    reorder_level: int
    manufacturer_barcode: Optional[str]
    is_batch_tracked: bool
    unit_price: Optional[float] = 0.0

    class Config:
        from_attributes = True


class ProductBulkItem(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    unit: Optional[str] = "unit"
    reorder_level: Optional[int] = 0
    manufacturer_barcode: Optional[str] = None
    unit_price: Optional[float] = 0.0
    is_batch_tracked: Optional[bool] = True


class ProductBulkRequest(BaseModel):
    products: List[ProductBulkItem]


class ProductBulkResultOut(BaseModel):
    total_received: int
    inserted: int
    updated: int
    skipped: int
    message: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProductOut])
async def list_products(
    search: Optional[str] = None,
    page: int = 1,
    limit: Optional[int] = 10000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team
    ])),
):
    query = select(Product)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            Product.name.ilike(s) | Product.sku.ilike(s) | Product.manufacturer_barcode.ilike(s)
        )
    if limit:
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
    result = await db.execute(query.order_by(Product.name.asc()))
    return result.scalars().all()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    clean_sku = body.sku.strip()
    if not clean_sku:
        raise HTTPException(status_code=422, detail="SKU is required.")

    # Check SKU uniqueness
    existing = await db.execute(select(Product).where(func.lower(Product.sku) == clean_sku.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Product SKU '{clean_sku}' already exists.")

    product = Product(**body.model_dump())
    product.sku = clean_sku
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/bulk", response_model=ProductBulkResultOut)
async def bulk_create_products(
    body: ProductBulkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    """
    High-performance Bulk Import endpoint designed for 3,000+ SKUs.
    Upserts products by matching SKU: updates existing products or inserts new ones.
    """
    if not body.products:
        return ProductBulkResultOut(total_received=0, inserted=0, updated=0, skipped=0, message="No products received.")

    # Fetch existing SKUs into hash map for O(1) matching
    existing_res = await db.execute(select(Product))
    existing_map = {p.sku.strip().lower(): p for p in existing_res.scalars().all()}

    inserted = 0
    updated = 0
    skipped = 0

    for item in body.products:
        clean_sku = item.sku.strip() if item.sku else ""
        clean_name = item.name.strip() if item.name else ""

        if not clean_sku or not clean_name:
            skipped += 1
            continue

        lower_sku = clean_sku.lower()
        if lower_sku in existing_map:
            prod = existing_map[lower_sku]
            prod.name = clean_name
            if item.category: prod.category = item.category.strip()
            if item.unit: prod.unit = item.unit.strip().lower()
            if item.reorder_level is not None: prod.reorder_level = int(item.reorder_level)
            if item.manufacturer_barcode: prod.manufacturer_barcode = item.manufacturer_barcode.strip()
            if item.unit_price is not None: prod.unit_price = float(item.unit_price)
            if item.is_batch_tracked is not None: prod.is_batch_tracked = bool(item.is_batch_tracked)
            updated += 1
        else:
            new_prod = Product(
                sku=clean_sku,
                name=clean_name,
                category=item.category.strip() if item.category else "General",
                unit=item.unit.strip().lower() if item.unit else "unit",
                reorder_level=int(item.reorder_level or 0),
                manufacturer_barcode=item.manufacturer_barcode.strip() if item.manufacturer_barcode else None,
                unit_price=float(item.unit_price or 0.0),
                is_batch_tracked=bool(item.is_batch_tracked if item.is_batch_tracked is not None else True)
            )
            db.add(new_prod)
            existing_map[lower_sku] = new_prod
            inserted += 1

    await db.commit()
    return ProductBulkResultOut(
        total_received=len(body.products),
        inserted=inserted,
        updated=updated,
        skipped=skipped,
        message=f"Bulk import finished: {inserted} inserted, {updated} updated, {skipped} skipped."
    )



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
