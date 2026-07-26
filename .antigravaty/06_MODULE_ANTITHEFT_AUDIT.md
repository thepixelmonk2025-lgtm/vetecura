# Module: Anti-Theft, Immutable Audit & Anomaly Detection

**Module Code:** `AUDIT`
**Depends on:** `02_DATABASE_SCHEMA.md` (`audit_log`, `damage_writeoffs`, `returns`, `cycle_counts`)
**Consumed by:** every module that touches stock (Stock In, Dispatch, Write-offs, Returns, Cycle Counts)

---

## 1. Purpose

This is the backbone of Vetecura's core promise to the business: no unit moves without a scan, no scan happens without a permanent record, and no record can ever be silently altered or deleted.

## 2. Immutable Audit Ledger — How It Works

Every stock-affecting action writes one row to `audit_log`, synchronously, inside the same database transaction as the business action itself (never queued, never async — if the audit write fails, the whole action rolls back).

**Hash chain construction:**
```
row_hash = SHA256( prev_hash + action + entity_type + entity_id + payload_json + created_at )
```
Each new row includes the previous row's hash, forming an unbroken chain. If any historical row is altered, its hash no longer matches what the next row references — tampering becomes mathematically detectable, not just policy-forbidden.

**Database-level enforcement (not just app-level):**
```sql
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
-- Only a superuser/migration role can ever touch this table, and never should in normal operation.
```

**Chain verification:** `GET /audit-logs/verify-chain` walks the entire table, recomputing each hash and confirming it matches the stored value and the next row's `prev_hash`. Owner-only, run periodically (e.g. monthly) or on demand if tampering is suspected.

## 3. What Gets Logged

| Action | Trigger |
|---|---|
| `stock_in_scan` | Every accepted scan during GRN |
| `stock_out_scan` | Every accepted scan during dispatch |
| `po_approved` / `po_rejected` | Purchase order approval decisions |
| `writeoff_requested` / `writeoff_approved` / `writeoff_rejected` | Damage/wastage workflow |
| `return_logged` / `return_inspected` | Returns workflow |
| `cycle_count_variance_recorded` | Cycle count discrepancies |
| `dispatch_force_closed` | Manager override of a scan-count mismatch |
| `label_reprinted` | Any barcode reprint |
| `user_role_changed` | RBAC changes by Owner |
| `manual_stock_adjustment` | Any non-scan-driven stock change (should be rare and always logged loudly) |

## 4. Anomaly Detection Engine

Runs as a background service, evaluating scan and action patterns against configurable thresholds. Not AI/ML in v1 — rule-based and transparent, so Vetecura's team understands exactly why an alert fired (a black-box model would undermine trust in an anti-theft feature).

| Rule | Threshold (default, configurable) | Alert Routed To |
|---|---|---|
| Repeated wrong-product/duplicate scans by one user in one session | ≥ 3 in 10 minutes | Security & Audit |
| Dispatch scan activity outside configured business hours | Any scan outside 7am–9pm (configurable) | Security & Audit |
| Abnormally high single-dispatch quantity vs. that product's rolling average | > 3x rolling 30-day average | Security & Audit + Manager review |
| High reprint frequency on the same barcode | ≥ 3 reprints in 7 days | Inventory Alerts |
| Force-closed dispatch with mismatch | Every occurrence | Security & Audit (immediate, no threshold) |
| Write-off request frequency by one user | ≥ 5 requests in 24 hours | Security & Audit |

Thresholds live in a config table, editable by Owner only — not hardcoded, since "normal" volume varies by warehouse size and will need tuning after go-live.

## 5. Write-off Workflow (Detail)

1. Staff or Manager requests a write-off: selects `item_barcode_id`, reason (damaged / expired / quality_issue / other), **mandatory photo proof**.
2. Request sits `pending` — stock remains in the normal ledger, **not yet removed**, until approved (prevents pre-approval "disappearance" of stock).
3. Manager or Owner reviews photo + reason, approves or rejects.
4. On approval: stock is moved (not deleted) from its current rack to the designated Damage Warehouse rack — auditable, reversible if needed, never a silent decrement.
5. Rejected requests remain fully visible in the audit trail — a pattern of rejected write-off requests from one user is itself a signal worth surfacing to Owner.

## 6. Returns Workflow (Detail)

1. Return logged (customer or supplier), linked to originating order.
2. Manager inspects physical condition: `good`, `damaged`, `expired`.
3. Routing is condition-based, not automatic:
   - `good` → routed back to available stock rack, re-enters normal ledger
   - `damaged` / `expired` → routed to Damage Warehouse, auto-creates a linked write-off record for consistency
4. Every return is scanned on arrival — same mandatory-scan principle as Stock In.

## 7. Cycle Counting (Detail)

1. Manager schedules a cycle count for a specific rack (or the system suggests racks overdue for count, based on a configurable interval — e.g. every 30 days).
2. Staff physically scans every unit on that rack.
3. System compares scanned quantity vs. `stock_ledger` quantity per product+batch.
4. Any variance is recorded in `cycle_count_variances` — **never auto-corrects the ledger silently**. A variance triggers a review step where Manager confirms the adjustment, which itself is logged as a `manual_stock_adjustment` audit entry with the cycle count as its justification.

## 8. Business Rules Summary

- No stock quantity ever changes without either a scan event or an approved, reasoned override — every override is logged with who, why, and when.
- Photo proof is mandatory for write-offs — text reason alone is not sufficient for approval.
- Rejected/pending requests are never hidden from the audit trail, even though they didn't result in a stock change — the attempt itself is data.
- Anomaly thresholds are configurable, not hardcoded, and every threshold change is itself an audited action.

## 9. API Endpoints (recap, full detail in `03_API_SPECIFICATION.md`)

`POST /writeoffs`, `POST /writeoffs/{id}/approve`, `POST /returns`, `POST /returns/{id}/inspect`, `POST /cycle-counts`, `POST /cycle-counts/{id}/complete`, `GET /audit-logs`, `GET /audit-logs/verify-chain`.

## 10. Definition of Done

- [ ] Audit log confirmed append-only at the DB role level (UPDATE/DELETE attempts fail even for an app-level admin account)
- [ ] Hash chain verification endpoint successfully detects a manually tampered row in a test scenario
- [ ] All 6 anomaly rules fire correctly against seeded test data
- [ ] Write-off cannot reach `approved` status without a photo proof URL present
- [ ] Cycle count variance never auto-adjusts `stock_ledger` without an explicit Manager confirmation step
