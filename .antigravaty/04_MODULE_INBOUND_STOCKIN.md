# Module: Inbound Logistics & Stock In

## 1. Purpose

Ensure every unit entering the warehouse is scanned, batch/expiry-logged, and rack-assigned before it counts as available stock.

## 2. Functional Flow

1. **PO Approval** — Purchase Team drafts PO → submits → Manager/Owner approves → PO status `approved`.
2. **Gate Entry** — On truck arrival, Staff logs gate entry against the approved PO. Creates a `goods_receipts` row, status `in_progress`.
3. **OCR Invoice Ingestion** — Staff/Manager uploads the supplier's invoice (PDF/image). System runs OCR, extracts: item list, quantities, batch numbers if printed, unit prices. Extracted data is shown for human review — **never auto-committed**.
4. **Field Confirmation** — Manager reviews/edits OCR output, confirms batch number, MFG date, expiry date per line item.
5. **Barcode Availability Check** — For each product, check `manufacturer_barcode`. If present and unique, scanning uses it directly. If absent/duplicate, system auto-generates an internal barcode (`VET-{SKU}-{sequence}`) and Staff prints + applies a label before scanning.
6. **Item-Level Scanning** — Staff scans every physical unit. Each scan:
   - Validates barcode belongs to an expected product/batch on this GRN
   - Rejects duplicate scans (already scanned in this session)
   - Rejects wrong-product scans (barcode doesn't match any expected line item)
   - Prompts for rack assignment (or reads it from a pre-scanned rack QR)
   - Writes a `scan_events` row (`event_type = 'stock_in'`) and an `audit_log` row
7. **Rack & Location Mapping** — Each scan associates the unit with a `rack_id`. `stock_ledger` is incremented live per product+batch+rack.
8. **GRN Completion** — Manager finalizes once scanning is done. System compares total scanned vs. ordered quantity:
   - Match → GRN marked `completed`, Telegram "Stock In" alert fires
   - Mismatch → GRN marked `discrepancy`, requires Manager acknowledgment before closing

## 3. Business Rules

- A GRN cannot be marked `completed` with unscanned/unreconciled discrepancies without explicit Manager override (logged in audit trail with reason).
- Batch number + expiry date are mandatory for any `is_batch_tracked = true` product — GRN cannot proceed to scanning without them.
- System-generated barcodes must be unique across the entire `item_barcodes` table, not just within one GRN.
- OCR failure (unreadable invoice) does not block the process — falls back to fully manual field entry.

## 4. Rack Assignment Logic

Default assignment suggests a rack based on:
1. Existing rack already holding the same product+batch (consolidate first)
2. Nearest rack with available capacity in the product's designated zone
3. Manual override always available to Staff/Manager

Rack capacity (`racks.capacity_units`) is checked before confirming assignment — if exceeded, system warns but does not hard-block (real warehouses need flexibility here).

## 5. Edge Cases to Handle

| Scenario | Expected Behavior |
|---|---|
| Same barcode scanned twice in one GRN | Reject with `duplicate_scan` error, no ledger change |
| Barcode not on the PO at all | Reject with `barcode_not_found`, flagged for Manager review |
| Partial delivery (less than PO qty) | Allowed; GRN closes with recorded shortfall, PO stays open for remaining qty |
| Over-delivery (more than PO qty) | Flagged as discrepancy, requires Manager approval to accept excess |
| Product has no manufacturer barcode at all | System always generates internal barcode, printed before scanning proceeds |
| Mixed batches in same delivery | Each batch tracked separately even for the same product; scanning UI must show which batch is active |

## 6. UI Requirements (Warehouse PWA)

- Large scan-target button, works with camera scan and Bluetooth/USB HID scanners
- Running counter: "342 / 500 scanned" always visible
- Audible/haptic feedback distinguishing accepted scan vs. rejected (duplicate/wrong-product) scan
- Offline queueing: if network drops mid-GRN, scans keep queuing locally and sync automatically on reconnect — never lose a scan

## 7. Telegram Alert Triggers (see `07_MODULE_TELEGRAM_ALERTS.md` for format)

- GRN completed successfully → Stock In topic
- GRN closed with discrepancy → Inventory Alerts + Security & Audit topics
- Internal barcode label printed for unlabeled product → logged, no alert needed unless volume is unusually high (anomaly)
