import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from src.api.routers.dispatch import (
    dispatch_scan_item, complete_dispatch, ScanItemBody, CompleteDispatchBody
)
from src.models.user import User, RoleEnum
from src.models.dispatch import DispatchStatusEnum
from src.models.stock import ItemBarcode, StockLedger, ScanEvent

@pytest.mark.asyncio
async def test_dispatch_scan_accepted():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode = "VET-VD2207-000001"
    product_id = uuid.uuid4()
    rack_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()
    disp_mock.scanned_count = 0

    no_dup = MagicMock()
    no_dup.scalar_one_or_none.return_value = None

    bc_mock = MagicMock()
    bc_mock.id = uuid.uuid4()
    bc_mock.product_id = product_id
    bc_mock.status = "available"
    bc_mock.current_rack_id = rack_id
    bc_res = MagicMock()
    bc_res.scalar_one_or_none.return_value = bc_mock

    item_mock = MagicMock()
    item_res = MagicMock()
    item_res.scalar_one_or_none.return_value = item_mock

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    db.execute.side_effect = [disp_res, no_dup, bc_res, item_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    body = ScanItemBody(
        barcode_value=barcode,
        rack_id=rack_id,
        batch_id=uuid.uuid4()
    )

    res = await dispatch_scan_item(dispatch_id, body, db, current_user)
    assert res.scanned_count == 1
    assert bc_mock.status == "reserved_pick"
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_scan_rejects_already_dispatched():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode = "VET-VD2207-000001"

    disp_mock = MagicMock()
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()

    no_dup = MagicMock()
    no_dup.scalar_one_or_none.return_value = None

    bc_mock = MagicMock()
    bc_mock.status = "dispatched"
    bc_res = MagicMock()
    bc_res.scalar_one_or_none.return_value = bc_mock

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    db.execute.side_effect = [disp_res, no_dup, bc_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    body = ScanItemBody(barcode_value=barcode, rack_id=uuid.uuid4(), batch_id=uuid.uuid4())

    with pytest.raises(HTTPException) as exc:
        await dispatch_scan_item(dispatch_id, body, db, current_user)
    assert exc.value.status_code == 409
    assert exc.value.detail["error"] == "item_already_dispatched"


@pytest.mark.asyncio
async def test_dispatch_scan_rejects_rack_mismatch():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode = "VET-VD2207-000001"
    correct_rack = uuid.uuid4()
    scanned_rack = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()

    no_dup = MagicMock()
    no_dup.scalar_one_or_none.return_value = None

    bc_mock = MagicMock()
    bc_mock.status = "available"
    bc_mock.current_rack_id = correct_rack
    bc_res = MagicMock()
    bc_res.scalar_one_or_none.return_value = bc_mock

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    db.execute.side_effect = [disp_res, no_dup, bc_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    body = ScanItemBody(barcode_value=barcode, rack_id=scanned_rack, batch_id=uuid.uuid4())

    with pytest.raises(HTTPException) as exc:
        await dispatch_scan_item(dispatch_id, body, db, current_user)
    assert exc.value.status_code == 422
    assert exc.value.detail["error"] == "rack_mismatch"


@pytest.mark.asyncio
async def test_dispatch_complete_match_decrements_stock():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode_id = uuid.uuid4()
    product_id = uuid.uuid4()
    batch_id = uuid.uuid4()
    rack_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.id = dispatch_id
    disp_mock.scanned_count = 1
    disp_mock.expected_count = 1
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    
    # Audit log mock
    audit_res = MagicMock()
    audit_res.scalar_one_or_none.return_value = None

    # Scans return 1 scan event
    scan_event = MagicMock(spec=ScanEvent)
    scan_event.item_barcode_id = barcode_id
    scan_event.rack_id = rack_id
    scans_res = MagicMock()
    scans_res.scalars.return_value.all.return_value = [scan_event]

    # Barcode
    bc = MagicMock(spec=ItemBarcode)
    bc.id = barcode_id
    bc.product_id = product_id
    bc.batch_id = batch_id
    bc.status = "reserved_pick"
    bc.current_rack_id = rack_id
    db.get.return_value = bc

    # Stock ledger with quantity 5
    sl = MagicMock(spec=StockLedger)
    sl.quantity = 5
    sl_res = MagicMock()
    sl_res.scalar_one_or_none.return_value = sl

    db.execute.side_effect = [disp_res, audit_res, scans_res, sl_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = CompleteDispatchBody(force_close=False)

    res = await complete_dispatch(dispatch_id, body, db, current_user)
    assert res.status == DispatchStatusEnum.completed
    assert sl.quantity == 4
    assert bc.status == "dispatched"
    assert bc.current_rack_id is None
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_dispatch_complete_blocks_on_insufficient_stock():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode_id = uuid.uuid4()
    rack_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.id = dispatch_id
    disp_mock.scanned_count = 1
    disp_mock.expected_count = 1
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    audit_res = MagicMock()
    audit_res.scalar_one_or_none.return_value = None

    scan_event = MagicMock(spec=ScanEvent)
    scan_event.item_barcode_id = barcode_id
    scan_event.rack_id = rack_id
    scans_res = MagicMock()
    scans_res.scalars.return_value.all.return_value = [scan_event]

    bc = MagicMock(spec=ItemBarcode)
    bc.id = barcode_id
    bc.product_id = uuid.uuid4()
    bc.batch_id = uuid.uuid4()
    bc.barcode_value = "VET-001"
    db.get.return_value = bc

    # Stock ledger with 0 quantity (theft / empty)
    sl = MagicMock(spec=StockLedger)
    sl.quantity = 0
    sl_res = MagicMock()
    sl_res.scalar_one_or_none.return_value = sl

    db.execute.side_effect = [disp_res, audit_res, scans_res, sl_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = CompleteDispatchBody(force_close=False)

    with pytest.raises(HTTPException) as exc:
        await complete_dispatch(dispatch_id, body, db, current_user)
    assert exc.value.status_code == 409
    assert exc.value.detail["error"] == "insufficient_stock"
