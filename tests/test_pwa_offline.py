import pytest
import uuid
from unittest.mock import AsyncMock
from src.core.drivers import PrinterDriver
from src.core.sync import OfflineSyncManager

def test_driver_renders_zpl_correctly():
    layout = {
        "canvas": {"width_mm": 40, "height_mm": 20},
        "elements": [
            {"type": "qr", "value_field": "barcode_value", "x_mm": 2, "y_mm": 2},
            {"type": "text", "value_field": "sku", "x_mm": 17, "y_mm": 3}
        ]
    }
    zpl = PrinterDriver.render_to_zpl("QR", "VET-VD-01", layout)
    assert "^XA" in zpl
    assert "^XZ" in zpl
    assert "VET-VD-01" in zpl

def test_driver_renders_escpos_correctly():
    layout = {}
    escpos_bytes = PrinterDriver.render_to_escpos("CODE128", "VET-VD-02", layout)
    assert b"\x1b\x40" in escpos_bytes
    assert b"MOCK_ESCPOS_RENDER" in escpos_bytes

@pytest.mark.asyncio
async def test_offline_sync_manager():
    manager = OfflineSyncManager()
    scan_data = {"barcode_value": "VET-01", "rack_id": uuid.uuid4()}
    
    # Offline state
    manager.connection_status = "offline"
    manager.queue_locally(scan_data)
    assert len(manager.local_queue) == 1

    # Attempt sync while offline
    db = AsyncMock()
    res = await manager.sync_queue(db, None)
    assert res["pending"] == 1
    assert res["synced"] == 0

    # Online state - process successfully
    manager.connection_status = "online"
    async def mock_handler(scan, database):
        return True

    res = await manager.sync_queue(db, mock_handler)
    assert res["synced"] == 1
    assert res["pending"] == 0
