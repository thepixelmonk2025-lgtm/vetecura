---
phase: 03
plan: 01
subsystem: dispatch-anti-theft
tags: [dispatch, pick-list, fefo, write-off, returns, cycle-count, anomaly-detection, anti-theft, audit]
requires: [01-core-engine-data-infrastructure, 02-inbound-stock-in]
provides: [dispatch-workflow, write-off-workflow, returns-workflow, cycle-count-workflow, anomaly-engine]
affects: [stock_ledger, scan_events, audit_log, dispatches, damage_writeoffs, returns, cycle_counts]
key-decisions:
  - "Dispatch complete is hard-blocked at HTTP 409 if scanned_count != expected_count. Only Manager can force-close."
  - "FEFO (First-Expiry-First-Out) is default picking priority across all batches of same product."
  - "Write-off requires mandatory photo_proof_url — cannot be approved without it."
  - "Stock is not removed from ledger until write-off is APPROVED (not on request)."
  - "Cycle count NEVER auto-corrects stock_ledger. Variance requires Manager confirmation, logged as manual_stock_adjustment."
  - "Anomaly rules are threshold-based (not ML), thresholds stored in DB config table (Owner-editable)."
  - "Every stock-affecting action calls audit_log synchronously inside the same transaction."
  - "Returns: good condition → back to available stock. damaged/expired → Damage Warehouse rack."
requirements: [OUTBOUND-01, OUTBOUND-02, OUTBOUND-03, OUTBOUND-04]
wave_count: 4
---

# Phase 03 Plan 01: Dispatch & Anti-Theft Guardrails

## Overview

Build the complete outbound logistics flow (Sales Order → Pick List → item-level scanning → dispatch completion with hard-block) plus the anti-theft module: write-offs, returns, cycle counting, and rule-based anomaly detection engine.

**Deliverable:** A dispatch cannot complete with a scan-count mismatch except via an explicitly logged Manager force-close. Anomaly rules fire correctly against test scenarios. Write-off cannot be approved without photo proof.

---

## Wave 1: Domain Models (New Tables for Phase 3)

### Task 1.1 — SQLAlchemy Models: Sales Orders, Pick Lists, Dispatches

**Files to create:**
- `src/models/dispatch.py`

```python
# SalesOrder, SalesOrderItem
# PickList
# Dispatch
# All enums: SalesOrderStatusEnum, PickListStatusEnum, DispatchStatusEnum

# SalesOrderStatusEnum: pending, picking, ready, dispatched, cancelled
# PickListStatusEnum: assigned, in_progress, completed
# DispatchStatusEnum: in_progress, completed, blocked
```

**Verification:**
- [ ] All 4 models importable
- [ ] FKs: SalesOrder→SalesOrderItem, SalesOrder→PickList→Dispatch

---

### Task 1.2 — SQLAlchemy Models: Write-offs, Returns, Cycle Counts

**Files to create:**
- `src/models/antitheft.py`

```python
# DamageWriteoff: item_barcode_id, reason, photo_proof_url (NOT NULL), requested_by, approved_by, status (pending/approved/rejected)
# Return: return_type (customer/supplier), item_barcode_id, condition (good/damaged/expired), routed_to_rack_id
# CycleCount: rack_id, scheduled_date, status, performed_by
# CycleCountVariance: cycle_count_id, product_id, batch_id, system_qty, counted_qty
#   variance = counted_qty - system_qty (computed)
```

**Verification:**
- [ ] `photo_proof_url` is `NOT NULL` at DB model level (nullable=False)
- [ ] `CycleCountVariance` has `system_qty` and `counted_qty` both stored

---

### Task 1.3 — Anomaly Config Table

**File to create/update:**
- `src/models/config.py` — `AnomalyConfig` table

```python
# AnomalyConfig:
#   id UUID
#   rule_name VARCHAR(60) UNIQUE NOT NULL  -- e.g. 'repeated_wrong_scans'
#   threshold_value NUMERIC(10,2) NOT NULL
#   window_minutes INT                      -- time window for rate-based rules
#   is_active BOOLEAN DEFAULT TRUE
#   updated_by UUID → users(id)
#   updated_at TIMESTAMPTZ
#
# Default seed rows (inserted at app startup or via migration):
#   repeated_wrong_scans: threshold=3, window_minutes=10
#   scan_outside_hours: threshold=1, window_minutes=NULL (any occurrence)
#   high_dispatch_quantity: threshold=3.0 (multiplier), window_minutes=43200 (30 days)
#   high_reprint_frequency: threshold=3, window_minutes=10080 (7 days)
#   writeoff_request_frequency: threshold=5, window_minutes=1440 (24 hours)
```

**Verification:**
- [ ] AnomalyConfig model created with correct fields
- [ ] Seeding function `src/core/anomaly_seed.py` inserts defaults if table is empty

---

## Wave 2: Dispatch & Pick List API

### Task 2.1 — Sales Order API + FEFO Pick List Generation

**File:** `src/api/routers/dispatch.py`

**Endpoints (from 03_API_SPECIFICATION.md §7):**
- `POST /sales-orders` → create sales order + items  [Manager, Owner]
- `POST /pick-lists/{sales_order_id}/generate` → generate FEFO-optimized pick list  [Manager, Owner]
- `GET  /pick-lists/{id}` → pick list detail with rack routing  [Staff, Manager]

**FEFO Pick List Generation logic (`src/core/pick_list.py`):**
```python
async def generate_pick_list(sales_order_id, assigned_to, db) -> PickList:
    """
    For each line item in the sales order:
    1. Query stock_ledger for product, ordered by batch.expiry_date ASC (FEFO)
    2. Assign earliest-expiring batch first until ordered_qty is satisfied
    3. If total available < ordered_qty: flag shortfall in pick list, proceed for available portion
    4. Group picks by rack_id (minimize walking), sort by rack.code (proximity heuristic)
    5. Create PickList + sub-items referencing specific product+batch+rack+qty
    """
```

**Schemas (`src/schemas/dispatch.py`):**
- `SalesOrderCreate`: order_reference, customer_name, items: list[{product_id, ordered_qty}]
- `PickListOut`: id, sales_order_id, assigned_to, status, items: list[PickListItemOut]
- `PickListItemOut`: rack_code, product_name, batch_number, expiry_date, qty_to_pick

**Verification:**
- [ ] When 2 batches of same product exist, FEFO: earlier expiry is assigned first
- [ ] Shortfall (stock < ordered qty): pick list created with flagged shortfall, not blocked
- [ ] Staff cannot generate pick list (403)

---

### Task 2.2 — Dispatch Scan API (Hard-Block Completion)

**Endpoints:**
- `POST /dispatches/{id}/scan-item` → scan one item during picking  [Staff, Manager, Owner]
- `GET  /dispatches/{id}/status`    → scanned vs. expected count    [Staff, Manager]
- `POST /dispatches/{id}/complete`  → finalize (hard-blocked if mismatch)  [Staff, Manager, Owner]

**Scan validation (mirrors GRN scan — same logic, different event_type):**
1. Dispatch must be `in_progress`
2. Barcode must exist in `item_barcodes`
3. Check for duplicate scan in this dispatch session
4. Validate product belongs to this sales order
5. Atomic write: `scan_events` (event_type=`stock_out`) + increment `dispatches.scanned_count` + `audit_log`

**Complete endpoint:**
```
scanned_count == expected_count:
  → status = 'completed'
  → DECREMENT stock_ledger (product+batch+rack) per scan_event for this dispatch
  → audit_log: action='stock_out_scan' (already written per-scan) + 'dispatch_completed'
  → NotificationService.enqueue('stock_out', message)

scanned_count != expected_count AND force_close=False:
  → HTTP 409 count_mismatch (Staff gets this, cannot override)

scanned_count != expected_count AND force_close=True AND role in [Manager, Owner]:
  → status = 'completed' with discrepancy noted
  → audit_log: action='dispatch_force_closed', payload includes reason
  → NotificationService.enqueue('security_audit', ...)  ← high priority channel
```

**Verification:**
- [ ] Staff calling complete with mismatch gets 409
- [ ] Staff calling complete with force_close=True gets 403 (role not allowed to force-close)
- [ ] Manager force-close with reason → completes, both stock_out AND security_audit topics alerted
- [ ] stock_ledger decremented only on completed dispatch, not per-scan

---

## Wave 3: Anti-Theft Module (Write-offs, Returns, Cycle Counts, Anomaly Engine)

### Task 3.1 — Write-off Workflow

**File:** `src/api/routers/writeoffs.py`

**Endpoints:**
- `POST /writeoffs`              → request write-off (photo_proof_url required in body)  [Staff, Manager, Owner]
- `POST /writeoffs/{id}/approve` → approve → moves stock to Damage Warehouse              [Manager, Owner]
- `POST /writeoffs/{id}/reject`  → reject with reason                                     [Manager, Owner]

**Business rules enforced:**
- `photo_proof_url` is required at request time (422 if missing/empty)
- Stock remains in normal ledger until `approved` — NOT removed on request
- On approval:
  - Find the Damage Warehouse rack (`warehouses.is_damage_warehouse = TRUE`)
  - Decrement `stock_ledger` from current rack
  - Increment `stock_ledger` on damage warehouse rack
  - Write `audit_log`: action=`writeoff_approved`
  - Write `scan_events`: event_type=`writeoff_out`
- On rejection:
  - Write `audit_log`: action=`writeoff_rejected` (rejection stays visible in audit trail)

**Schemas:**
- `WriteoffCreate`: item_barcode_id, reason (enum: damaged/expired/quality_issue/other), photo_proof_url (required, non-empty)
- `WriteoffOut`: all fields + status
- `WriteoffApproveBody`: optional notes

**Verification:**
- [ ] Request without photo_proof_url returns 422
- [ ] Stock not decremented on request, only on approval
- [ ] Rejected write-off appears in audit_log
- [ ] Approved write-off moves stock to damage warehouse (stock_ledger changes verified)

---

### Task 3.2 — Returns Workflow

**File:** `src/api/routers/returns.py`

**Endpoints:**
- `POST /returns`              → log return (customer or supplier)  [Staff, Manager, Owner]
- `POST /returns/{id}/inspect` → record condition + route to rack   [Manager, Owner]

**Routing logic on inspect:**
```
condition == 'good':
  → route back to available stock rack (original rack if identifiable, else suggest via rack_suggestion)
  → INCREMENT stock_ledger on target rack
  → scan_events: event_type='return_in'

condition in ['damaged', 'expired']:
  → route to Damage Warehouse rack
  → INCREMENT stock_ledger on damage warehouse rack
  → auto-create DamageWriteoff record (status='pending', reason matches condition)
  → scan_events: event_type='return_in'
```

**Schemas:**
- `ReturnCreate`: return_type (customer/supplier), item_barcode_id, reference_order_id (optional)
- `ReturnInspect`: condition (good/damaged/expired), routed_to_rack_id
- `ReturnOut`: all fields

**Verification:**
- [ ] Good return → stock_ledger incremented on target rack
- [ ] Damaged return → routed to damage warehouse + DamageWriteoff auto-created
- [ ] Every return writes scan_events row (event_type=return_in)
- [ ] Staff cannot inspect/route a return (403)

---

### Task 3.3 — Cycle Count Workflow

**File:** `src/api/routers/cycle_counts.py`

**Endpoints:**
- `POST /cycle-counts`                   → schedule count for a rack          [Manager, Owner]
- `POST /cycle-counts/{id}/scan-item`    → log physical count scan             [Staff, Manager]
- `POST /cycle-counts/{id}/complete`     → finalize, generate variance report  [Manager, Owner]

**Variance logic (complete endpoint):**
```python
for each product+batch on this rack (from stock_ledger):
    system_qty = stock_ledger.quantity
    counted_qty = count of scan_events WHERE reference_id=cycle_count_id AND barcode matches product+batch

    variance = counted_qty - system_qty
    if variance != 0:
        create CycleCountVariance row
        # DO NOT update stock_ledger — human confirmation required

# Return variance report to Manager
# Manager must then explicitly call: POST /cycle-counts/{id}/confirm-variance
# which:
#   - Updates stock_ledger to counted_qty (the adjustment)
#   - Writes audit_log: action='manual_stock_adjustment', payload={justification: cycle_count_id}
```

**Verification:**
- [ ] Cycle count does NOT auto-correct stock_ledger on complete
- [ ] Variance > 0 creates CycleCountVariance row
- [ ] Confirming variance writes manual_stock_adjustment to audit_log
- [ ] Staff cannot schedule or confirm variance (403)

---

### Task 3.4 — Anomaly Detection Engine

**File:** `src/core/anomaly_engine.py`

```python
class AnomalyEngine:
    """
    Rule-based anomaly detector. Called after relevant events.
    Thresholds are fetched from AnomalyConfig table (not hardcoded).
    All rules fire NotificationService.enqueue('security_audit', ...) when triggered.
    """

    async def check_repeated_wrong_scans(self, user_id, session_id, db):
        """Rule: ≥3 wrong/duplicate scan errors by one user in 10 minutes → alert"""

    async def check_scan_outside_hours(self, scan_event, db):
        """Rule: any scan outside 7am–9pm → alert"""

    async def check_high_dispatch_quantity(self, dispatch_id, product_id, qty, db):
        """Rule: dispatch qty > 3x rolling 30-day average for that product → alert"""

    async def check_high_reprint_frequency(self, barcode_value, db):
        """Rule: ≥3 reprints of same barcode in 7 days → alert to inventory_alerts"""

    async def check_writeoff_frequency(self, user_id, db):
        """Rule: ≥5 write-off requests by same user in 24 hours → alert"""

    async def check_force_closed_dispatch(self, dispatch_id, user_id, db):
        """Rule: every force-close fires immediately (no threshold) → security_audit"""
```

Integration points:
- Called from `grn.py` scan-item: `check_repeated_wrong_scans` on 409 errors
- Called from `dispatch.py` complete: `check_force_closed_dispatch`, `check_high_dispatch_quantity`
- Called from `writeoffs.py` create: `check_writeoff_frequency`
- Called from `grn.py` generate-label: `check_high_reprint_frequency`
- Called from scan endpoints: `check_scan_outside_hours`

**Verification:**
- [ ] `check_repeated_wrong_scans` fires after 3rd rejection in window
- [ ] `check_scan_outside_hours` fires for a scan timestamped at 3am
- [ ] `check_force_closed_dispatch` fires on every force-close (no threshold needed)
- [ ] Thresholds read from DB, not hardcoded in code

---

## Wave 4: Tests

### Task 4.1 — Dispatch Tests

**File:** `tests/test_dispatch.py`

- `test_pick_list_fefo_ordering`: 2 batches → earlier expiry assigned first
- `test_dispatch_scan_accepted`: valid scan → scanned_count incremented
- `test_dispatch_scan_duplicate_rejected`: same barcode twice → 409 duplicate_scan
- `test_dispatch_complete_match`: scan all expected → completes, stock_ledger decremented
- `test_dispatch_complete_mismatch_no_force`: short scan → 409 count_mismatch
- `test_dispatch_staff_cannot_force_close`: staff calls force_close=True → 403
- `test_dispatch_manager_force_close`: manager force-close with reason → completes + security_audit alerted

---

### Task 4.2 — Anti-Theft Tests

**File:** `tests/test_antitheft.py`

- `test_writeoff_request_without_photo_rejected`: no photo_proof_url → 422
- `test_writeoff_stock_not_decremented_on_request`: stock unchanged after request
- `test_writeoff_approval_moves_to_damage_warehouse`: approve → stock moves
- `test_writeoff_rejection_in_audit_log`: rejection logged even though no stock change
- `test_return_good_condition_back_to_stock`: good return → stock_ledger +1 on rack
- `test_return_damaged_auto_creates_writeoff`: damaged return → DamageWriteoff created
- `test_cycle_count_no_auto_correction`: complete without confirm → stock_ledger unchanged
- `test_cycle_count_confirm_variance_adjusts_ledger`: confirm → stock_ledger updated + audit written
- `test_anomaly_repeated_wrong_scans_fires`: 3 rejections in window → security_audit enqueued
- `test_anomaly_force_close_fires_immediately`: force-close → security_audit enqueued (no threshold)

---

## Completion Checklist

- [ ] All models created and importable
- [ ] AnomalyConfig seed data inserted
- [ ] FEFO pick list generation tested
- [ ] Dispatch hard-block verified (Staff cannot force-close)
- [ ] Write-off cannot be approved without photo_proof_url
- [ ] Stock not decremented until write-off approved
- [ ] Cycle count never auto-corrects stock_ledger
- [ ] All 6 anomaly rules have corresponding tests
- [ ] Every stock-affecting action writes audit_log in same transaction
- [ ] All 17 Phase 3 tests pass
