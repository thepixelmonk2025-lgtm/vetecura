---
phase: 05
source: PRD Express Path
prd_file: .antigravaty/07_MODULE_TELEGRAM_ALERTS.md
supporting_refs:
  - .antigravaty/08_MODULE_REPORTS_ANALYTICS.md
  - .antigravaty/09_RBAC_SECURITY.md
locked_decisions:
  - "Telegram alerts are enqueued asynchronously in the database/Redis and processed by a background worker."
  - "Worker handles exponential retry backoff (5s, 30s, 2min, 1h) and updates telegram_alerts_log status."
  - "Reports are split into daily Operational summaries and compliance-ready tracing extracts."
  - "Expiry Risk Report rankings use: risk_score = (1 / days_to_expiry) * current_stock_qty * category_weight."
  - "Dashboards return role-specific payloads matching the user's role exactly."
scope_fence:
  include:
    - User notification preferences table & preference management endpoints
    - Telegram background worker script with retry logic & mock Telegram sender
    - Operational reports (Current Stock, Stock Movement, Low Stock, Heatmap) endpoints
    - Compliance reports (Batch-wise, Expiry Risk, Audit logs extract, Vendor performance) endpoints
    - Expiry Risk scoring algorithm implementation
    - Role-specific dashboard payloads (Owner, Manager, Staff, Purchase) endpoints
    - Export endpoints (CSV simulation/mock formats)
    - All Phase 5 database migrations
    - Automated tests for alert queueing, worker retry cycles, report logic, and dashboard role checks
  exclude:
    - Live external Telegram Bot connection (runs in mock mode for testability unless token configured)
    - PDF font rendering logic (mock/CSV export prioritized)
---

# Phase 05 Context — Real-Time Alerts & Analytics

**Source:** PRD Express Path from `07_MODULE_TELEGRAM_ALERTS.md` and `08_MODULE_REPORTS_ANALYTICS.md`

## Domain

This final phase implements the background worker for real-time Telegram topic routing, the preference-management module, the analytical reporting suite (including smart Expiry Risk scoring), and role-tailored dashboards.

## Architecture Decisions (Locked)

All messaging remains asynchronous. Dashboards are secured strictly according to the JWT role parameter.
