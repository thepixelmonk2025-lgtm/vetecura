import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from src.api.routers.reports import get_expiry_risk_report, get_role_dashboard
from src.core.telegram_worker import TelegramAlertWorker
from src.models.user import User, RoleEnum
from src.models.notification import TelegramAlertLog

@pytest.mark.asyncio
async def test_expiry_risk_ranking():
    db = AsyncMock()
    
    # Mock data: 2 batches
    # Batch 1: expires in 10 days, quantity = 100
    # Batch 2: expires in 50 days, quantity = 1000
    row1 = MagicMock()
    row1.product_name = "Product A"
    row1.batch_number = "B01"
    row1.expiry_date = datetime.now(timezone.utc).date() + timedelta(days=10)
    row1.stock_qty = 100

    row2 = MagicMock()
    row2.product_name = "Product B"
    row2.batch_number = "B02"
    row2.expiry_date = datetime.now(timezone.utc).date() + timedelta(days=50)
    row2.stock_qty = 1000

    res_mock = MagicMock()
    res_mock.fetchall.return_value = [row1, row2]
    db.execute.return_value = res_mock

    current_user = MagicMock(spec=User)
    report = await get_expiry_risk_report(db, current_user)

    # Risk score calc:
    # row1: (1 / 10) * 100 = 10.0
    # row2: (1 / 50) * 1000 = 20.0
    # Ranked: row2 (20.0) first, row1 (10.0) second
    assert len(report) == 2
    assert report[0].batch_number == "B02"
    assert report[0].risk_score == 20.0
    assert report[1].batch_number == "B01"
    assert report[1].risk_score == 10.0

@pytest.mark.asyncio
async def test_role_specific_dashboard_access():
    db = AsyncMock()
    
    owner_user = MagicMock(spec=User)
    owner_user.role = RoleEnum.owner
    
    # Requesting owner dashboard for owner user -> passes
    res = await get_role_dashboard(RoleEnum.owner, db, owner_user)
    assert res.role == RoleEnum.owner
    assert "total_inventory_valuation" in res.metrics

    # Requesting manager dashboard for staff user -> gets 403 Access Denied
    staff_user = MagicMock(spec=User)
    staff_user.role = RoleEnum.warehouse_staff
    with pytest.raises(HTTPException) as exc_info:
        await get_role_dashboard(RoleEnum.warehouse_manager, db, staff_user)
    assert exc_info.value.status_code == 403

@pytest.mark.asyncio
async def test_telegram_worker_flow():
    db = AsyncMock()
    
    alert1 = TelegramAlertLog(topic="stock_in", message="Normal alert", status="queued")

    res_mock = MagicMock()
    res_mock.scalars.return_value.all.return_value = [alert1]
    db.execute.return_value = res_mock

    with patch("src.core.telegram_worker.TELEGRAM_BOT_TOKEN", "mock_token"), \
         patch("src.core.telegram_worker.TELEGRAM_CHAT_ID", "mock_chat_id"), \
         patch("httpx.AsyncClient.post") as mock_post:
        
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        worker = TelegramAlertWorker(db)
        processed = await worker.process_queue()

        assert processed == 1
        assert alert1.status == "sent"
        db.commit.assert_called_once()
