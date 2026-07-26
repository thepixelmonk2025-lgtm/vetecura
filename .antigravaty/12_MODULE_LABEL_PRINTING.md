# Module: Label Printing (Barcode / QR / Rack Labels)

**Module Code:** `LBL`
**Depends on:** `02_DATABASE_SCHEMA.md` (`item_barcodes`, `racks`, `batches`), `04_MODULE_INBOUND_STOCKIN.md`
**Consumed by:** Stock In, Rack Setup, Batch Management, Cycle Count re-labeling

---

## 1. Purpose

Provide a centralized, template-driven label generation and printing service that produces scannable, enterprise-grade labels for items, batches, and rack locations — decoupled from any single printer brand, size, or connection method, so Vetecura can change hardware without touching core inventory logic.

## 2. Design Principles

- **Templates, not hardcoded formats.** Every label is generated from a stored template (size, layout, encoded fields) — never a one-off string built inline in application code.
- **Printer-agnostic core.** The service builds an abstract "print job" object; a driver layer translates it to ESC/POS, ZPL, or a raster image depending on the target printer. Adding a new printer brand means adding a driver, not rewriting the module.
- **Idempotent barcode values.** A barcode is generated once and stored permanently in `item_barcodes`. Printing (or reprinting) never mints a new barcode value for the same physical unit — it only re-renders the existing one.
- **Fail-safe, not fail-blocking.** A printer being offline must never block a Stock In/Out scan session. Failed print jobs queue for retry; the workflow continues.
- **Human-scannability first.** Every template is validated against a minimum scan-reliability threshold (quiet zone, module size, contrast) before being allowed into production use.

## 3. Label Types

| Type | Code | Used On | Encoded Data |
|---|---|---|---|
| Item Barcode | `ITEM` | Individual unit (bottle, packet, box) | `barcode_value` (SKU-based or serialized) |
| Batch Label | `BATCH` | Carton / batch-level grouping | `product_id`, `batch_number`, `mfg_date`, `expiry_date` |
| Rack Label | `RACK` | Warehouse rack/shelf location | `rack_id`, `warehouse_id`, `code` |
| Pallet/Carton Label | `PALLET` | Bulk outbound units (optional, Phase 2 extension) | `dispatch_id`, contained item summary, destination |

## 4. Label Size Presets

Stored as configurable templates, not hardcoded constants. Defaults shipped with the system:

| Preset Code | Dimensions | Target Label Type | Notes |
|---|---|---|---|
| `SM-25x15` | 25mm × 15mm | `ITEM` | QR + SKU only — no product name text (scan reliability floor) |
| `MD-40x20` | 40mm × 20mm | `ITEM` | QR/1D + SKU + short product name |
| `MD-50x30` | 50mm × 30mm | `BATCH` | QR + batch no. + MFG/expiry text block |
| `LG-70x40` | 70mm × 40mm | `RACK` | Large QR + human-readable rack code, readable from ~1.5m |
| `LG-100x70` | 100mm × 70mm | `PALLET` | QR + text block + optional logo |

Roll width compatibility must be confirmed against Vetecura's printer hardware (common thermal roll widths: 25mm, 38mm, 50mm, 76mm, 100mm) — **hardware procurement should follow template decisions, not the reverse.**

## 5. Data Model Additions

```sql
CREATE TABLE label_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_code VARCHAR(30) UNIQUE NOT NULL,          -- e.g. 'SM-25x15'
  label_type VARCHAR(20) NOT NULL CHECK (label_type IN ('ITEM','BATCH','RACK','PALLET')),
  width_mm NUMERIC(5,2) NOT NULL,
  height_mm NUMERIC(5,2) NOT NULL,
  dpi INT DEFAULT 203,                              -- standard thermal printer DPI
  symbology VARCHAR(20) NOT NULL CHECK (symbology IN ('QR','CODE128','EAN13')),
  layout_json JSONB NOT NULL,                       -- field positions, font sizes, show/hide flags
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_type VARCHAR(20) NOT NULL,
  entity_type VARCHAR(30) NOT NULL,                 -- 'item_barcode' | 'batch' | 'rack' | 'dispatch'
  entity_id UUID NOT NULL,
  template_id UUID REFERENCES label_templates(id),
  printer_id UUID REFERENCES printers(id),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','sent','printed','failed','cancelled')),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  printed_at TIMESTAMPTZ
);

CREATE TABLE printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,                       -- e.g. "GRN Desk Printer 1"
  connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('usb','bluetooth','network')),
  protocol VARCHAR(20) NOT NULL CHECK (protocol IN ('escpos','zpl')),
  ip_address VARCHAR(50),                           -- for network printers
  location VARCHAR(100),                            -- e.g. "GRN Bay", "Dispatch Bay"
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ
);
```

`item_barcodes.printed_at` (already in core schema) is updated only when a `print_jobs` row for that barcode reaches `status = 'printed'`.

## 6. Architecture

```
[PWA / Web Admin] --"Print Label" action-->  [FastAPI: /labels/print]
        |
        v
[Label Service]
   1. Resolve entity (item_barcode / batch / rack / dispatch)
   2. Resolve active template for label_type
   3. Render abstract print job: { symbology, encoded_value, layout, text_fields }
   4. Insert `print_jobs` row (status='queued')
   5. Push job onto printer-specific queue (Redis list, key = printer_id)
        |
        v
[Printer Driver Layer]
   - ESC/POS driver: builds raw byte stream (image raster or native barcode command)
   - ZPL driver: builds ZPL command string
        |
        v
[Delivery Layer] -- one of:
   - Network printer: backend POSTs raw bytes directly to printer IP:port
   - USB/Bluetooth printer: PWA pulls queued job via polling/WebSocket, sends bytes
     through Web USB / Web Bluetooth API from the browser
        |
        v
[Printer] --> physical label printed --> printer/PWA confirms --> `print_jobs.status = 'printed'`
```

**Why the queue matters:** print jobs must never block the Stock In/Out scan transaction. A scan event completes and is committed regardless of whether the label has physically printed yet — printing is fire-and-forget from the transaction's perspective, tracked separately via `print_jobs`.

## 7. API Specification

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/labels/templates` | List available label templates | Staff, Manager, Owner |
| POST | `/labels/templates` | Create/edit a custom template | Manager, Owner |
| POST | `/labels/print` | Queue a print job | Staff, Manager |
| POST | `/labels/print/batch` | Queue multiple print jobs at once (bulk GRN scenario) | Staff, Manager |
| GET | `/labels/print-jobs/{id}` | Check job status | Staff, Manager |
| POST | `/labels/print-jobs/{id}/retry` | Retry a failed job | Staff, Manager |
| POST | `/labels/reprint/{entity_type}/{entity_id}` | Reprint existing barcode (no new value minted) | Staff, Manager |
| GET | `/printers` | List registered printers + status | Manager, Owner |
| POST | `/printers` | Register a new printer | Manager, Owner |
| PATCH | `/printers/{id}` | Update printer config (IP, active status) | Manager, Owner |

**Print request body:**
```json
{
  "label_type": "ITEM",
  "entity_id": "uuid-of-item-barcode",
  "printer_id": "uuid-of-target-printer",
  "template_preset": "MD-40x20",
  "copies": 1
}
```

**Bulk print (e.g. 500 units from one GRN):**
```json
{
  "label_type": "ITEM",
  "entity_ids": ["uuid1", "uuid2", "..."],
  "printer_id": "uuid",
  "template_preset": "SM-25x15"
}
```

## 8. Printer Protocol Layer

### ESC/POS (thermal receipt-style printers)
- Use `python-escpos` server-side to build raw command bytes for barcode/QR rendering, text sizing, and cut command.
- Suited to USB/Bluetooth-connected desktop thermal printers (TVS, common Indian POS-style printers).

### ZPL (Zebra Programming Language)
- Used for dedicated label printers (Zebra GK420, ZD series) — industry standard for logistics/warehouse labeling.
- ZPL strings are plain text commands (`^XA ... ^FO ... ^BQN ... ^XZ`), easy to template and log for debugging.
- Recommended for Vetecura's `RACK` and `BATCH` labels given higher durability/adhesive label stock typically used with Zebra-class printers.

### Delivery Method Decision Table

| Connection | Complexity | Recommended For |
|---|---|---|
| Network (wifi/ethernet) | Low — backend POSTs directly to printer IP | Fixed stations: GRN desk, Dispatch bay, Rack labeling station |
| USB | Medium — requires Web USB API from PWA, browser permission prompt | Single fixed workstation, budget setups |
| Bluetooth | Medium-High — requires Web Bluetooth API, pairing management | Mobile/roaming staff printing on the move (rare for this workflow) |

**Recommendation to client:** provision network-connected printers at the two fixed high-volume points (GRN desk, Dispatch bay) to avoid browser hardware-API complexity entirely. Reserve USB/Bluetooth handling only if a mobile/roaming printing use case is confirmed.

## 9. Template Layout Engine

`label_templates.layout_json` defines field placement so templates can be edited without code changes:

```json
{
  "canvas": { "width_mm": 40, "height_mm": 20, "dpi": 203 },
  "elements": [
    { "type": "qr", "value_field": "barcode_value", "x_mm": 2, "y_mm": 2, "size_mm": 14 },
    { "type": "text", "value_field": "sku", "x_mm": 17, "y_mm": 3, "font_size_pt": 8, "bold": true },
    { "type": "text", "value_field": "product_name_short", "x_mm": 17, "y_mm": 9, "font_size_pt": 6, "max_chars": 20 }
  ]
}
```

Manager/Owner-facing template editor (Web Admin) provides a visual preview before saving — no template goes live without a rendered preview check.

## 10. Scan-Reliability Validation Rules

Before a template can be marked `is_active = true`:

- QR module size must render at ≥ 0.4mm per module at the target DPI (below this, common CCD/laser scanners fail consistently)
- Minimum quiet zone (blank margin) of 2mm around any barcode/QR
- Text fields must not overlap or crowd the barcode's quiet zone
- For `SM-25x15`, only `QR + SKU` permitted — product name and dates are blocked by validation at this size (enforced in the template editor, not just documentation)

## 11. Reprint & Damage Handling

- Reprinting never generates a new barcode value — `POST /labels/reprint/{entity_type}/{entity_id}` re-renders the existing stored value.
- Every reprint is logged in `print_jobs` (new row, same `entity_id`) and reflected in `audit_log` (`action = 'label_reprinted'`) — reprint volume by item is itself a useful anomaly signal (excessive reprints on the same barcode may indicate label damage patterns or, rarely, deliberate barcode swapping — worth a threshold-based flag in Phase 3 anomaly detection).

## 12. Failure Handling & Retry

| Failure | System Behavior |
|---|---|
| Printer offline / unreachable | Job stays `queued`, workflow continues uninterrupted; barcode value already reserved in `item_barcodes` |
| Printer out of labels/ribbon | Printer driver returns error → job marked `failed` with `error_message`; visible in a "Pending Prints" queue for Staff to retry once resolved |
| Print job sent but printer jammed mid-print | Manual `retry` endpoint call re-sends the same job; no duplicate barcode risk since value is idempotent |
| Bulk batch job partially fails | Each entity in the batch gets its own `print_jobs` row — partial success is tracked per-unit, not all-or-nothing |

## 13. Security & Access Control

- Only `Staff`, `Manager`, `Owner` roles can trigger prints (Purchase Team has no operational need).
- Only `Manager`/`Owner` can create or edit label templates or register new printers — prevents an unauthorized template change silently degrading scan reliability warehouse-wide.
- Printer registration requires network-level validation (ping/handshake) before being marked active, to avoid queuing jobs to a stale/incorrect IP.

## 14. Hardware Recommendation Summary (for procurement)

| Station | Recommended Printer Class | Connection |
|---|---|---|
| GRN Desk (Stock In) | Zebra GK420 / TVS thermal, ZPL or ESC/POS | Network preferred |
| Dispatch Bay (Stock Out) | Same class as GRN desk | Network preferred |
| Rack Setup (one-time/infrequent) | Any ZPL-capable label printer | USB acceptable (low frequency use) |

## 15. Testing Checklist (Definition of Done for this Module)

- [ ] All 4 default templates (`SM-25x15`, `MD-40x20`, `MD-50x30`, `LG-70x40`) render and pass scan-reliability validation
- [ ] Print job succeeds end-to-end on at least one ESC/POS and one ZPL printer
- [ ] Network printer delivery tested with printer physically disconnected mid-job (failure path confirmed non-blocking)
- [ ] Bulk print of 500 item labels completes with per-unit job tracking (partial failure simulated and confirmed isolated)
- [ ] Reprint confirmed to reuse existing barcode value, never mints a duplicate
- [ ] Template editor blocks saving an `SM-25x15` template with disallowed fields (name/date text)
- [ ] Non-Manager/Owner role confirmed blocked from template creation and printer registration endpoints
