---
phase: 02
source: PRD Express Path
prd_file: .antigravaty/04_MODULE_INBOUND_STOCKIN.md
supporting_refs:
  - .antigravaty/00_PRD_OVERVIEW.md
  - .antigravaty/02_DATABASE_SCHEMA.md
  - .antigravaty/03_API_SPECIFICATION.md
  - .antigravaty/09_RBAC_SECURITY.md
locked_decisions:
  - "GRN cannot be marked completed with unscanned discrepancies without explicit Manager override (logged in audit trail)."
  - "Batch number + expiry date are mandatory for is_batch_tracked=true products — GRN cannot proceed to scanning without them."
  - "System-generated barcodes follow VET-{SKU}-{sequence} format and must be globally unique across item_barcodes table."
  - "OCR failure does NOT block the process — falls back to fully manual entry."
  - "Duplicate scan returns 'duplicate_scan' error; wrong product returns 'barcode_not_found'."
  - "Rack capacity warning is soft (warns but does not hard-block) — warehouse flexibility takes priority."
  - "Rack assignment priority: (1) existing rack holding same product+batch, (2) nearest with capacity in designated zone, (3) manual override."
  - "Telegram alerts for GRN events are async-only via notification_queue — never synchronous."
  - "Every stock-affecting action calls the Phase 1 audit service (AuditLog hash-chain writer)."
  - "RBAC is enforced via require_role() FastAPI dependency on every endpoint."
  - "audit_log rows cannot be UPDATEd or DELETEd even by the application DB role."
scope_fence:
  include:
    - Supplier CRUD
    - Product CRUD (including barcode logic)
    - Warehouse + Rack CRUD
    - Purchase Order draft → approval workflow
    - GRN gate entry → OCR ingestion → field confirmation → item scanning → completion
    - Batch + expiry management
    - Item barcode creation (manufacturer + system-generated)
    - Stock ledger live updates per scan
    - Rack suggestion engine
    - All Phase 2 Alembic migrations
    - All Phase 2 automated tests (happy path + rejection paths)
  exclude:
    - Dispatch / Stock Out (Phase 3)
    - PWA frontend (Phase 4)
    - Telegram worker (Phase 5)
    - Write-offs, returns, cycle counts (Phase 3)
    - Reports/dashboards (Phase 5)
success_criteria:
  - "A full GRN can be created, scanned, and completed end-to-end against a test PO."
  - "Correct stock_ledger updates for every accepted scan."
  - "Audit_log entry written for every stock-affecting action."
  - "Duplicate scan and wrong-product scan both correctly rejected."
  - "GRN with quantity mismatch correctly blocked/flagged without Manager override."
  - "All endpoints enforce the RBAC matrix from 09_RBAC_SECURITY.md."
---

# Phase 02 Context — Inbound & Stock In

**Source:** PRD Express Path from `04_MODULE_INBOUND_STOCKIN.md`, `02_DATABASE_SCHEMA.md`, `03_API_SPECIFICATION.md`, `09_RBAC_SECURITY.md`

## Domain

Inbound logistics — the full journey of stock from supplier PO creation through truck arrival, OCR-based invoice ingestion, item-level barcode scanning, rack assignment, and GRN completion into the live stock ledger.

## Architecture Decisions (Locked)

All decisions derive from the PRD build kit. The Phase 1 audit service and RBAC middleware already exist and must be used, not reimplemented.

## RBAC Map for Phase 2 Endpoints

| Action | Owner | Manager | Staff | Purchase |
|---|:---:|:---:|:---:|:---:|
| Create/edit products | ✅ | ✅ | ❌ | ❌ |
| Create supplier | ✅ | ❌ | ❌ | ✅ |
| Draft PO | ✅ | ❌ | ❌ | ✅ |
| Approve/reject PO | ✅ | ✅ | ❌ | ❌ |
| Gate entry / start GRN | ✅ | ✅ | ✅ | ❌ |
| Scan Stock In items | ✅ | ✅ | ✅ | ❌ |
| Confirm OCR/batch fields | ✅ | ✅ | ❌ | ❌ |
| Complete/close GRN | ✅ | ✅ | ❌ | ❌ |
| Create rack | ✅ | ✅ | ❌ | ❌ |
