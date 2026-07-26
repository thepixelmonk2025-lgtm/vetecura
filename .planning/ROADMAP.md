# Project Roadmap

This document outlines the execution phases for the project.

## Phases

### Phase 01: Core Engine & Data Infrastructure
**Status:** Completed
**Goal:** Initialize the FastAPI core, configure PostgreSQL & Alembic, and establish the immutable audit ledger with foundational RBAC./JWT auth
**Mode:** mvp
**Requirements:** CORE-01, CORE-02, CORE-03
**Success Criteria:**
1. PostgreSQL schema is initialized and migrations are configured.
2. FastAPI app can authenticate users with JWTs and enforce basic RBAC.
3. Immutable audit ledger is functional.

### Phase 02: Inbound & Stock In
**Status:** Completed
**Goal:** Implement Supplier management, PO approval, OCR invoice ingestion, GRN scan verification, and rack mapping
**Mode:** mvp
**Requirements:** INBOUND-01, INBOUND-02, INBOUND-03, INBOUND-04
**Success Criteria:**
1. Purchase Orders can be created and approved.
2. Invoices can be ingested and GRNs verified via scans.
3. Stock In logic properly updates inventory and rack mapping.

### Phase 03: Dispatch & Anti-Theft
**Status:** Completed
**Goal:** Build Pick List engine, item-level dispatch scanning, validation/blocking, and damage write-off workflow
**Mode:** mvp
**Requirements:** OUTBOUND-01, OUTBOUND-02, OUTBOUND-03, OUTBOUND-04
**Success Criteria:**
1. Pick Lists can be successfully generated.
2. Dispatch scanning registers stock out without errors.
3. Invalid scans or unauthorized adjustments are blocked.

### Phase 4: PWA & Hardware Integration
**Goal:** Develop the offline-first scanning app and integrate barcode scanner/thermal printer drivers
**Mode:** mvp
**Requirements:** PWA-01, PWA-02, PWA-03
**Success Criteria:**
1. PWA is installable and functions offline with sync-on-reconnect.
2. Barcode scanner integrates correctly with the application.
3. Thermal printer correctly outputs labels.

### Phase 5: Real-Time Alerts & Analytics
**Goal:** Configure Redis event queue, Telegram integration, and Operational & Compliance reports
**Mode:** mvp
**Requirements:** ALERTS-01, ALERTS-02, ALERTS-03, ALERTS-04
**Success Criteria:**
1. Telegram bots receive real-time alerts through the Redis queue.
2. Operational dashboards reflect real-time data accurately.
3. Executive Owner dashboard is fully functional.
