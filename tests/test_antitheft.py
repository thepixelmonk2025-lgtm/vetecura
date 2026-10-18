import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from src.api.routers.writeoffs import request_writeoff, approve_writeoff, WriteoffCreate, WriteoffApproveBody
from src.api.routers.returns import inspect_return, ReturnInspect
from src.api.routers.cycle_counts import cycle_count_scan, ScanItemBody as CCScanItemBody
from src.models.user import User, RoleEnum
from src.models.antitheft import DamageWriteoff, Return, CycleCount
from src.models.stock import ItemBarcode, StockLedger
from src.models.inbound import Warehouse, Rack

@pytest.mark.asyncio
async def test_writeoff_request_without_photo_rejected():
    db = AsyncMock()
    body = WriteoffCreate(
        item_barcode_id=uuid.uuid4(),
        reason="damaged",
        photo_proof_url=""  # Empty url should be rejected
    )
    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await request_writeoff(body, db, current_user)

    assert exc_info.value.status_code == 422
    assert "photo_proof_url" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_writeoff_approval_decrements_source_and_increments_damage():
    db = AsyncMock()
    wo_id = uuid.uuid4()
    barcode_id = uuid.uuid4()
    prod_id = uuid.uuid4()
    batch_id = uuid.uuid4()
    src_rack_id = uuid.uuid4()
    dmg_wh_id = uuid.uuid4()
    dmg_rack_id = uuid.uuid4()

    wo_mock = MagicMock(spec=DamageWriteoff)
    wo_mock.id = wo_id
    wo_mock.item_barcode_id = barcode_id
    wo_mock.status = "pending"

    wo_res = MagicMock()
    wo_res.scalar_one_or_none.return_value = wo_mock

    bc_mock = MagicMock(spec=ItemBarcode)
    bc_mock.id = barcode_id
    bc_mock.product_id = prod_id
    bc_mock.batch_id = batch_id
    bc_mock.current_rack_id = src_rack_id
    bc_mock.barcode_value = "VET-TYRE-001"
    bc_mock.status = "damaged_hold"
    db.get.return_value = bc_mock

    # Source stock ledger has 10 units
    sl_src = MagicMock(spec=StockLedger)
    sl_src.quantity = 10
    sl_src_res = MagicMock()
    sl_src_res.scalar_one_or_none.return_value = sl_src

    # Damage warehouse & rack
    dmg_wh = MagicMock(spec=Warehouse)
    dmg_wh.id = dmg_wh_id
    dmg_wh_res = MagicMock()
    dmg_wh_res.scalar_one_or_none.return_value = dmg_wh

    dmg_rack = MagicMock(spec=Rack)
    dmg_rack.id = dmg_rack_id
    dmg_rack_res = MagicMock()
    dmg_rack_res.scalar_one_or_none.return_value = dmg_rack

    # Damage stock ledger has 2 units
    sl_dmg = MagicMock(spec=StockLedger)
    sl_dmg.quantity = 2
    sl_dmg_res = MagicMock()
    sl_dmg_res.scalar_one_or_none.return_value = sl_dmg

    # Audit log
    audit_res = MagicMock()
    audit_res.scalar_one_or_none.return_value = None

    db.execute.side_effect = [
        wo_res,        # wo lookup
        sl_src_res,    # src stock ledger
        dmg_wh_res,    # dmg warehouse lookup
        dmg_rack_res,  # dmg rack lookup
        sl_dmg_res,    # dmg stock ledger
        audit_res,     # audit log
    ]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = WriteoffApproveBody(notes="Verified broken sidewall")

    res = await approve_writeoff(wo_id, body, db, current_user)
    assert res["status"] == "approved"
    assert sl_src.quantity == 9, "Source rack quantity must decrease by 1"
    assert sl_dmg.quantity == 3, "Damage hold rack quantity must increase by 1"
    assert bc_mock.current_rack_id == dmg_rack_id


@pytest.mark.asyncio
async def test_cycle_count_rejects_duplicate_barcode():
    db = AsyncMock()
    cc_id = uuid.uuid4()

    cc_mock = MagicMock(spec=CycleCount)
    cc_mock.id = cc_id
    cc_mock.status = "in_progress"
    cc_mock.rack_id = uuid.uuid4()
    cc_res = MagicMock()
    cc_res.scalar_one_or_none.return_value = cc_mock

    # Duplicate scan exists
    dup_res = MagicMock()
    dup_res.scalar_one_or_none.return_value = MagicMock()

    db.execute.side_effect = [cc_res, dup_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = CCScanItemBody(barcode_value="VET-001")

    with pytest.raises(HTTPException) as exc:
        await cycle_count_scan(cc_id, body, db, current_user)

    assert exc.value.status_code == 409
    assert exc.value.detail["error"] == "duplicate_scan"


@pytest.mark.asyncio
async def test_return_inspection_good_vs_damaged():
    db = AsyncMock()
    ret_id = uuid.uuid4()
    barcode_id = uuid.uuid4()
    dest_rack_id = uuid.uuid4()

    ret_mock = MagicMock(spec=Return)
    ret_mock.id = ret_id
    ret_mock.item_barcode_id = barcode_id
    ret_res = MagicMock()
    ret_res.scalar_one_or_none.return_value = ret_mock

    rack_mock = MagicMock(spec=Rack)
    rack_mock.id = dest_rack_id
    db.get.side_effect = [rack_mock, None]

    bc_mock = MagicMock(spec=ItemBarcode)
    bc_mock.id = barcode_id
    bc_mock.product_id = uuid.uuid4()
    bc_mock.batch_id = uuid.uuid4()
    bc_mock.barcode_value = "VET-001"
    db.get.side_effect = [rack_mock, bc_mock]

    sl_mock = MagicMock(spec=StockLedger)
    sl_mock.quantity = 4
    sl_res = MagicMock()
    sl_res.scalar_one_or_none.return_value = sl_mock

    audit_res = MagicMock()
    audit_res.scalar_one_or_none.return_value = None

    db.execute.side_effect = [ret_res, sl_res, audit_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = ReturnInspect(condition="good", routed_to_rack_id=dest_rack_id)

    res = await inspect_return(ret_id, body, db, current_user)
    assert res["status"] == "inspected"
    assert sl_mock.quantity == 5
    assert bc_mock.status == "available"
