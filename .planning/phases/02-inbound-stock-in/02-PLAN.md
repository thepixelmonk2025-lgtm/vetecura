---
phase: 02
plan: 01
subsystem: inbound-stock-in
tags: [suppliers, products, purchase-orders, grn, scanning, barcode, rack, stock-ledger, alembic]
requires: [01-core-engine-data-infrastructure]
provides: [inbound-workflow, stock-ledger, scan-events, barcode-system]
affects: [stock_ledger, scan_events, audit_log]
tech-stack.added: [pytesseract, pillow, python-multipart]
key-decisions:
  - "Every scan writes to both scan_events and audit_log atomically."
  - "Rack suggestion engine prefers consolidation (same product+batch) first."
  - "GRN completion with discrepancy requires explicit Manager acknowledgment (logged)."
  - "Barcode generation: VET-{SKU}-{zero-padded 6-digit sequence}."
  - "OCR is best-effort — failure falls back to manual entry without blocking flow."
requirements: [INBOUND-01, INBOUND-02, INBOUND-03, INBOUND-04]
wave_count: 4
---

# Phase 02 Plan 01: Inbound & Stock In

## Overview

Build the complete inbound logistics flow: Supplier/Product master, Purchase Order approval workflow, GRN creation through OCR invoice ingestion, item-level barcode scanning with rack assignment, and live stock ledger updates — all wired to the Phase 1 audit service.

**Deliverable:** A full GRN can be created, scanned, and completed end-to-end against a test PO, with correct `stock_ledger` updates and `audit_log` entries.

---

## Wave 1: Database Migrations & Domain Models

### Task 1.1 — Alembic Migration: Product & Supplier Master Tables

**Prompt:**
```
Create an Alembic migration for the Product & Supplier master domain in `C:\vetecura\alembic\versions\`.

Tables to create (exact schema from 02_DATABASE_SCHEMA.md):

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'unit',
  reorder_level INT DEFAULT 0,
  manufacturer_barcode VARCHAR(100),
  is_batch_tracked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  gstin VARCHAR(20),
  on_time_delivery_pct NUMERIC(5,2) DEFAULT 0,
  rejection_rate_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supplier_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  product_id UUID REFERENCES products(id),
  unit_price NUMERIC(12,2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Also create the SQLAlchemy async models in `src/models/product.py` and `src/models/supplier.py`. Use the existing `Base` from `src/db/session.py`. Follow the same patterns as `src/models/user.py`.

Migration filename format: `{revision}_product_supplier_master.py`
```

**Verification:**
- [ ] Migration file created and syntactically valid
- [ ] `Product` and `Supplier` models importable from `src/models/`
- [ ] No circular imports

---

### Task 1.2 — Alembic Migration: Warehouse, Rack, PO, GRN Tables

**Prompt:**
```
Create an Alembic migration for Warehouse, Rack, Purchase Orders, and GRN tables. Depends on migration from Task 1.1.

Tables (from 02_DATABASE_SCHEMA.md):

```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  is_damage_warehouse BOOLEAN DEFAULT FALSE
);

CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id),
  code VARCHAR(30) NOT NULL,
  capacity_units INT,
  qr_label_code VARCHAR(100) UNIQUE,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(40) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','closed')),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  ordered_qty INT NOT NULL,
  unit_price NUMERIC(12,2)
);

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number VARCHAR(40) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_invoice_file_url TEXT,
  ocr_extracted_json JSONB,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','discrepancy')),
  gate_entry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);
```

Create SQLAlchemy models in:
- `src/models/warehouse.py` (Warehouse, Rack)
- `src/models/purchase_order.py` (PurchaseOrder, PurchaseOrderItem)
- `src/models/grn.py` (GoodsReceipt)

Migration filename: `{revision}_warehouse_rack_po_grn.py`
```

**Verification:**
- [ ] All models created with correct FK relationships
- [ ] `POStatusEnum` with values: draft, pending_approval, approved, rejected, closed
- [ ] `GRNStatusEnum` with values: in_progress, completed, discrepancy

---

### Task 1.3 — Alembic Migration: Batch, Barcode, Stock Ledger, Scan Events

**Prompt:**
```
Create an Alembic migration for inventory tracking tables. Depends on Task 1.2 migrations.

Tables (from 02_DATABASE_SCHEMA.md):

```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  batch_number VARCHAR(60) NOT NULL,
  mfg_date DATE,
  expiry_date DATE,
  received_via_grn UUID REFERENCES goods_receipts(id),
  UNIQUE (product_id, batch_number)
);

CREATE TABLE item_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_value VARCHAR(120) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  is_system_generated BOOLEAN DEFAULT FALSE,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  rack_id UUID REFERENCES racks(id),
  quantity INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, batch_id, rack_id)
);

CREATE TABLE scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('stock_in','stock_out','cycle_count','return_in','writeoff_out','transfer')),
  barcode_value VARCHAR(120) NOT NULL,
  item_barcode_id UUID REFERENCES item_barcodes(id),
  reference_id UUID,
  rack_id UUID REFERENCES racks(id),
  scanned_by UUID REFERENCES users(id),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  device_info VARCHAR(150)
);
```

Also create indexes:
```sql
CREATE INDEX idx_scan_events_barcode ON scan_events(barcode_value);
CREATE INDEX idx_scan_events_reference ON scan_events(reference_id);
CREATE INDEX idx_stock_ledger_product_batch ON stock_ledger(product_id, batch_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_item_barcodes_value ON item_barcodes(barcode_value);
```

Create SQLAlchemy models in:
- `src/models/batch.py` (Batch, ItemBarcode)
- `src/models/stock.py` (StockLedger, ScanEvent)

Migration filename: `{revision}_batch_barcode_stock_scan.py`
```

**Verification:**
- [ ] `UNIQUE (product_id, batch_number)` constraint on batches
- [ ] `UNIQUE NOT NULL` on `item_barcodes.barcode_value`
- [ ] `UNIQUE (product_id, batch_id, rack_id)` on stock_ledger
- [ ] All indexes created

---

### Task 1.4 — Alembic Migration: Telegram Alerts Log

**Prompt:**
```
Create an Alembic migration for the notification queue table:

```sql
CREATE TABLE telegram_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(30) NOT NULL CHECK (topic IN ('stock_in','stock_out','inventory_alerts','security_audit','management_reports')),
  message TEXT NOT NULL,
  related_entity_type VARCHAR(60),
  related_entity_id UUID,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);
```

Create SQLAlchemy model in `src/models/notification.py` (TelegramAlertLog).
Create a `NotificationService` in `src/core/notifications.py` with a single method:
`enqueue(topic, message, entity_type=None, entity_id=None)` — inserts a row with status='queued'. This is the ONLY way Phase 2 (and all future phases) should trigger Telegram alerts. Never call the Telegram API directly from a business endpoint.

Migration filename: `{revision}_telegram_alerts_log.py`
```

**Verification:**
- [ ] `NotificationService.enqueue()` inserts correctly
- [ ] No direct Telegram API call anywhere in Phase 2 code

---

## Wave 2: Supplier, Product & Rack APIs

### Task 2.1 — Supplier API

**Prompt:**
```
Implement the Supplier API in `src/api/routers/suppliers.py`.

Endpoints (from 03_API_SPECIFICATION.md §3):
- GET  /suppliers             → list suppliers (paginated)  [Purchase, Manager, Owner]
- POST /suppliers             → create supplier              [Purchase, Owner]
- GET  /suppliers/{id}/performance  → on_time_delivery_pct, rejection_rate_pct  [Purchase, Manager, Owner]
- GET  /suppliers/{id}/price-history → supplier_price_history entries [Purchase, Owner]

Pydantic schemas in `src/schemas/supplier.py`:
- SupplierCreate: name (required), contact_person, phone, email, address, gstin
- SupplierOut: all fields
- SupplierPerformance: on_time_delivery_pct, rejection_rate_pct
- PriceHistoryEntry: product_id, unit_price, effective_date

RBAC: use existing `require_role()` dependency from `src/api/deps.py`.
Register router in `src/main.py` with prefix `/api/v1/suppliers`.

Use async SQLAlchemy session from `src/db/session.py`.
```

**Verification:**
- [ ] Purchase Team can create a supplier
- [ ] Manager CANNOT create a supplier (403)
- [ ] Performance endpoint returns correct fields

---

### Task 2.2 — Product API + Barcode Generation

**Prompt:**
```
Implement the Product API in `src/api/routers/products.py`.

Endpoints (from 03_API_SPECIFICATION.md §3):
- GET  /products      → list/search products (paginated, ?search=name_or_sku) [All roles]
- POST /products      → create product  [Manager, Owner]
- PATCH /products/{id} → update product [Manager, Owner]

Pydantic schemas in `src/schemas/product.py`:
- ProductCreate: sku, name, category, unit, reorder_level, manufacturer_barcode, is_batch_tracked
- ProductUpdate: all optional
- ProductOut: all fields + current_stock (computed from stock_ledger sum, optional)

Barcode generation service in `src/core/barcode.py`:
```python
async def generate_system_barcode(product_sku: str, db: AsyncSession) -> str:
    """
    Generates a unique barcode: VET-{SKU}-{zero-padded 6-digit sequence}
    Queries item_barcodes for current max sequence for this SKU, increments.
    Guarantees uniqueness across the entire item_barcodes table.
    """
```

Register router in `src/main.py` with prefix `/api/v1/products`.
```

**Verification:**
- [ ] Staff cannot create or edit products (403)
- [ ] `generate_system_barcode('VD2207', db)` returns `VET-VD2207-000001` on first call, `VET-VD2207-000002` on second
- [ ] Generated barcodes are unique across concurrent requests (use DB-level sequence or SELECT FOR UPDATE)

---

### Task 2.3 — Warehouse & Rack API + Rack Suggestion Engine

**Prompt:**
```
Implement Warehouse and Rack APIs.

Files:
- `src/api/routers/racks.py`
- `src/schemas/rack.py`
- `src/core/rack_suggestion.py`

Endpoints (from 03_API_SPECIFICATION.md §6):
- GET  /racks          → list racks with live occupancy (quantity sum from stock_ledger) [All]
- GET  /racks/heatmap  → occupancy data per rack {rack_id, code, capacity_units, occupied_units} [Manager, Owner]
- POST /racks          → create rack, auto-generate qr_label_code = f"RACK-{warehouse.name[:3].upper()}-{rack.code}" [Manager, Owner]

Rack Suggestion Engine in `src/core/rack_suggestion.py`:
```python
async def suggest_rack(product_id: UUID, batch_id: UUID, db: AsyncSession) -> list[RackSuggestion]:
    """
    Returns ordered list of rack suggestions:
    1. Racks already holding the same product+batch (consolidate-first)
    2. Racks in same zone with remaining capacity (capacity_units - current occupancy > 0)
    3. Any rack with remaining capacity
    Result includes: rack_id, code, current_occupancy, capacity_units, suggestion_reason
    Does NOT hard-block on capacity — returns suggestions, enforcement is soft.
    """
```

Register rack router in `src/main.py` with prefix `/api/v1/racks`.
```

**Verification:**
- [ ] `suggest_rack()` returns consolidation candidate first when same product+batch is on a rack
- [ ] Heatmap endpoint returns capacity vs occupied per rack
- [ ] Staff cannot create racks (403)

---

## Wave 3: Purchase Order & GRN Workflow

### Task 3.1 — Purchase Order API

**Prompt:**
```
Implement the Purchase Order API in `src/api/routers/purchase_orders.py`.

Endpoints (from 03_API_SPECIFICATION.md §4):
- GET  /purchase-orders          → list POs, filter by ?status=  [Purchase, Manager, Owner]
- POST /purchase-orders          → draft a new PO               [Purchase Team only]
- POST /purchase-orders/{id}/submit  → change status draft→pending_approval  [Purchase Team only]
- POST /purchase-orders/{id}/approve → change status→approved, record approved_by+approved_at  [Manager, Owner]
- POST /purchase-orders/{id}/reject  → change status→rejected, requires reason in body  [Manager, Owner]
- GET  /purchase-orders/{id}     → PO detail + line items        [Purchase, Manager, Owner]

Pydantic schemas in `src/schemas/purchase_order.py`:
- POCreate: supplier_id, items: list[POItemCreate]
- POItemCreate: product_id, ordered_qty, unit_price
- POOut: all fields + items list
- POApproveOut: updated status + approved_by + approved_at
- PORejectBody: reason (required, min 10 chars)

Business rules:
- PO cannot be submitted unless status is 'draft'
- PO cannot be approved unless status is 'pending_approval'
- Rejection requires a reason (validated in schema)
- All status transitions write to audit_log via existing AuditLog service

Register router in `src/main.py` with prefix `/api/v1/purchase-orders`.
```

**Verification:**
- [ ] Staff cannot approve a PO (403)
- [ ] Purchase Team cannot approve their own PO (403 — role not in allowed list)
- [ ] Submitting an already-pending PO returns 409
- [ ] All status transitions appear in audit_log

---

### Task 3.2 — GRN Gate Entry & OCR Invoice Ingestion

**Prompt:**
```
Implement the first half of the GRN workflow in `src/api/routers/grn.py`.

Endpoints:
- POST /grn/gate-entry      → create GoodsReceipt row, status='in_progress', gate_entry_at=now()  [Staff, Manager, Owner]
- POST /grn/{id}/ocr-invoice → multipart upload, store file to local/S3 path, run OCR extraction    [Staff, Manager]
- GET  /grn/{id}/ocr-review  → return ocr_extracted_json for human review                           [Staff, Manager]
- POST /grn/{id}/confirm-fields → Manager confirms/edits OCR output, commits batch+expiry data       [Manager, Owner]

GRN Number generation: `GRN-{YYYYMMDD}-{zero-padded 4-digit sequence}` (reset per day).

OCR Service in `src/core/ocr.py`:
```python
async def extract_invoice_fields(file_path: str) -> dict:
    """
    Uses pytesseract to extract text from invoice image/PDF.
    Returns structured dict: {items: [{name, qty, batch_number, unit_price}], raw_text: str}
    On failure (unreadable): returns {items: [], raw_text: "", error: "ocr_failed"}
    OCR failure does NOT raise an exception — caller falls back to manual entry.
    """
```

Confirm-fields endpoint:
- Validates that batch_number + expiry_date are provided for all is_batch_tracked=true products
- Creates Batch rows in DB for each confirmed line item
- Creates ItemBarcode rows for manufacturer barcodes (where manufacturer_barcode is set on product)
- For products with no manufacturer_barcode: sets a flag so scan-item endpoint knows to generate internal barcode first
- Updates grn.ocr_extracted_json with confirmed data
- Writes audit_log entry: action='grn_fields_confirmed'

Schemas in `src/schemas/grn.py`:
- GateEntryCreate: purchase_order_id
- GRNOut: all GoodsReceipt fields + scan progress (scanned_count, expected_count)
- ConfirmFieldsBody: items list with batch_number, mfg_date, expiry_date per product

Register router in `src/main.py` with prefix `/api/v1/grn`.
```

**Verification:**
- [ ] Gate entry creates GRN with correct GRN number format
- [ ] OCR failure returns graceful fallback, does not block workflow
- [ ] confirm-fields rejects if batch fields missing for tracked products
- [ ] Batch rows created correctly in DB after confirm-fields
- [ ] audit_log entry written on field confirmation

---

### Task 3.3 — GRN Item Scanning & Stock Ledger Updates

**Prompt:**
```
Implement the scan-item endpoint and stock ledger update logic — the core of the entire system.

Endpoint:
POST /grn/{grn_id}/scan-item  [Staff, Manager, Owner]

Request body:
{
  "barcode_value": "VET-VD2207-000123",
  "rack_id": "uuid",
  "batch_id": "uuid"
}

Scan validation logic (in order, fail-fast):
1. GRN must be in 'in_progress' status → 409 if not
2. Check item_barcodes table for barcode_value:
   - Not found AND barcode starts with manufacturer prefix → 422 barcode_not_found
   - Not found AND barcode matches VET-{SKU}-{seq} pattern → look up by product+batch
3. Check for duplicate: scan_events WHERE barcode_value = X AND reference_id = grn_id AND event_type = 'stock_in' → 409 duplicate_scan
4. Verify barcode belongs to a product/batch expected in this GRN (cross-reference purchase_order_items) → 422 barcode_not_found if not
5. Validate rack exists → 422 if not

On successful scan (atomic transaction):
a. Insert scan_events row: event_type='stock_in', reference_id=grn_id, rack_id, scanned_by=current_user.id
b. Upsert stock_ledger: (product_id, batch_id, rack_id) → quantity += 1
   Use INSERT ... ON CONFLICT (product_id, batch_id, rack_id) DO UPDATE SET quantity = quantity + 1
c. Write audit_log entry: action='stock_in_scan', entity_type='scan_events', entity_id=scan_event.id,
   payload={barcode_value, rack_id, grn_id, product_id, batch_id}
   Use the existing AuditLog.calculate_hash() from src/models/audit.py

Return: {status: "accepted", scan_event_id, current_rack_count}

Error responses (from 03_API_SPECIFICATION.md §5):
- duplicate_scan: {"error": "duplicate_scan", "message": "This barcode was already scanned in this GRN session."}
- barcode_not_found: {"error": "barcode_not_found", "message": "Barcode does not match any expected item on this GRN."}
```

**Verification:**
- [ ] Successful scan: scan_events row created, stock_ledger incremented, audit_log written
- [ ] Duplicate scan rejected with correct error code (no DB changes)
- [ ] Wrong product barcode rejected with barcode_not_found (no DB changes)
- [ ] All three operations are atomic (single transaction)

---

### Task 3.4 — GRN Label Generation & Completion

**Prompt:**
```
Implement the final GRN endpoints.

POST /grn/{id}/generate-label  [Staff, Manager, Owner]
- For unlabeled products (manufacturer_barcode is null on product)
- Calls `generate_system_barcode()` from src/core/barcode.py
- Creates ItemBarcode row with is_system_generated=True, printed_at=now()
- Returns barcode_value for printing
- Writes audit_log entry: action='internal_barcode_generated'

POST /grn/{id}/complete  [Manager, Owner]
- Calculates: expected_qty = sum of purchase_order_items.ordered_qty for this PO
- Calculates: scanned_qty = count of scan_events WHERE reference_id = grn_id AND event_type = 'stock_in'
- If scanned_qty == expected_qty:
  - Set grn.status = 'completed', grn.completed_at = now()
  - Enqueue Telegram alert via NotificationService.enqueue('stock_in', message, 'goods_receipts', grn_id)
  - Write audit_log: action='grn_completed'
- If scanned_qty != expected_qty:
  - Set grn.status = 'discrepancy'
  - Body must contain: force_close: bool, reason: str (required if force_close=True)
  - If force_close=False: return 409 with discrepancy details {expected, scanned, shortfall/excess}
  - If force_close=True (Manager override): set grn.status = 'completed'
    Write audit_log: action='grn_force_closed', payload={reason, expected, scanned, discrepancy}
    Enqueue Telegram alert to BOTH 'stock_in' AND 'security_audit' topics

GET /grn/{id}  [Staff, Manager, Owner]
- Returns full GRN detail: grn fields + scan progress + line items + batch info

CompleteGRNBody schema: force_close: bool = False, reason: Optional[str]
Validator: if force_close=True, reason is required (min 20 chars — forces meaningful explanation)
```

**Verification:**
- [ ] GRN with exact match completes normally
- [ ] GRN with mismatch returns 409 without force_close
- [ ] force_close=True with reason completes and writes audit_log with reason
- [ ] Telegram alert enqueued (not sent synchronously) in both cases

---

## Wave 4: Tests & Integration

### Task 4.1 — Unit Tests: Barcode & Rack Suggestion Services

**Prompt:**
```
Write pytest unit tests for the core services.

File: `tests/test_phase2_services.py`

Tests for `src/core/barcode.py`:
- test_generate_system_barcode_format: verify output matches `VET-{SKU}-{6-digit-zero-padded}`
- test_generate_system_barcode_uniqueness: two sequential calls return different barcodes
- test_generate_system_barcode_existing_sequence: if VET-VD2207-000005 exists, next is VET-VD2207-000006

Tests for `src/core/rack_suggestion.py`:
- test_suggest_rack_consolidation_first: rack with same product+batch is ranked #1
- test_suggest_rack_capacity_respected: rack over capacity still appears but ranked lower (soft warning)
- test_suggest_rack_empty_warehouse: returns racks with capacity when no existing stock

Run with: `$env:PYTHONPATH="."; .\venv\Scripts\Activate.ps1; pytest tests/test_phase2_services.py -v`
```

**Verification:**
- [ ] All barcode format tests pass
- [ ] Rack suggestion priority order verified

---

### Task 4.2 — Integration Tests: GRN Scan Flow

**Prompt:**
```
Write pytest integration tests for the critical GRN scan flow.

File: `tests/test_grn_scan.py`

Use FastAPI TestClient from `src/main.py`. Use an in-memory SQLite or test PostgreSQL database.

Test fixtures: create test users (manager + staff), supplier, product, PO, GRN in approved state.

Tests (happy path + every rejection path):
- test_scan_item_success: valid scan → 200, scan_events created, stock_ledger incremented, audit_log written
- test_scan_duplicate_rejected: scan same barcode twice → first 200, second 409 duplicate_scan
- test_scan_wrong_product_rejected: scan barcode for different product → 409 barcode_not_found
- test_grn_complete_match: scan all expected items → complete → status=completed
- test_grn_complete_mismatch_no_force: scan fewer than expected → complete without force_close → 409
- test_grn_complete_mismatch_with_force: scan fewer + force_close=True + reason → completes, audit_log has reason
- test_rbac_staff_cannot_confirm_fields: staff calling confirm-fields → 403
- test_rbac_purchase_team_cannot_gate_entry: purchase team calling gate-entry → 403

Run with: `$env:PYTHONPATH="."; .\venv\Scripts\Activate.ps1; pytest tests/test_grn_scan.py -v`
```

**Verification:**
- [ ] All 8 tests pass
- [ ] Zero DB changes on rejected scans (verify via direct DB query in test)

---

## Completion Checklist

- [ ] All 4 Alembic migrations created and reversible
- [ ] All 14 API endpoints implemented with correct RBAC
- [ ] `NotificationService.enqueue()` used for all Telegram alerts (no direct API calls)
- [ ] Every stock-affecting action writes to `audit_log` via hash-chain service
- [ ] `scan_events` + `stock_ledger` updated atomically in single transaction
- [ ] Rack suggestion engine returns consolidation-first order
- [ ] All unit tests pass (`test_phase2_services.py`)
- [ ] All integration tests pass (`test_grn_scan.py`)
- [ ] Router registered in `src/main.py` for all new endpoints
