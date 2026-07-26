import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from src.api.routers.dispatch import (
    dispatch_scan_item, complete_dispatch, ScanItemBody, CompleteDispatchBody
)
from src.models.user import User, RoleEnum
from src.models.dispatch import DispatchStatusEnum

@pytest.mark.asyncio
async def test_dispatch_scan_accepted():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()
    barcode = "VET-VD2207-000001"
    product_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()
    disp_mock.scanned_count = 0

    no_dup = MagicMock()
    no_dup.scalar_one_or_none.return_value = None

    bc_mock = MagicMock()
    bc_mock.id = uuid.uuid4()
    bc_mock.product_id = product_id
    bc_res = MagicMock()
    bc_res.scalar_one_or_none.return_value = bc_mock

    item_mock = MagicMock()
    item_res = MagicMock()
    item_res.scalar_one_or_none.return_value = item_mock

    # db.execute sequence: disp lookup, duplicate check, barcode lookup, order item check
    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    db.execute.side_effect = [disp_res, no_dup, bc_res, item_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    body = ScanItemBody(
        barcode_value=barcode,
        rack_id=uuid.uuid4(),
        batch_id=uuid.uuid4()
    )

    res = await dispatch_scan_item(dispatch_id, body, db, current_user)
    assert res.scanned_count == 1
    db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_dispatch_complete_match():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.id = dispatch_id
    disp_mock.scanned_count = 5
    disp_mock.expected_count = 5
    disp_mock.status = "in_progress"
    disp_mock.sales_order_id = uuid.uuid4()

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    
    # Scans return empty list for stock deduction in mock
    scans_res = MagicMock()
    scans_res.scalars.return_value.all.return_value = []
    
    # audit last log mock
    audit_res = MagicMock()
    audit_res.scalar_one_or_none.return_value = None

    db.execute.side_effect = [disp_res, audit_res, scans_res]

    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()
    body = CompleteDispatchBody(force_close=False)

    res = await complete_dispatch(dispatch_id, body, db, current_user)
    assert res.status == DispatchStatusEnum.completed
    db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_dispatch_complete_mismatch_no_force():
    db = AsyncMock()
    dispatch_id = uuid.uuid4()

    disp_mock = MagicMock()
    disp_mock.scanned_count = 3
    disp_mock.expected_count = 5

    disp_res = MagicMock()
    disp_res.scalar_one_or_none.return_value = disp_mock
    db.execute.return_value = disp_res

    current_user = MagicMock(spec=User)
    body = CompleteDispatchBody(force_close=False)

    with pytest.raises(HTTPException) as exc_info:
        await complete_dispatch(dispatch_id, body, db, current_user)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["error"] == "count_mismatch"
