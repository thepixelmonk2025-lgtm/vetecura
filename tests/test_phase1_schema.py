"""
Phase 1 QA Test Suite: Item Ownership, Lifecycle State & Database Schema Verification
"""
import uuid
import pytest
from datetime import datetime, timezone
from src.models.stock import ItemBarcode, ItemBarcodeStatusEnum, Batch
from src.models.inbound import Warehouse, Rack
from src.models.product import Product
from alembic.config import Config
from alembic.script import ScriptDirectory


def test_item_barcode_status_enum_values():
    """Verify all required lifecycle states exist in ItemBarcodeStatusEnum."""
    expected_states = {
        "available",
        "reserved_pick",
        "dispatched",
        "damaged_hold",
        "quarantine",
        "returned_hold",
        "disposed",
    }
    actual_states = {e.value for e in ItemBarcodeStatusEnum}
    assert expected_states == actual_states, f"Missing or extra states: {actual_states ^ expected_states}"


def test_item_barcode_model_schema():
    """Verify ItemBarcode model has required status, current_rack_id and last_scanned_at columns."""
    prod_id = uuid.uuid4()
    batch_id = uuid.uuid4()
    rack_id = uuid.uuid4()

    barcode = ItemBarcode(
        barcode_value="VET-TYRE-000001",
        product_id=prod_id,
        batch_id=batch_id,
        status=ItemBarcodeStatusEnum.available.value,
        current_rack_id=rack_id,
        is_system_generated=True,
        last_scanned_at=datetime.now(timezone.utc),
    )

    assert barcode.barcode_value == "VET-TYRE-000001"
    assert barcode.status == "available"
    assert barcode.current_rack_id == rack_id
    assert barcode.product_id == prod_id
    assert barcode.batch_id == batch_id
    assert barcode.is_system_generated is True
    assert barcode.last_scanned_at is not None


def test_alembic_migration_revision_exists():
    """Verify Alembic migration revision 001_initial_schema exists in alembic/versions."""
    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)
    revisions = [rev.revision for rev in script.walk_revisions()]
    assert "001_initial_schema" in revisions, f"Revisions found: {revisions}"


def test_damage_warehouse_flag():
    """Verify Warehouse model supports is_damage_warehouse flag for anti-theft segregation."""
    wh_main = Warehouse(name="Main Warehouse", is_damage_warehouse=False)
    wh_dmg = Warehouse(name="Damage Warehouse", is_damage_warehouse=True)

    assert wh_main.is_damage_warehouse is False
    assert wh_dmg.is_damage_warehouse is True
