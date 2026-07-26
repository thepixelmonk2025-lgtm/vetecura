# Module: Reports & Analytics

**Module Code:** `REPORTS`
**Depends on:** `stock_ledger`, `scan_events`, `audit_log`, `batches`, `suppliers`

---

## 1. Purpose

Turn the raw scan/audit data every other module generates into decision-ready views — split cleanly between what staff need daily (Operational) and what needs to survive a compliance review (Compliance), per the original proposal's structure.

## 2. Report Catalog

### 2.1 Operational Reports

| Report | Description | Default Filters |
|---|---|---|
| Current Stock | Live stock by product, batch, rack | Warehouse, category, low-stock-only toggle |
| Stock Movement | In/out transaction history over a date range | Date range, product, movement type |
| Low Stock | Products below `reorder_level` | Category, supplier |
| Warehouse-wise Stock (Heatmap) | Visual rack occupancy — which racks are full/near-full | Warehouse |

### 2.2 Compliance Reports

| Report | Description | Default Filters |
|---|---|---|
| Batch-wise Report | Full batch traceability: received qty, dispatched qty, remaining, linked GRN/dispatch IDs | Product, batch, date range |
| Expiry Risk Report | Batches ranked by risk score (see formula below), not just a flat expiry-date list | Risk level, warehouse |
| Audit Report | Exportable extract of `audit_log` for a given entity/date range — built for handing to an auditor or client, not raw dev-facing log dump | Date range, action type, actor |
| Vendor Performance | On-time delivery %, rejection rate, price trend per supplier | Supplier, date range |

## 3. Expiry Risk Scoring (Smart Feature)

Rather than a flat "expires in N days" list, batches are ranked so the team sees what actually needs attention first:

```
risk_score = (1 / days_to_expiry) × current_stock_quantity × category_weight
```

- `days_to_expiry` — shorter window = higher urgency
- `current_stock_quantity` — 5 units expiring soon matters less than 500
- `category_weight` — configurable per product category (e.g. pharma/wellness products default higher weight than general goods)

Output is a ranked list (highest risk first), not a chronological one — this is the single biggest practical upgrade over a standard "expiry report."

## 4. Demand Forecasting (Smart Feature, Phase 5 stretch goal)

Simple moving-average model over `scan_events` (`event_type = 'stock_out'`) per product:

```
suggested_reorder_qty = (avg_daily_dispatch_qty_last_30_days × lead_time_days) − current_stock
```

Surfaced on the Low Stock report as a "Suggested Reorder Qty" column, and optionally pre-fills a draft PO. Framed to the client as a v1.1 enhancement if timeline is tight — logic is simple enough to ship in Phase 5 if capacity allows, but doesn't block go-live.

## 5. Dashboard (Role-Specific Views)

| Role | Dashboard Focus |
|---|---|
| Owner | Business-level KPIs: total stock value, dispatch volume trend, top low-stock alerts, vendor performance summary, anomaly count this week |
| Warehouse Manager | Operational KPIs: today's GRNs/dispatches in progress, pending write-off approvals, rack occupancy heatmap, cycle counts due |
| Warehouse Staff | Task-focused: assigned pick lists, active GRN scan sessions, nothing else — deliberately minimal |
| Purchase Team | Pending PO approvals, low-stock items needing reorder, supplier price trend snapshots |

This role-specific dashboard split is itself a UI/UX requirement — see `13_UI_UX_GUIDELINES.md` for layout principles.

## 6. API Specification

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/reports/current-stock` | Live stock view | All |
| GET | `/reports/stock-movement` | Movement history | Manager, Owner |
| GET | `/reports/low-stock` | Below-reorder products + suggested reorder qty | Manager, Owner, Purchase |
| GET | `/reports/warehouse-heatmap` | Rack occupancy data | Manager, Owner |
| GET | `/reports/batch-wise` | Batch traceability | Manager, Owner |
| GET | `/reports/expiry-risk` | Risk-ranked expiry list | Manager, Owner |
| GET | `/reports/audit-extract` | Compliance-ready audit export | Owner |
| GET | `/reports/vendor-performance` | Supplier scorecards | Purchase, Owner |
| GET | `/reports/export/{report_name}` | Export any report as CSV/PDF | Manager, Owner (matches report's own role restriction) |
| GET | `/dashboard/{role}` | Role-specific dashboard payload | Matches role |

## 7. Export Requirements

- Every report supports CSV export (for Excel-comfortable users) and PDF export (for sharing/printing/compliance handoff).
- PDF exports include a header with report name, date range, generated-by user, and generation timestamp — necessary for anything that might be shown to an external auditor or client.
- Large exports (e.g. full year of stock movement) run as a background job with a download-ready notification, not a blocking request.

## 8. Performance Considerations

- `current-stock` and dashboard endpoints must respond in < 500ms even with 50,000+ SKUs — pre-aggregate via materialized views refreshed on a schedule (e.g. every 5 minutes) rather than computing live on every request.
- Heavy compliance reports (full audit extracts, year-long batch reports) are async/background jobs, never synchronous request-response.

## 9. Definition of Done

- [ ] All 8 report types return correct data against seeded test scenarios
- [ ] Expiry risk scoring correctly reorders a test set by computed risk, not raw date
- [ ] Role-specific dashboards confirmed to show only the intended KPIs per role
- [ ] CSV and PDF export tested for at least one Operational and one Compliance report
- [ ] Dashboard load time confirmed under 500ms with a realistically sized seeded dataset
