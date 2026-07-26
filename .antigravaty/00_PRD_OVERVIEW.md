# Vetecura Smart Barcode & Inventory Management System — Product Requirements Document

**Prepared by:** Eshan Patil | The Pixel Monk
**Client:** Vetecura
**Quote Ref:** TPM/VET/2026/04
**Doc Version:** 1.0

---

## 1. Purpose

Build a barcode-first Inventory Management System (IMS) where every physical unit is scanned during Stock In and Stock Out, giving Vetecura full traceability, theft prevention, real-time inventory visibility, and audit-ready compliance reporting.

## 2. Problem Statement

Vetecura currently lacks item-level accountability. Stock counts are trusted at a batch/carton level rather than a per-unit level, which creates gaps where shrinkage, mispicks, and expired stock go undetected until a manual audit — often weeks later.

## 3. Goals (Non-Negotiable)

| Goal | Success Metric |
|---|---|
| 100% barcode-based stock tracking | Every unit has a scan event at both Stock In and Stock Out |
| Prevent theft / unauthorized movement | Zero stock adjustments without an audited scan or approved write-off |
| Real-time inventory visibility | Dashboard reflects stock changes within seconds of a scan |
| Batch & Expiry management | Every unit traceable to batch no., MFG date, expiry date |
| Complete audit trail | Immutable, hash-chained log of every stock-affecting action |
| Role-based access | Four distinct roles with scoped permissions (see `09_RBAC_SECURITY.md`) |
| Scalable architecture | New verticals/modules addable without core redesign |

## 4. Out of Scope (v1)

- Marketplace integrations (Amazon/Flipkart direct sync) — future phase
- Native mobile app (v1 ships as installable PWA, not App Store/Play Store native)
- Multi-currency / multi-country tax handling
- Full accounting/ledger module (GST invoicing beyond basic dispatch docs)

## 5. User Roles

1. **Owner** — executive dashboard, financial/operational summaries, global config
2. **Warehouse Manager** — PO/GRN management, dispatch generation, write-off sign-off, rack allocation
3. **Warehouse Staff** — mobile scanning interface: Stock In, Pick Lists, dispatch confirmation
4. **Purchase Team** — draft/approve/release Purchase Orders to suppliers

Full permission matrix in `09_RBAC_SECURITY.md`.

## 6. Core Modules (Build Order)

Matches the 5-phase quotation structure:

1. **Phase 1 — Core Engine & Data Infrastructure**: DB schema, immutable audit ledger, FastAPI core, RBAC/JWT auth
2. **Phase 2 — Inbound & Stock In**: Supplier mgmt, PO approval, OCR invoice ingestion, GRN scan verification, rack mapping
3. **Phase 3 — Dispatch & Anti-Theft**: Pick List engine, item-level dispatch scanning, validation/blocking, damage write-off
4. **Phase 4 — PWA & Hardware Integration**: Offline-first scanning app, barcode scanner + thermal printer drivers
5. **Phase 5 — Real-Time Alerts & Analytics**: Redis event queue, Telegram integration, Operational & Compliance reports

Deployment & Go-Live: Docker, cloud server, hardware pairing, UAT, staff training.

## 7. Reference Documents in This Build Kit

| File | Covers |
|---|---|
| `01_ARCHITECTURE.md` | Tech stack, system architecture, folder structure |
| `02_DATABASE_SCHEMA.md` | Full PostgreSQL schema with relationships |
| `03_API_SPECIFICATION.md` | REST API endpoint reference |
| `04_MODULE_INBOUND_STOCKIN.md` | Supplier, PO, GRN, OCR, Stock In scan logic |
| `05_MODULE_OUTBOUND_DISPATCH.md` | Pick List, Stock Out scan logic, validation |
| `06_MODULE_ANTITHEFT_AUDIT.md` | Immutable audit ledger, anomaly detection, write-offs, cycle counts |
| `07_MODULE_TELEGRAM_ALERTS.md` | Redis queue, Telegram bot integration, alert types |
| `08_MODULE_REPORTS_ANALYTICS.md` | Dashboards, operational/compliance reports |
| `09_RBAC_SECURITY.md` | Roles, permissions matrix, JWT/auth flow |
| `10_DEPLOYMENT_INFRA.md` | Docker, hosting, environment config, hardware setup |
| `11_AI_BUILD_PROMPT.md` | Master prompt for AI-assisted code generation (Claude Code / Antigravity / Gemini) |

## 8. Timeline & Milestones

7–8 weeks total. See quotation doc for week-by-week breakdown. Payment: 50% advance, 50% on UAT/handover.

## 9. Definition of Done (v1 Production-Ready)

- [ ] All 5 phases functionally complete and integrated
- [ ] 100% of Stock In / Stock Out flows require and validate a barcode scan
- [ ] Immutable audit log verified tamper-proof (hash chain integrity test passes)
- [ ] PWA installs and functions offline with sync-on-reconnect
- [ ] All 5 Telegram topic groups receiving correctly routed alerts
- [ ] RBAC enforced on every API endpoint (no role can access out-of-scope data)
- [ ] Load-tested for at least 3,000 sequential scans in one session (per invoice, one truck's worth)
- [ ] Deployed via Docker to production server, UAT signed off by Vetecura
