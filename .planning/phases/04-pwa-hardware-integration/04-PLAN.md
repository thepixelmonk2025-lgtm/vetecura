---
phase: 04
plan: 01
subsystem: pwa-hardware-integration
tags: [labels, templates, print-jobs, printers, escpos, zpl, pwa, offline-sync, database-migrations]
requires: [01-core-engine-data-infrastructure, 02-inbound-stock-in, 03-dispatch-anti-theft]
provides: [label-system, printer-management, offline-scan-queue, guided-scanning-ui]
affects: [label_templates, print_jobs, printers]
key-decisions:
  - "Label templates are database-driven and validated for layout correctness before saving."
  - "ESC/POS and ZPL driver wrappers handle device-agnostic formatting."
  - "Offline scanning uses a client-side sync queue (simulated or real offline-first local state) syncing on reconnect."
  - "Reprint requests reuse existing barcodes."
requirements: [PWA-01, PWA-02, PWA-03]
wave_count: 4
---

# Phase 04 Plan 01: PWA & Hardware Integration

## Overview

Build the template-driven label generation subsystem (templates, printers, and async print jobs) and the client-side offline sync engine for the Warehouse PWA.

**Deliverable:** Label generation engine (ESC/POS and ZPL) running on templates, and local offline scan queue sync system.

---

## Wave 1: Database Migrations & Domain Models

### Task 1.1 — SQLAlchemy Models: Printers, Label Templates, Print Jobs

**File:** `src/models/label.py`

```python
# LabelTemplate, Printer, PrintJob
# Enums: PrinterConnectionTypeEnum, PrinterProtocolEnum, PrintJobStatusEnum
```

**Verification:**
- [ ] Models importable without circular dependency issues.

---

## Wave 2: Label & Printer APIs

### Task 2.1 — Templates & Printer CRUD Endpoints

**File:** `src/api/routers/labels.py`

**Endpoints (from 12_MODULE_LABEL_PRINTING.md §7):**
- `GET  /labels/templates` → List templates
- `POST /labels/templates` → Create/edit template [Manager, Owner]
- `GET  /printers`          → List registered printers
- `POST /printers`          → Register printer [Manager, Owner]
- `PATCH /printers/{id}`     → Update configuration [Manager, Owner]

**Verification:**
- [ ] Non-authorized role blocked from POST `/printers` (403).

---

## Wave 3: Driver Layer & Print Job Queueing

### Task 3.1 — Printer Driver Layer (ESC/POS & ZPL)

**File:** `src/core/drivers.py`

```python
# ESC/POS and ZPL generation functions based on layout_json templates.
```

**Endpoints:**
- `POST /labels/print`
- `POST /labels/print-jobs/{id}/retry`
- `POST /labels/reprint/{entity_type}/{entity_id}`

**Verification:**
- [ ] Generating print jobs returns valid formatted bytes/command strings.

---

## Wave 4: Offline Scan Queue & Sync Manager

### Task 4.1 — Offline PWA Sync Manager (Simulation Core)

**File:** `src/core/sync.py` & `tests/test_pwa_offline.py`

```python
# Sync manager that queues scans locally (IndexedDB simulation) and resolves them sequentially when online status resumes.
```

**Verification:**
- [ ] Offline sync simulator executes and pushes queued scans correctly.
