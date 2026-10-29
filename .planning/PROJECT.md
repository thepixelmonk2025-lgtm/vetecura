# Vetecura Smart Barcode & Inventory Management System

## What This Is

A barcode-first Inventory Management System (IMS) where every physical unit is scanned during Stock In and Stock Out. It provides Vetecura with full traceability, theft prevention, real-time inventory visibility, and audit-ready compliance reporting.

## Core Value

100% barcode-based stock tracking that guarantees zero stock adjustments without an audited scan or approved write-off.

## Business Context

- **Customer**: Vetecura internal operations (Warehouse Managers, Staff, Purchase Team, Owner)
- **Revenue model**: N/A (Internal operational tool)
- **Success metric**: Every unit has a scan event at both Stock In and Stock Out

## Requirements

### Validated

- [x] 100% barcode-based stock tracking (item-level barcodes VET-*, CODE128/QR support)
- [x] Immutable, SHA-256 hash-chained log of every stock-affecting action (AuditLog)
- [x] Real-time inventory visibility on web dashboard with rack, batch, and expiry indicators
- [x] Batch & Expiry management (traceable to batch no, MFG, expiry date)
- [x] Role-based access control (Owner, Warehouse Manager, Warehouse Staff, Purchase Team)
- [x] Phase 1: Core Engine & Data Infrastructure (FastAPI, Postgres, AsyncPG, RBAC/JWT)
- [x] Phase 2: Inbound & Stock In (Supplier management, PO creation, Barcode generation & ZPL/QR printing, GRN, Rack put-away)
- [x] Phase 3: Dispatch & Anti-Theft (Pick List generation, Dispatch scanning verification, Write-offs, Returns, Theft alerts)
- [x] Phase 4: PWA & Hardware Integration (Vite PWA, Optical camera viewfinder & USB/Bluetooth barcode gun listener, IndexedDB offline buffer, Auth token URL sync)
- [x] Phase 5: Real-Time Alerts & Analytics (Redis event queue, 3 Telegram alert topics: Operations, Inventory Alerts, Security/Audit)
- [x] Full Docker Compose Stack (PostgreSQL 15, Redis 7, FastAPI Backend, Telegram Worker, Next.js Web Admin, Vite PWA Scanner, Nginx Reverse Proxy on Port 9090)

### Active

- [ ] Production UAT testing across live handheld scanner devices and thermal label printers
- [ ] Automated daily inventory snapshot reports delivered to Telegram / Email
- [ ] Supplier performance and delivery discrepancy analytics

### Out of Scope

- [Marketplace integrations] — Future phase (Amazon/Flipkart direct sync)
- [Native mobile app] — v1 ships as installable PWA with offline scanning, not App Store/Play Store native
- [Multi-currency / multi-country tax handling] — Not needed for current operational scope
- [Full accounting/ledger module] — GST invoicing beyond basic dispatch docs is not required

## Context

Vetecura now possesses full item-level accountability. Every physical unit is scanned during receiving (GRN) and shipping (Dispatch). The offline-first PWA scanner ensures seamless warehouse floor scanning even in low-connectivity areas, automatically syncing to the centralized database and maintaining an immutable SHA-256 cryptographic audit chain.

Reference documents for this build include architecture, DB schema, API spec, and module guides.

## Constraints

- **Tech Stack**: FastAPI core (Python 3.11), SQLAlchemy 2.0 ORM, PostgreSQL 15, Redis 7, Next.js 16 (Turbopack, TypeScript), Vite PWA, Nginx, Docker.
- **Hardware**: Integrates with USB/Bluetooth HID barcode scanners and thermal label printers (ZPL/Browser print).
- **Security**: SHA-256 tamper-evident hash chaining across all inventory ledger events.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as PWA | Avoid App Store delays while providing offline scanning and hardware camera/wedge gun support | Validated & Live |
| IndexedDB Offline Buffer | Allow warehouse staff to scan continuously even with intermittent WiFi drops | Validated (auto-syncs before GRN finalization) |
| SHA-256 Chain Auditing | Zero-trust compliance ensuring no unauthorized stock adjustments can occur | Validated |
| 7-Container Microservice Stack | Clean separation of concerns between API, async worker, web portal, scanner, database, and proxy | Validated on Port 9090 |
| Explicit Auth Token Propagation | Passes active JWT token between web admin and PWA tabs to ensure seamless server-side verification | Validated |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-10-28 after PWA authentication and offline sync hardening*
