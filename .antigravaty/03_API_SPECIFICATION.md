# API Specification — Vetecura IMS

Base URL: `/api/v1`
Auth: Bearer JWT on every route except `/auth/login` and `/auth/refresh`.
All list endpoints support `?page=&limit=` pagination.

## 1. Auth

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/auth/login` | Email + password → access + refresh token | Public |
| POST | `/auth/refresh` | Refresh token → new access token | Public (valid refresh token) |
| POST | `/auth/logout` | Revoke refresh token | Authenticated |
| GET | `/auth/me` | Current user profile + role | Authenticated |

## 2. Users

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/users` | List users | Owner |
| POST | `/users` | Create user | Owner |
| PATCH | `/users/{id}` | Update role/status | Owner |
| DELETE | `/users/{id}` | Deactivate user (soft delete) | Owner |

## 3. Products & Suppliers

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/products` | List/search products | All |
| POST | `/products` | Create product | Manager, Owner |
| PATCH | `/products/{id}` | Update product | Manager, Owner |
| GET | `/suppliers` | List suppliers | Purchase, Manager, Owner |
| POST | `/suppliers` | Create supplier | Purchase, Owner |
| GET | `/suppliers/{id}/performance` | Vendor performance metrics | Purchase, Manager, Owner |
| GET | `/suppliers/{id}/price-history` | Price history for a product | Purchase, Owner |

## 4. Purchase Orders

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/purchase-orders` | List POs (filter by status) | Purchase, Manager, Owner |
| POST | `/purchase-orders` | Draft a new PO | Purchase Team |
| POST | `/purchase-orders/{id}/submit` | Submit for approval | Purchase Team |
| POST | `/purchase-orders/{id}/approve` | Approve PO | Manager, Owner |
| POST | `/purchase-orders/{id}/reject` | Reject PO with reason | Manager, Owner |
| GET | `/purchase-orders/{id}` | PO detail with line items | Purchase, Manager, Owner |

## 5. Goods Receipt (GRN) / Stock In

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/grn/gate-entry` | Log truck arrival, init pending GRN | Staff, Manager |
| POST | `/grn/{id}/ocr-invoice` | Upload invoice, trigger OCR extraction | Staff, Manager |
| GET | `/grn/{id}/ocr-review` | Return OCR-extracted fields for human confirmation | Staff, Manager |
| POST | `/grn/{id}/confirm-fields` | Confirm/edit OCR fields, commit batch/expiry data | Manager |
| POST | `/grn/{id}/scan-item` | Register one scanned unit (barcode + rack) | Staff |
| POST | `/grn/{id}/generate-label` | Generate + print internal barcode for unlabeled unit | Staff |
| POST | `/grn/{id}/complete` | Finalize GRN, reconcile scanned vs. ordered qty | Manager |
| GET | `/grn/{id}` | GRN detail with scan progress | Staff, Manager, Owner |

**Scan-item request body:**
```json
{
  "barcode_value": "VET-VD2207-000123",
  "rack_id": "uuid",
  "batch_id": "uuid"
}
```
**Response on mismatch (duplicate/wrong product):**
```json
{ "error": "duplicate_scan", "message": "This barcode was already scanned in this GRN session." }
```

## 6. Racks

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/racks` | List racks with live occupancy | All |
| GET | `/racks/heatmap` | Occupancy heatmap data | Manager, Owner |
| POST | `/racks` | Create rack, generate rack QR label | Manager, Owner |

## 7. Dispatch / Pick List / Stock Out

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/sales-orders` | Create sales order (manual or API-ingested) | Manager, Owner |
| POST | `/pick-lists/{sales_order_id}/generate` | Generate optimized pick list | Manager |
| GET | `/pick-lists/{id}` | Pick list detail with rack routing | Staff, Manager |
| POST | `/dispatches/{id}/scan-item` | Scan one item during picking/packing | Staff |
| GET | `/dispatches/{id}/status` | Scanned count vs expected count | Staff, Manager |
| POST | `/dispatches/{id}/complete` | Finalize dispatch (blocked unless scanned = expected) | Staff |

**Complete endpoint validation logic:**
- If `scanned_count != expected_count` → HTTP 409, dispatch blocked
- On success → triggers `stock_ledger` deduction + `audit_log` entry + Telegram alert

## 8. Anti-Theft: Write-offs, Returns, Cycle Counts

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/writeoffs` | Request write-off (requires photo proof + reason) | Staff, Manager |
| POST | `/writeoffs/{id}/approve` | Approve → moves stock to Damage Warehouse | Manager, Owner |
| POST | `/writeoffs/{id}/reject` | Reject request | Manager, Owner |
| POST | `/returns` | Log a customer or supplier return | Staff, Manager |
| POST | `/returns/{id}/inspect` | Record condition, route to Available Stock or Damage Warehouse | Manager |
| POST | `/cycle-counts` | Schedule a cycle count for a rack | Manager |
| POST | `/cycle-counts/{id}/scan-item` | Log a physical count scan | Staff |
| POST | `/cycle-counts/{id}/complete` | Finalize, generate variance report | Manager |

## 9. Audit Log

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/audit-logs` | Query audit trail (filters: entity, actor, date range) | Manager, Owner |
| GET | `/audit-logs/verify-chain` | Verify hash-chain integrity end-to-end | Owner |

## 10. Reports

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/reports/current-stock` | Current stock, filterable by product/rack | All |
| GET | `/reports/stock-movement` | Movement history over a date range | Manager, Owner |
| GET | `/reports/low-stock` | Products below reorder level | Manager, Owner |
| GET | `/reports/batch-wise` | Batch-level compliance report | Manager, Owner |
| GET | `/reports/expiry-risk` | Risk-ranked expiry report | Manager, Owner |
| GET | `/reports/warehouse-heatmap` | Rack occupancy visualization data | Manager, Owner |
| GET | `/reports/audit-extract` | Compliance-ready audit extract (date range) | Owner |
| GET | `/reports/vendor-performance` | On-time %, rejection rate, price trend per supplier | Purchase, Owner |

## 11. Notifications (internal, not client-facing)

| Method | Endpoint | Description |
|---|---|---|
| Internal only | `notification_queue.push(topic, message, entity)` | Used by services to enqueue Telegram alerts (see `07_MODULE_TELEGRAM_ALERTS.md`) |

## 12. Standard Error Format

```json
{
  "error": "error_code",
  "message": "Human-readable description",
  "details": {}
}
```

Common error codes: `unauthorized`, `forbidden_role`, `duplicate_scan`, `barcode_not_found`, `count_mismatch`, `po_not_approved`, `validation_error`.
