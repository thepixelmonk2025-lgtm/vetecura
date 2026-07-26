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

(None yet — ship to validate)

### Active

- [ ] 100% barcode-based stock tracking
- [ ] Immutable, hash-chained log of every stock-affecting action (audit trail)
- [ ] Real-time inventory visibility on dashboards
- [ ] Batch & Expiry management (traceable to batch no, MFG, expiry)
- [ ] Role-based access control (Owner, Manager, Staff, Purchase)
- [ ] Phase 1: Core Engine & Data Infrastructure (FastAPI, Postgres, RBAC/JWT)
- [ ] Phase 2: Inbound & Stock In (Supplier, PO, OCR invoice, GRN, rack mapping)
- [ ] Phase 3: Dispatch & Anti-Theft (Pick List, dispatch scan, write-offs)
- [ ] Phase 4: PWA & Hardware Integration (Offline-first, scanner/printer drivers)
- [ ] Phase 5: Real-Time Alerts & Analytics (Redis, Telegram integration)

### Out of Scope

- [Marketplace integrations] — Future phase (Amazon/Flipkart direct sync)
- [Native mobile app] — v1 ships as installable PWA, not App Store/Play Store native
- [Multi-currency / multi-country tax handling] — Not needed for current operational scope
- [Full accounting/ledger module] — GST invoicing beyond basic dispatch docs is not required

## Context

Vetecura currently lacks item-level accountability. Stock counts are trusted at a batch/carton level rather than a per-unit level, which creates gaps where shrinkage, mispicks, and expired stock go undetected until a manual audit — often weeks later.

Reference documents for this build include architecture, DB schema, API spec, and module guides.

## Constraints

- **Tech Stack**: FastAPI core, PostgreSQL DB, Redis event queue, Docker deployment.
- **Hardware**: Must integrate with barcode scanners and thermal printers.
- **Timeline**: 7–8 weeks total.
- **Scalability**: New verticals/modules must be addable without core redesign.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as PWA | Avoid App Store delays while providing offline scanning | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-26 after project initialization*
