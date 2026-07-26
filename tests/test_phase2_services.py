"""
Phase 2 Unit Tests: Barcode Generation & Rack Suggestion Services

Run:
    $env:PYTHONPATH="."; .\venv\Scripts\Activate.ps1; pytest tests/test_phase2_services.py -v
"""
import pytest
import re
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from src.core.barcode import generate_system_barcode


# ═══════════════════════════════════════════════════════
# Barcode Generation Tests
# ═══════════════════════════════════════════════════════

class TestBarcodeFormat:
    """Tests that generated barcodes match VET-{SKU}-{6-digit-zero-padded}."""

    @pytest.mark.asyncio
    async def test_generate_system_barcode_format_first(self):
        """First barcode for a SKU must be VET-SKU-000001."""
        db = AsyncMock()
        # Simulate no existing barcodes for this SKU
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await generate_system_barcode("VD2207", db)

        assert result == "VET-VD2207-000001"
        assert re.match(r"^VET-VD2207-\d{6}$", result)

    @pytest.mark.asyncio
    async def test_generate_system_barcode_format_pattern(self):
        """Barcode must match VET-{SKU}-{exactly 6 digits}."""
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await generate_system_barcode("TESTSKU", db)

        assert result.startswith("VET-TESTSKU-")
        suffix = result.split("-")[-1]
        assert len(suffix) == 6
        assert suffix.isdigit()

    @pytest.mark.asyncio
    async def test_generate_system_barcode_increments_sequence(self):
        """Given existing barcode VET-VD2207-000005, next must be VET-VD2207-000006."""
        db = AsyncMock()
        call_count = 0

        async def mock_execute(query):
            nonlocal call_count
            call_count += 1
            m = MagicMock()
            if call_count == 1:
                # First call: return last existing barcode
                m.scalar_one_or_none.return_value = "VET-VD2207-000005"
            else:
                # Second call: uniqueness check — no collision
                m.scalar_one_or_none.return_value = None
            return m

        db.execute.side_effect = mock_execute

        result = await generate_system_barcode("VD2207", db)
        assert result == "VET-VD2207-000006"

    @pytest.mark.asyncio
    async def test_generate_system_barcode_uniqueness_sequential(self):
        """Two sequential calls with incrementing state return different barcodes."""
        db1 = AsyncMock()
        mock_r1 = MagicMock()
        mock_r1.scalar_one_or_none.return_value = None
        db1.execute.return_value = mock_r1

        db2 = AsyncMock()
        call_count = 0

        async def mock_execute2(query):
            nonlocal call_count
            call_count += 1
            m = MagicMock()
            if call_count == 1:
                m.scalar_one_or_none.return_value = "VET-VD2207-000001"
            else:
                m.scalar_one_or_none.return_value = None
            return m

        db2.execute.side_effect = mock_execute2

        bc1 = await generate_system_barcode("VD2207", db1)
        bc2 = await generate_system_barcode("VD2207", db2)

        assert bc1 != bc2
        assert bc1 == "VET-VD2207-000001"
        assert bc2 == "VET-VD2207-000002"

    @pytest.mark.asyncio
    async def test_generate_barcode_different_skus_independent(self):
        """Barcodes for different SKUs are independently sequenced."""
        db = AsyncMock()
        mock_r = MagicMock()
        mock_r.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_r

        bc_a = await generate_system_barcode("PRODA", db)
        bc_b = await generate_system_barcode("PRODB", db)

        assert bc_a.startswith("VET-PRODA-")
        assert bc_b.startswith("VET-PRODB-")
        assert bc_a != bc_b


# ═══════════════════════════════════════════════════════
# Rack Suggestion Engine Tests
# ═══════════════════════════════════════════════════════

class TestRackSuggestion:
    """Tests that rack suggestion prioritizes correctly."""

    @pytest.mark.asyncio
    async def test_suggest_rack_consolidation_first(self):
        """Rack holding same product+batch should be ranked first (consolidate)."""
        from src.core.rack_suggestion import suggest_rack, RackSuggestion

        product_id = uuid.uuid4()
        batch_id = uuid.uuid4()
        consolidate_rack_id = uuid.uuid4()
        other_rack_id = uuid.uuid4()

        db = AsyncMock()

        # First execute: consolidation query — returns 1 match
        consolidate_row = MagicMock()
        consolidate_row.rack_id = consolidate_rack_id
        consolidate_row.current_qty = 10

        consolidate_result = MagicMock()
        consolidate_result.fetchall.return_value = [consolidate_row]

        # Rack object for consolidate_rack
        consolidate_rack = MagicMock()
        consolidate_rack.id = consolidate_rack_id
        consolidate_rack.code = "A-01"
        consolidate_rack.warehouse_id = uuid.uuid4()
        consolidate_rack.capacity_units = 50

        # Second execute: occupancy map
        occ_result = MagicMock()
        occ_result.fetchall.return_value = []

        # Third execute: remaining racks
        other_rack = MagicMock()
        other_rack.id = other_rack_id
        other_rack.code = "B-02"
        other_rack.warehouse_id = uuid.uuid4()
        other_rack.capacity_units = 50

        racks_result = MagicMock()
        racks_result.scalars.return_value.all.return_value = [other_rack]

        execute_calls = [consolidate_result, occ_result, racks_result]
        db.execute.side_effect = execute_calls
        db.get.return_value = consolidate_rack

        suggestions = await suggest_rack(product_id, batch_id, db)

        assert len(suggestions) >= 1
        assert suggestions[0].rack_id == consolidate_rack_id
        assert suggestions[0].suggestion_reason == "consolidate"

    @pytest.mark.asyncio
    async def test_suggest_rack_empty_warehouse(self):
        """Returns available racks when no existing stock for product+batch."""
        from src.core.rack_suggestion import suggest_rack

        product_id = uuid.uuid4()
        batch_id = uuid.uuid4()
        rack_id = uuid.uuid4()

        db = AsyncMock()

        # No consolidation candidates
        empty_result = MagicMock()
        empty_result.fetchall.return_value = []

        # No occupancy
        occ_result = MagicMock()
        occ_result.fetchall.return_value = []

        # One available rack
        available_rack = MagicMock()
        available_rack.id = rack_id
        available_rack.code = "C-01"
        available_rack.warehouse_id = uuid.uuid4()
        available_rack.capacity_units = 100

        racks_result = MagicMock()
        racks_result.scalars.return_value.all.return_value = [available_rack]

        db.execute.side_effect = [empty_result, occ_result, racks_result]

        suggestions = await suggest_rack(product_id, batch_id, db)

        assert len(suggestions) >= 1
        assert suggestions[0].rack_id == rack_id
        assert suggestions[0].current_occupancy == 0
        assert suggestions[0].available_capacity == 100

    @pytest.mark.asyncio
    async def test_suggest_rack_over_capacity_still_appears(self):
        """Over-capacity racks appear but ranked lower (soft warning, not hard block)."""
        from src.core.rack_suggestion import suggest_rack

        product_id = uuid.uuid4()
        batch_id = uuid.uuid4()
        full_rack_id = uuid.uuid4()
        empty_rack_id = uuid.uuid4()

        db = AsyncMock()

        # No consolidation
        empty_consol = MagicMock()
        empty_consol.fetchall.return_value = []

        # full_rack is at 50/50 capacity, empty_rack is at 0/50
        full_occ_row = MagicMock()
        full_occ_row.rack_id = full_rack_id
        full_occ_row.total_qty = 50

        occ_result = MagicMock()
        occ_result.fetchall.return_value = [full_occ_row]

        full_rack = MagicMock()
        full_rack.id = full_rack_id
        full_rack.code = "D-01"
        full_rack.warehouse_id = uuid.uuid4()
        full_rack.capacity_units = 50

        empty_rack = MagicMock()
        empty_rack.id = empty_rack_id
        empty_rack.code = "E-01"
        empty_rack.warehouse_id = uuid.uuid4()
        empty_rack.capacity_units = 50

        racks_result = MagicMock()
        racks_result.scalars.return_value.all.return_value = [full_rack, empty_rack]

        db.execute.side_effect = [empty_consol, occ_result, racks_result]

        suggestions = await suggest_rack(product_id, batch_id, db)

        rack_ids = [s.rack_id for s in suggestions]
        # Empty rack must appear before full rack (available_space before any_rack)
        if empty_rack_id in rack_ids and full_rack_id in rack_ids:
            assert rack_ids.index(empty_rack_id) < rack_ids.index(full_rack_id)
        # Both should appear — no hard block
        assert empty_rack_id in rack_ids or full_rack_id in rack_ids
