# Module: Real-Time Alerts (Telegram Integration)

**Module Code:** `ALERTS`
**Depends on:** Redis, Telegram Bot API, all stock-affecting modules as event sources

---

## 1. Purpose

Give Vetecura's team real-time operational and security visibility without anyone needing to log into the web dashboard — critical events reach the right people, in the right group, within seconds, without ever slowing down the transaction that triggered them.

## 2. Why a Queue, Not Direct Calls

Telegram's API can be slow or rate-limited at unpredictable moments. If a Stock Out scan transaction directly called the Telegram API and waited for a response, a slow Telegram response would stall a warehouse worker mid-scan. Instead:

```
[Business action commits to DB] --> [Push message to Redis queue] --> transaction returns immediately
                                            |
                                            v
                          [Background worker (telegram_worker.py)]
                                            |
                                            v
                              [Telegram Bot API] --> [Topic Group]
```

The worker retries failed sends with exponential backoff and logs every attempt in `telegram_alerts_log`.

## 3. Telegram Group / Topic Structure

Uses Telegram's **Forum Mode (Topics)** — a single group with five topics, rather than five separate groups, so Vetecura's team isn't juggling multiple chat windows:

| Topic | Purpose |
|---|---|
| Stock In | Every completed GRN, discrepancies flagged inline |
| Stock Out / Dispatch | Every completed dispatch |
| Inventory Alerts | Low stock, expiry risk, reprint frequency flags |
| Security & Audit | Anomaly detections, force-closes, write-off/return activity |
| Management Reports | Daily summary, weekly digest |

(If Vetecura prefers separate groups instead of topics within one group, the config supports either — `telegram_alerts_log.topic` maps to either a topic ID or a distinct chat ID depending on setup.)

## 4. Role-Based Notification Rules

Not everyone needs every alert. Configurable per user:

| Role | Default Subscriptions |
|---|---|
| Owner | All 5 topics |
| Warehouse Manager | Stock In, Stock Out, Inventory Alerts, Security & Audit |
| Warehouse Staff | Stock In, Stock Out (their own actions only, optional) |
| Purchase Team | Inventory Alerts (low stock, for reorder awareness) |

Managed via a `user_notification_preferences` table — Owner can adjust per user without a code change.

## 5. Alert Catalog

| Alert | Topic | Trigger | Sample Message |
|---|---|---|---|
| Stock Received | Stock In | GRN completed | "✅ 500 units Vitamin D3 Softgel (Batch VD-2207) received, Rack B-12" |
| GRN Discrepancy | Stock In + Inventory Alerts | Scanned ≠ ordered qty | "⚠️ GRN #1042: 497/500 scanned — 3 unit shortfall, pending Manager review" |
| Stock Dispatched | Stock Out | Dispatch completed | "📦 120 units Vitamin D3 Softgel dispatched to Retailer X" |
| Dispatch Force-Closed | Security & Audit | Manager override on mismatch | "🔴 Dispatch #2231 force-closed by [Manager] — 117/120 scanned. Reason: [logged reason]" |
| Low Stock | Inventory Alerts | Stock falls below `reorder_level` | "📉 Vitamin D3 Softgel below reorder level (42 units remaining)" |
| Expiry Alert | Inventory Alerts | Batch enters risk window (configurable, e.g. 60 days out) | "⏰ Batch VD-2207 expires in 45 days — 210 units still in stock" |
| Manual Stock Adjustment | Security & Audit | Any non-scan-driven ledger change | "🔧 Manual adjustment: -5 units, Product X, by [Manager], reason: cycle count variance" |
| Unauthorized/Anomalous Activity | Security & Audit | Anomaly rule fires (see `06_MODULE_ANTITHEFT_AUDIT.md`) | "🚨 [User] triggered 4 wrong-product scans in 8 minutes — flagged for review" |
| Daily Inventory Summary | Management Reports | Scheduled, once daily | "📊 Today: 3 GRNs (1,240 units in), 5 dispatches (680 units out), 2 low-stock items, 1 expiry alert" |

## 6. Message Format Standards

- Every alert includes: what happened, quantity/entity involved, who (if a human action), and a timestamp.
- Security & Audit messages are never soft-worded — clarity over politeness, since these are the messages someone needs to act on fast.
- Emoji prefixes used consistently as a fast visual triage system (✅ normal, ⚠️ needs attention, 🔴 urgent/blocking, 🚨 security, 📊 informational digest) — Owner can disable emoji formatting per group if preferred.

## 7. Data Model

```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic VARCHAR(30) NOT NULL,
  is_subscribed BOOLEAN DEFAULT TRUE
);
```
(`telegram_alerts_log` already defined in `02_DATABASE_SCHEMA.md`.)

## 8. API / Internal Interface

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/notifications/preferences` | View own subscription settings | Authenticated |
| PATCH | `/notifications/preferences` | Update own subscriptions | Authenticated |
| GET | `/notifications/log` | View alert delivery history (audit of alerts themselves) | Manager, Owner |
| POST | `/notifications/test` | Send a test message to verify bot/topic connectivity | Owner |

Internal (not exposed to frontend): `notification_queue.push(topic, message, entity_type, entity_id)` — called by every module that needs to raise an alert.

## 9. Failure Handling

| Failure | Behavior |
|---|---|
| Telegram API unreachable | Worker retries with exponential backoff (e.g. 5s, 30s, 2min, then hourly for 24h) |
| Bot removed from group / topic deleted | Alert marked `failed` after retries exhausted, surfaced in Web Admin as a "Notification Health" warning for Owner |
| Redis unavailable | Business transactions still commit (alerting is decoupled); once Redis recovers, no historical alerts are lost since the source event is already in `audit_log` — a reconciliation job can re-derive missed alerts from the audit trail if needed |

## 10. Definition of Done

- [ ] All 5 topics receiving correctly routed alerts in a live Telegram test group
- [ ] Confirmed a slow/failed Telegram response never delays a scan transaction (load test: kill network to Telegram mid-scan-burst, transactions still complete)
- [ ] Role-based subscription filtering verified (Staff account does not receive Security & Audit alerts by default)
- [ ] Daily summary alert fires on schedule with accurate aggregated numbers
- [ ] Retry/backoff behavior confirmed via simulated Telegram API outage
