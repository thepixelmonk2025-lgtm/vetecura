# Module: Outbound Logistics & Dispatch (Stock Out)

## 1. Purpose

Guarantee that stock leaving the warehouse is scanned unit-by-unit, matches the order exactly, and cannot be completed short or over without detection.

## 2. Functional Flow

1. **Sales Order Creation** — Manager/Owner creates a sales order (manual entry or future API ingestion from Amazon/B2B channel).
2. **Pick List Generation** — System generates an optimized pick list: groups items by rack proximity to minimize walking distance, assigns to a Staff member.
3. **Guided Picking** — PWA guides Staff to each rack location in optimized sequence, shows expected product/batch/quantity at each stop.
4. **Item-Level Scanning** — Every unit is scanned as it's picked. Each scan:
   - Validates the barcode matches an expected line item on this order
   - Rejects wrong-product or wrong-batch scans in real time
   - Rejects duplicate scans within the same dispatch session
   - Increments `dispatches.scanned_count`
5. **Packing Count Verification** — Hard lock: `/dispatches/{id}/complete` returns HTTP 409 if `scanned_count != expected_count`. No override available to Staff role — only Manager can force-close with a logged reason (rare, audited exception).
6. **Automated Stock Deduction** — On successful completion, `stock_ledger` is decremented per product+batch+rack, `audit_log` entry written, Telegram "Stock Out" alert fires.

## 3. Business Rules

- A dispatch cannot begin scanning until its pick list is `assigned`.
- FEFO (First-Expiry-First-Out) is the default picking priority when multiple batches of the same product exist — the pick list should suggest the batch expiring soonest.
- Staff cannot manually type a quantity to "complete" a dispatch — quantity is always derived from scan count, never manual entry.
- If a Manager force-closes a mismatched dispatch, the reason is mandatory and the event is flagged in the Security & Audit Telegram topic, not just logged silently.

## 4. Validation & Error Blocking

| Scan Result | System Response |
|---|---|
| Correct product, correct order | Accepted, count incremented |
| Correct product, wrong batch (when FEFO matters) | Warning shown, allowed with confirmation (unless business rule set to hard-block) |
| Wrong product entirely | Rejected, error shown, no count change |
| Barcode already scanned in this dispatch | Rejected as duplicate |
| Barcode not recognized at all | Rejected, flagged for Manager review |

## 5. Edge Cases to Handle

| Scenario | Expected Behavior |
|---|---|
| Order partially available (stock shortfall) | Pick list shows shortfall clearly; dispatch can proceed for available portion, remainder flagged as backorder |
| Staff needs to substitute a batch mid-pick | Requires re-scan against updated expected batch, logged as substitution in audit trail |
| Dispatch abandoned mid-scan | Session persists (not lost); can resume; if truly cancelled, all partial scans are rolled back and logged |
| Multiple staff picking the same order | Not allowed by default — one pick list = one assigned staff member, to keep accountability clear |

## 6. UI Requirements (Warehouse PWA)

- Step-by-step guided picking screen: "Go to Rack B-12 → Scan 3 units of Vitamin D3 Softgel (Batch VD-2207)"
- Real-time progress bar per order: "117 / 120 scanned"
- Complete button disabled/grayed until scanned count equals expected count
- Clear visual/audio distinction for accepted vs. rejected scans (same pattern as Stock In, for consistency)

## 7. Telegram Alert Triggers

- Dispatch completed successfully → Stock Out / Dispatch topic, includes product, batch, quantity, destination
- Dispatch force-closed with mismatch by Manager → Security & Audit topic (high priority)
- Repeated wrong-product/duplicate scan attempts by the same user in one session → routed to anomaly detection (see `06_MODULE_ANTITHEFT_AUDIT.md`)
