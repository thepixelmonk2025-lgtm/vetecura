"""Rack API — /api/v1/racks"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.inbound import Rack, Warehouse
from src.models.stock import StockLedger
from src.core.rack_suggestion import suggest_rack, RackSuggestion

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class RackCreate(BaseModel):
    warehouse_id: Optional[UUID] = None
    code: str
    capacity_units: Optional[int] = None


class RackOut(BaseModel):
    id: UUID
    warehouse_id: UUID
    code: str
    capacity_units: Optional[int]
    qr_label_code: Optional[str]
    current_occupancy: int = 0

    class Config:
        from_attributes = True


class RackHeatmapEntry(BaseModel):
    rack_id: UUID
    code: str
    capacity_units: Optional[int]
    occupied_units: int
    fill_pct: Optional[float]


class RackSuggestionOut(BaseModel):
    rack_id: UUID
    code: str
    warehouse_id: UUID
    capacity_units: Optional[int]
    current_occupancy: int
    available_capacity: Optional[int]
    suggestion_reason: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[RackOut])
async def list_racks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team
    ])),
):
    result = await db.execute(select(Rack))
    racks = result.scalars().all()

    # Get live occupancy
    occ_result = await db.execute(
        select(StockLedger.rack_id, func.sum(StockLedger.quantity).label("qty"))
        .group_by(StockLedger.rack_id)
    )
    occupancy = {row.rack_id: row.qty for row in occ_result.fetchall()}

    out = []
    for rack in racks:
        rack_dict = {
            "id": rack.id,
            "warehouse_id": rack.warehouse_id,
            "code": rack.code,
            "capacity_units": rack.capacity_units,
            "qr_label_code": rack.qr_label_code,
            "current_occupancy": occupancy.get(rack.id, 0),
        }
        out.append(RackOut(**rack_dict))
    return out


@router.get("/heatmap", response_model=list[RackHeatmapEntry])
async def rack_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(Rack))
    racks = result.scalars().all()

    occ_result = await db.execute(
        select(StockLedger.rack_id, func.sum(StockLedger.quantity).label("qty"))
        .group_by(StockLedger.rack_id)
    )
    occupancy = {row.rack_id: row.qty for row in occ_result.fetchall()}

    out = []
    for rack in racks:
        occ = occupancy.get(rack.id, 0)
        fill_pct = round((occ / rack.capacity_units) * 100, 1) if rack.capacity_units else None
        out.append(RackHeatmapEntry(
            rack_id=rack.id,
            code=rack.code,
            capacity_units=rack.capacity_units,
            occupied_units=occ,
            fill_pct=fill_pct,
        ))
    return out


@router.post("", response_model=RackOut, status_code=status.HTTP_201_CREATED)
async def create_rack(
    body: RackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    # Verify warehouse exists or fetch default
    wh = None
    if body.warehouse_id:
        wh = await db.get(Warehouse, body.warehouse_id)
    if not wh:
        wh_res = await db.execute(select(Warehouse).limit(1))
        wh = wh_res.scalar_one_or_none()

    if not wh:
        wh = Warehouse(name="Main Central Warehouse", location="Dock 1")
        db.add(wh)
        await db.flush()

    # Auto-generate QR label code
    qr_code = f"RACK-{wh.name[:3].upper()}-{body.code}"

    rack = Rack(
        warehouse_id=body.warehouse_id,
        code=body.code,
        capacity_units=body.capacity_units,
        qr_label_code=qr_code,
    )
    db.add(rack)
    await db.commit()
    await db.refresh(rack)

    return RackOut(
        id=rack.id,
        warehouse_id=rack.warehouse_id,
        code=rack.code,
        capacity_units=rack.capacity_units,
        qr_label_code=rack.qr_label_code,
        current_occupancy=0,
    )


@router.get("/suggest", response_model=list[RackSuggestionOut])
async def suggest_rack_for_scan(
    product_id: UUID,
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([
        RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff
    ])),
):
    suggestions = await suggest_rack(product_id, batch_id, db)
    return [
        RackSuggestionOut(
            rack_id=s.rack_id,
            code=s.code,
            warehouse_id=s.warehouse_id,
            capacity_units=s.capacity_units,
            current_occupancy=s.current_occupancy,
            available_capacity=s.available_capacity,
            suggestion_reason=s.suggestion_reason,
        )
        for s in suggestions
    ]
