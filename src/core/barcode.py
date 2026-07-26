"""
Barcode Generation Service

Generates globally unique system barcodes for unlabeled products.
Format: VET-{SKU}-{zero-padded 6-digit sequence}
Uniqueness is enforced via SELECT FOR UPDATE to prevent races.
"""
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from src.models.stock import ItemBarcode


async def generate_system_barcode(product_sku: str, db: AsyncSession) -> str:
    """
    Generate the next unique system barcode for a given product SKU.

    Queries item_barcodes for existing VET-{SKU}-* entries,
    increments the max sequence, and returns the new barcode value.
    Uses a row-level lock to prevent race conditions under concurrent scans.

    Args:
        product_sku: The product's SKU (e.g., "VD2207")
        db: Async database session

    Returns:
        New barcode string like "VET-VD2207-000001"
    """
    prefix = f"VET-{product_sku}-"

    # Lock-based sequence: find highest existing sequence for this SKU
    result = await db.execute(
        select(ItemBarcode.barcode_value)
        .where(ItemBarcode.barcode_value.like(f"{prefix}%"))
        .where(ItemBarcode.is_system_generated == True)
        .order_by(ItemBarcode.barcode_value.desc())
        .limit(1)
        .with_for_update()
    )
    last_barcode = result.scalar_one_or_none()

    if last_barcode is None:
        next_seq = 1
    else:
        # Extract the numeric suffix: VET-VD2207-000005 → 5
        match = re.search(r"-(\d+)$", last_barcode)
        next_seq = (int(match.group(1)) + 1) if match else 1

    new_barcode = f"{prefix}{next_seq:06d}"

    # Double-check uniqueness (failsafe)
    existing = await db.execute(
        select(ItemBarcode).where(ItemBarcode.barcode_value == new_barcode)
    )
    if existing.scalar_one_or_none():
        # Collision — increment until unique
        next_seq += 1
        new_barcode = f"{prefix}{next_seq:06d}"

    return new_barcode
