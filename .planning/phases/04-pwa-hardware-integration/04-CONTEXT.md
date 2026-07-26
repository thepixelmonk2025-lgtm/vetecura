---
phase: 04
source: PRD Express Path
prd_file: .antigravaty/12_MODULE_LABEL_PRINTING.md
supporting_refs:
  - .antigravaty/13_UI_UX_GUIDELINES.md
  - .antigravaty/01_ARCHITECTURE.md
locked_decisions:
  - "Label templates are stored in database and validated for scan-reliability floor before activation."
  - "Print jobs queue asynchronously in the database; failed jobs can be manually retried."
  - "Reprinting reuses existing barcode values rather than minting new ones."
  - "PWA must support IndexedDB/local storage queueing for offline scanning with sync-on-reconnect."
  - "PWA must support camera scanning and external hardware/HID scanning inputs."
  - "PWA and Web Admin are built as distinct user interfaces to serve distinct design rules (speed/error-prevention vs. clarity/control)."
scope_fence:
  include:
    - Label Templates database schema & CRUD endpoints
    - Print Jobs database schema, queueing, and status monitoring endpoints
    - Printer Registration and configuration management endpoints
    - Driver protocol layers for ESC/POS and ZPL label generation
    - Offline queueing and sync manager logic for the PWA scanning screen
    - PWA UI layout for guided scanning (Stock In/Out/Cycle Counts)
    - All Phase 4 database migrations
    - Automated unit and integration tests for label layout rendering, print job queueing, and offline PWA sync simulation
  exclude:
    - Redis queue background worker daemon (Phase 5)
    - Telegram Alert delivery worker (Phase 5)
    - Web Admin analytics dashboards and complex business reports (Phase 5)
success_criteria:
  - "All default templates (SM-25x15, MD-40x20, MD-50x30, LG-70x40) pass scan-reliability validations."
  - "Decoupled print job generation outputs valid ESC/POS byte streams and ZPL command text."
  - "Offline sync simulator successfully queues mock scans locally and syncs to backend on reconnect."
  - "RBAC blocks unauthorized roles from editing templates and registering printers."
---

# Phase 04 Context — PWA & Hardware Integration

**Source:** PRD Express Path from `12_MODULE_LABEL_PRINTING.md` and `13_UI_UX_GUIDELINES.md`

## Domain

This phase establishes the label printing subsystem (decoupled template layouts, print jobs queues, ESC/POS & ZPL printer drivers) along with the offline-first Warehouse PWA logic (IndexedDB queueing, reconnect sync, guided scanner interfaces).

## Architecture Decisions (Locked)

All layout templates are validated against scan durability requirements (e.g. quiet zones, module sizing constraints) before being active in production. PWA uses progressive enhancement to support offline usage.
