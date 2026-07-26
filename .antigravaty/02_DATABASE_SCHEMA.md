# Database Schema — Vetecura IMS (PostgreSQL)

Naming convention: snake_case tables, singular domain grouping, `id` as UUID primary key on all tables unless noted.

## 1. Core / Auth

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('owner','warehouse_manager','warehouse_staff','purchase_team')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2. Product & Supplier Master

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'unit',      -- unit, box, kg, etc.
  reorder_level INT DEFAULT 0,
  manufacturer_barcode VARCHAR(100),     -- may be null if supplier doesn't provide one
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
  on_time_delivery_pct NUMERIC(5,2) DEFAULT 0,   -- rolling metric, updated by trigger/job
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

## 3. Warehouse & Rack

```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  is_damage_warehouse BOOLEAN DEFAULT FALSE   -- flags the special "Damage Warehouse" facility
);

CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id),
  code VARCHAR(30) NOT NULL,                  -- e.g. "B-12"
  capacity_units INT,
  qr_label_code VARCHAR(100) UNIQUE,          -- printed rack QR
  UNIQUE (warehouse_id, code)
);
```

## 4. Purchase Orders & GRN

```sql
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

CREATE TABLE goods_receipts (   -- GRN
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number VARCHAR(40) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_invoice_file_url TEXT,             -- uploaded invoice for OCR
  ocr_extracted_json JSONB,                   -- raw OCR output, human-confirmed before commit
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','discrepancy')),
  gate_entry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);
```

## 5. Batch, Barcode & Stock Ledger

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

-- Every physical unit (or unit-group, if not individually serialized) gets a barcode record
CREATE TABLE item_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_value VARCHAR(120) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  is_system_generated BOOLEAN DEFAULT FALSE,   -- true if printed by Vetecura, false if manufacturer barcode
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Current stock position, one row per product+batch+rack
CREATE TABLE stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  rack_id UUID REFERENCES racks(id),
  quantity INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, batch_id, rack_id)
);
```

## 6. Scan Events (Stock In / Out)

```sql
CREATE TABLE scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('stock_in','stock_out','cycle_count','return_in','writeoff_out','transfer')),
  barcode_value VARCHAR(120) NOT NULL,
  item_barcode_id UUID REFERENCES item_barcodes(id),
  reference_id UUID,          -- points to grn/dispatch/cycle_count/writeoff/return id depending on event_type
  rack_id UUID REFERENCES racks(id),
  scanned_by UUID REFERENCES users(id),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  device_info VARCHAR(150)
);
```

## 7. Dispatch / Pick Lists

```sql
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference VARCHAR(60) NOT NULL,   -- external order id, e.g. Amazon/B2B ref
  customer_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','picking','ready','dispatched','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  ordered_qty INT NOT NULL
);

CREATE TABLE pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id),
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id),
  pick_list_id UUID REFERENCES pick_lists(id),
  dispatched_by UUID REFERENCES users(id),
  scanned_count INT DEFAULT 0,
  expected_count INT NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','blocked')),
  completed_at TIMESTAMPTZ
);
```

## 8. Anti-Theft: Write-offs, Returns, Cycle Counts

```sql
CREATE TABLE damage_writeoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_barcode_id UUID REFERENCES item_barcodes(id),
  reason VARCHAR(50) NOT NULL,           -- dropdown: damaged, expired, quality_issue, other
  photo_proof_url TEXT NOT NULL,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('customer','supplier')),
  reference_order_id UUID,               -- sales_order or purchase_order
  item_barcode_id UUID REFERENCES item_barcodes(id),
  condition VARCHAR(20) CHECK (condition IN ('good','damaged','expired')),
  routed_to_rack_id UUID REFERENCES racks(id),   -- available stock rack OR damage warehouse rack
  inspected_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID REFERENCES racks(id),
  scheduled_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed')),
  performed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ
);

CREATE TABLE cycle_count_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID REFERENCES cycle_counts(id),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  system_qty INT NOT NULL,
  counted_qty INT NOT NULL,
  variance INT GENERATED ALWAYS AS (counted_qty - system_qty) STORED
);
```

## 9. Immutable Audit Ledger

```sql
-- Append-only, hash-chained. No UPDATE/DELETE grants at DB role level.
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  action VARCHAR(60) NOT NULL,           -- e.g. 'stock_in_scan', 'writeoff_approved', 'po_approved'
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL,                -- full before/after or event detail
  prev_hash CHAR(64) NOT NULL,
  row_hash CHAR(64) NOT NULL,            -- SHA-256(prev_hash || action || entity_id || payload || created_at)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enforce append-only at the database level
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
```

## 10. Notifications

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

## 11. Key Indexes

```sql
CREATE INDEX idx_scan_events_barcode ON scan_events(barcode_value);
CREATE INDEX idx_scan_events_reference ON scan_events(reference_id);
CREATE INDEX idx_stock_ledger_product_batch ON stock_ledger(product_id, batch_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_item_barcodes_value ON item_barcodes(barcode_value);
```

## 12. Entity Relationship Summary

- `products` 1—N `item_barcodes` (via `batches`)
- `purchase_orders` 1—N `purchase_order_items`, 1—1 `goods_receipts`
- `goods_receipts` 1—N `batches` (batches created at GRN time)
- `stock_ledger` is the current-state table; `scan_events` + `audit_log` are the append-only history that derives it
- `sales_orders` 1—N `pick_lists` 1—1 `dispatches`
- `damage_writeoffs`, `returns`, `cycle_counts` all reference `item_barcodes` / `racks` and write into `audit_log`
