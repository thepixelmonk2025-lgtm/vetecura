---
phase: 05
plan: 01
subsystem: real-time-alerts-analytics
tags: [telegram, notifications, preferences, reports, analytics, dashboards, batch-traceability, expiry-risk]
requires: [01-core-engine-data-infrastructure, 02-inbound-stock-in, 03-dispatch-anti-theft, 04-pwa-hardware-integration]
provides: [telegram-alerts, reporting-suite, analytical-dashboards]
affects: [user_notification_preferences, telegram_alerts_log]
key-decisions:
  - "Notification preferences are DB stored and enforce routing per user role."
  - "Background alert worker runs a mock loop with exponential backoff on retry."
  - "Expiry Risk Report evaluates batches by computed risk score (1/days * quantity * weight)."
  - "Dashboards are partitioned strictly by current user's authenticated JWT role."
requirements: [ALERTS-01, ALERTS-02, ALERTS-03, ALERTS-04]
wave_count: 4
---

# Phase 05 Plan 01: Real-Time Alerts & Analytics

## Overview

Build the notification management endpoints, real-time Telegram worker simulator, analytical report engines (including smart expiry risk calculation), and role-specific dashboards.

**Deliverable:** Alarm workers running on exponential backoff, complete reports suite, and role-restricted dashboard endpoints.

---

## Wave 1: Database Migrations & Domain Models

### Task 1.1 — SQLAlchemy Models: Notification Preferences

**File:** `src/models/preferences.py`

```python
# UserNotificationPreference: user_id, topic, is_subscribed
```

**Verification:**
- [ ] Models importable cleanly.

---

## Wave 2: Notification & Alerting APIs

### Task 2.1 — Notifications preferences & Alert History Endpoints

**File:** `src/api/routers/notifications.py`

**Endpoints (from 07_MODULE_TELEGRAM_ALERTS.md §8):**
- `GET  /notifications/preferences` → Get subscriptions
- `PATCH /notifications/preferences` → Update subscriptions
- `GET  /notifications/log`          → Alert delivery history [Manager, Owner]
- `POST /notifications/test`         → Force mock test alert [Owner]

**Verification:**
- [ ] Non-authorized role blocked from GET `/notifications/log` (403).

---

## Wave 3: Reports & Smart Analytics Engines

### Task 3.1 — Reporting Suite & Expiry Risk Calculator

**File:** `src/api/routers/reports.py`

**Endpoints (from 08_MODULE_REPORTS_ANALYTICS.md §6):**
- `GET /reports/current-stock`
- `GET /reports/stock-movement`
- `GET /reports/low-stock`
- `GET /reports/warehouse-heatmap`
- `GET /reports/batch-wise`
- `GET /reports/expiry-risk` (Uses the `risk_score` formula)
- `GET /reports/audit-extract`
- `GET /reports/vendor-performance`
- `GET /dashboard/{role}`

**Verification:**
- `GET /reports/expiry-risk` returns batches ordered by computed risk index descending.

---

## Wave 4: Background Telegram Worker & Integration Tests

### Task 4.1 — Background Worker Simulation & Integration Tests

**File:** `src/core/telegram_worker.py` & `tests/test_alerts_reports.py`

```python
# background loop that runs periodically, processes queued messages, retries failures with backoff.
```

**Verification:**
- [ ] Integration tests verify alerts retry cycle and reports accuracy.
