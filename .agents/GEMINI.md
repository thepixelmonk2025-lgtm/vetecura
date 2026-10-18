<!-- GSD:project-start source:PROJECT.md -->

## Project

**Vetecura Smart Barcode & Inventory Management System**

A barcode-first Inventory Management System (IMS) where every physical unit is scanned during Stock In and Stock Out. It provides Vetecura with full traceability, theft prevention, real-time inventory visibility, and audit-ready compliance reporting.

**Core Value:** 100% barcode-based stock tracking that guarantees zero stock adjustments without an audited scan or approved write-off.

### Constraints

- **Tech Stack**: FastAPI core, PostgreSQL DB, Redis event queue, Docker deployment.
- **Hardware**: Must integrate with barcode scanners and thermal printers.
- **Timeline**: 7–8 weeks total.
- **Scalability**: New verticals/modules must be addable without core redesign.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

- **Backend**: FastAPI (Python 3.11), SQLAlchemy 2.0 ORM, PostgreSQL 15 (AsyncPG), Redis 7
- **Frontend**: Next.js 16.2 (Turbopack, TypeScript), Vanilla TailwindCSS, PWA Scanner
- **Gateway & Deploy**: Nginx Reverse Proxy (Port 80), Docker Compose (7 container microservices)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

- **Audit Trail**: Every stock change writes a synchronous SHA-256 hash-chained `AuditLog` entry inside the database transaction.
- **Async Queueing**: Telegram alerts and heavy report exports run asynchronously via background workers (`telegram_worker.py`).
- **REST Endpoints**: FastAPI endpoints use Pydantic models for validation and require role-based access (`RoleEnum`).

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

- **Reverse Proxy**: Nginx routes `/api/` to `backend:8000`, `/` to `web_admin:3000`, and `/pwa/` to `pwa_scanner:80`.
- **Database Model**: PostgreSQL tables for Users, Suppliers, Products, Racks, Purchase Orders, Goods Receipts, Sales Orders, Dispatches, Write-offs, Returns, Cycle Counts, and Audit Logs.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agents/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
