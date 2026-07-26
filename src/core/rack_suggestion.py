"""
Rack Suggestion Engine

Suggests optimal rack assignment for incoming stock based on:
1. Consolidation-first: prefer racks already holding same product+batch
2. Capacity-aware: prefer racks with available space
3. Soft-block: capacity warnings only, no hard block (warehouse flexibility)
"""
import uuid
from dataclasses import dataclass
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.models.inbound import Rack
from src.models.stock import StockLedger


@dataclass
class RackSuggestion:
    rack_id: uuid.UUID
    code: str
    warehouse_id: uuid.UUID
    capacity_units: Optional[int]
    current_occupancy: int
    available_capacity: Optional[int]
    suggestion_reason: str  # "consolidate" | "available_space" | "any_rack"


async def suggest_rack(
    product_id: uuid.UUID,
    batch_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 5,
) -> list[RackSuggestion]:
    """
    Return ordered list of rack suggestions for a stock-in scan.

    Priority order:
    1. Racks already holding the same product+batch (consolidate-first)
    2. Racks with remaining capacity
    3. Any available rack (fallback)

    Capacity check is SOFT — over-capacity racks still appear with a warning,
    never hard-blocked (real warehouse flexibility requirement).
    """
    suggestions: list[RackSuggestion] = []
    seen_ids: set[uuid.UUID] = set()

    # ── Priority 1: racks already holding same product+batch ──────────────
    consolidate_result = await db.execute(
        select(
            StockLedger.rack_id,
            func.sum(StockLedger.quantity).label("current_qty"),
        )
        .where(StockLedger.product_id == product_id)
        .where(StockLedger.batch_id == batch_id)
        .where(StockLedger.quantity > 0)
        .group_by(StockLedger.rack_id)
        .order_by(func.sum(StockLedger.quantity).desc())
    )
    consolidate_rows = consolidate_result.fetchall()

    for row in consolidate_rows:
        rack = await db.get(Rack, row.rack_id)
        if rack and row.rack_id not in seen_ids:
            avail = (rack.capacity_units - row.current_qty) if rack.capacity_units else None
            suggestions.append(RackSuggestion(
                rack_id=rack.id,
                code=rack.code,
                warehouse_id=rack.warehouse_id,
                capacity_units=rack.capacity_units,
                current_occupancy=row.current_qty,
                available_capacity=avail,
                suggestion_reason="consolidate",
            ))
            seen_ids.add(row.rack_id)

    if len(suggestions) >= limit:
        return suggestions[:limit]

    # ── Priority 2: racks with available capacity (not already added) ─────
    # Get total occupancy per rack
    occupancy_result = await db.execute(
        select(
            StockLedger.rack_id,
            func.sum(StockLedger.quantity).label("total_qty"),
        )
        .group_by(StockLedger.rack_id)
    )
    occupancy_map = {row.rack_id: row.total_qty for row in occupancy_result.fetchall()}

    racks_result = await db.execute(
        select(Rack).where(Rack.id.notin_(seen_ids))
    )
    racks = racks_result.scalars().all()

    # Sort: racks with available capacity first
    def sort_key(rack: Rack):
        occ = occupancy_map.get(rack.id, 0)
        if rack.capacity_units:
            return (0 if occ < rack.capacity_units else 1, occ)
        return (0, occ)  # unlimited capacity — always available

    racks.sort(key=sort_key)

    for rack in racks:
        if len(suggestions) >= limit:
            break
        occ = occupancy_map.get(rack.id, 0)
        avail = (rack.capacity_units - occ) if rack.capacity_units else None
        suggestions.append(RackSuggestion(
            rack_id=rack.id,
            code=rack.code,
            warehouse_id=rack.warehouse_id,
            capacity_units=rack.capacity_units,
            current_occupancy=occ,
            available_capacity=avail,
            suggestion_reason="available_space" if (avail is None or avail > 0) else "any_rack",
        ))
        seen_ids.add(rack.id)

    return suggestions
