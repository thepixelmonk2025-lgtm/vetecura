# Master AI Build Prompt — Vetecura IMS

**Use with:** Claude Code, Antigravity, Gemini, or any agentic AI coding tool. Feed this document plus all other files in this build kit as context before starting implementation.

---

## How to Use This Kit

Provide the AI build agent with, in this order:
1. This file (master prompt — sets overall context and build sequence)
2. `00_PRD_OVERVIEW.md`
3. `01_ARCHITECTURE.md`
4. `02_DATABASE_SCHEMA.md`
5. `03_API_SPECIFICATION.md`
6. `09_RBAC_SECURITY.md` (roles must be understood before building any module)
7. `13_UI_UX_GUIDELINES.md`
8. Then module-by-module: `04`, `05`, `06`, `07`, `08`, `12` as each is built
9. `10_DEPLOYMENT_INFRA.md` at the end for containerization/deployment

Build in phases, matching the client quotation structure — do not attempt to generate the entire system in one pass. Each phase should be functionally complete and testable before moving to the next.

---

## Master Prompt (paste to AI agent)

```
You are building "Vetecura IMS" — a production-grade, barcode-first inventory
management system for a small Indian business. Full specifications are provided
in the attached build kit documents. Follow them exactly; do not invent
architecture, schema, or business rules not covered in the documents — if
something is genuinely ambiguous, flag it as a question rather than guessing
silently.

CORE NON-NEGOTIABLES (apply to every phase):
1. Every stock quantity change must originate from either a scan event or an
   explicitly approved, reasoned override. No silent adjustments, anywhere.
2. The audit_log table is append-only. Enforce this at the database role level,
   not just in application code.
3. Every API endpoint must enforce the exact role permissions defined in
   09_RBAC_SECURITY.md — no endpoint should be reachable by a role not listed
   for it.
4. Telegram/notification delivery must never block a business transaction.
   Always queue via Redis; never call the Telegram API synchronously inside a
   scan or approval endpoint.
5. The Warehouse PWA must function offline — scans queue locally and sync on
   reconnect. Never lose a scan due to a network drop.
6. Follow 13_UI_UX_GUIDELINES.md for all frontend work — the Warehouse PWA and
   Web Admin are two distinct interfaces with two distinct design goals
   (speed/error-prevention vs. clarity/control). Do not reuse one design
   system uncritically across both.

BUILD SEQUENCE (do not skip ahead):

PHASE 1 — Core Engine & Data Infrastructure
  - Implement the full schema from 02_DATABASE_SCHEMA.md via Alembic migrations
  - Implement JWT auth + refresh token rotation (09_RBAC_SECURITY.md, Section 4)
  - Implement RBAC middleware/dependency enforcing the permission matrix
  - Implement the audit_log hash-chain writer as a reusable service
    (06_MODULE_ANTITHEFT_AUDIT.md, Section 2) — every subsequent phase must
    call this service for every stock-affecting action
  - Set up Docker Compose per 10_DEPLOYMENT_INFRA.md for local development
  - Deliverable: auth works, roles enforced, empty-but-structurally-complete
    database, audit service unit-tested independently

PHASE 2 — Inbound & Stock In
  - Build per 04_MODULE_INBOUND_STOCKIN.md in full
  - Supplier + Product master CRUD
  - PO draft → approval workflow
  - GRN gate entry → OCR upload/review → field confirmation → item scanning →
    completion/reconciliation
  - Rack assignment logic (consolidate-first, then nearest-available)
  - Wire every stock-affecting step to the Phase 1 audit service
  - Deliverable: a full GRN can be created, scanned, and completed end-to-end
    against a test PO, with correct stock_ledger updates and audit entries

PHASE 3 — Dispatch & Anti-Theft Guardrails
  - Build per 05_MODULE_OUTBOUND_DISPATCH.md and 06_MODULE_ANTITHEFT_AUDIT.md
  - Sales order → pick list generation (FEFO-aware) → guided picking →
    item-level scan validation → hard-blocked completion on count mismatch
  - Write-off workflow (mandatory photo proof, approval gate)
  - Returns workflow (condition-based routing)
  - Cycle counting workflow (variance detection, no silent auto-correction)
  - Implement the rule-based anomaly detection engine (06_MODULE_ANTITHEFT_AUDIT.md,
    Section 4) as a background service
  - Deliverable: a dispatch cannot complete with a scan-count mismatch except
    via an explicitly logged Manager override; anomaly rules fire correctly
    against test scenarios

PHASE 4 — PWA & Hardware Integration
  - Build the Warehouse PWA per 01_ARCHITECTURE.md Section 5 and
    13_UI_UX_GUIDELINES.md Section 2
  - Implement offline-first scan queueing (IndexedDB) and sync manager
  - Implement barcode/QR scanning (camera-based + external HID scanner support)
  - Build the label printing module per 12_MODULE_LABEL_PRINTING.md in full:
    label templates, printer driver layer (ESC/POS + ZPL), print job queue,
    reprint handling
  - Deliverable: a device can scan offline, sync on reconnect, and print a
    label via at least one network-connected printer

PHASE 5 — Real-Time Alerts & Analytics
  - Build per 07_MODULE_TELEGRAM_ALERTS.md in full: Redis queue, background
    worker, Telegram Forum/Topics integration, role-based subscription filtering
  - Build per 08_MODULE_REPORTS_ANALYTICS.md: all Operational and Compliance
    reports, expiry risk scoring, role-specific dashboards
  - Build the Web Admin per 13_UI_UX_GUIDELINES.md Section 3
  - Deliverable: all 5 Telegram topics receive correctly routed, correctly
    formatted alerts; all reports return accurate data; dashboards are
    role-appropriate

DEPLOYMENT — Go-Live
  - Follow 10_DEPLOYMENT_INFRA.md exactly: environment separation, migration
    workflow, backup strategy, go-live checklist
  - Do not mark any checklist item complete without actually verifying it —
    especially the backup restore drill and the RBAC automated test suite

AFTER EACH PHASE:
  - Run the "Definition of Done" checklist from the corresponding module
    document before proceeding to the next phase
  - Surface any deviation from the spec explicitly — do not silently change
    a business rule (e.g. scan validation logic, approval gates) because it
    seemed simpler to implement differently

CODE QUALITY EXPECTATIONS:
  - Type-safe throughout (Pydantic schemas on the backend, TypeScript on both
    frontends)
  - Every stock-affecting endpoint has a corresponding automated test
    verifying both the happy path and at least one rejection path (duplicate
    scan, wrong role, count mismatch)
  - No hardcoded secrets, IPs, or business-rule constants that are meant to be
    configurable per 09_RBAC_SECURITY.md / 06_MODULE_ANTITHEFT_AUDIT.md
    (anomaly thresholds, label templates, notification preferences all live
    in the database, not in code)
```

---

## Phase-Specific Sub-Prompts

For agents with limited context windows, use these focused sub-prompts alongside only the relevant module document(s):

**Phase 1 sub-prompt:** "Implement the database schema and auth/RBAC layer exactly as specified in 02_DATABASE_SCHEMA.md and 09_RBAC_SECURITY.md. Build the audit_log hash-chain service as an isolated, independently testable module — every future phase will depend on it."

**Phase 2 sub-prompt:** "Implement the Inbound/Stock In module exactly as specified in 04_MODULE_INBOUND_STOCKIN.md. Assume the Phase 1 audit service and RBAC middleware already exist and must be used, not reimplemented."

**Phase 3 sub-prompt:** "Implement the Dispatch and Anti-Theft modules exactly as specified in 05_MODULE_OUTBOUND_DISPATCH.md and 06_MODULE_ANTITHEFT_AUDIT.md. Pay particular attention to the hard-block on scan-count mismatch — this must not be bypassable except through the explicit, logged Manager force-close path."

**Phase 4 sub-prompt:** "Implement the Warehouse PWA and Label Printing module exactly as specified in 12_MODULE_LABEL_PRINTING.md and the PWA design rules in 13_UI_UX_GUIDELINES.md Section 2. Offline-first behavior is not optional — test explicitly with network disabled mid-session."

**Phase 5 sub-prompt:** "Implement Telegram alerting and Reports/Analytics exactly as specified in 07_MODULE_TELEGRAM_ALERTS.md and 08_MODULE_REPORTS_ANALYTICS.md. Confirm the Redis queue pattern is used correctly — no synchronous Telegram API calls inside any business transaction."

---

## Notes for Eshan (Project Lead)

- Feed documents incrementally per phase if the AI tool has a smaller context window — don't dump all 13 files at once unless the tool explicitly supports large-context ingestion (e.g. Claude Code with full repo access).
- After each phase, review the generated code against that module's Definition of Done checklist yourself before moving on — treat the checklist as your own QA gate, not just documentation for the AI.
- If the AI agent proposes a deviation from the spec (e.g. a different DB field name, a simplified anomaly rule), decide deliberately whether to accept it and **update the corresponding .md file** so the build kit stays the source of truth for the life of the project — this is what makes it usable for future maintenance or a different developer picking up the codebase later.
