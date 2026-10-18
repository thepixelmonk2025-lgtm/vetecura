# Vetecura Smart Barcode & Inventory Management System (IMS)

## 1. Project Overview
**Vetecura IMS** is an enterprise-grade, barcode-first Inventory Management System designed to ensure that every physical unit entering or leaving the warehouse is scanned unit-by-unit. It provides Vetecura with full traceability, anti-theft prevention, real-time inventory visibility, continuous high-speed scanning, thermal label printing, and audit-ready compliance reporting.

**Core Value Proposition:** 100% barcode-based stock tracking that guarantees zero stock adjustments without an audited scan or approved write-off.

---

## 2. Technology Stack

### Backend & Database
- **Framework**: FastAPI (Python 3.11) with Uvicorn async ASGI server
- **Database**: PostgreSQL 15 (AsyncPG driver) with SQLAlchemy 2.0 ORM & Alembic migrations (`alembic/versions/001_initial_schema.py` across 27 tables)
- **Event Queue / Caching**: Redis 7
- **Background Workers**: Async `telegram_worker.py` service for non-blocking Telegram alert broadcasting
- **Data Integrity**: SHA-256 Synchronous Hash Chaining on all stock mutation events serialized via `.with_for_update()` row locks

### Frontend & Mobile Architecture
- **Web Admin Dashboard (`vetecura-web`)**:
  - Next.js 16.2 (Turbopack, TypeScript, React 19)
  - Modular Component Architecture (`Sidebar`, `Header`, 7 Views, 5 Guided Modals)
  - Ultra-clean, modern **Light Mode Design System** (`#f8fafc` background, slate-900 typography, emerald/blue/amber accents)
  - **Lucide React (`lucide-react`)** Enterprise SVG Icon Pack
  - **Production-Ready State Management**: Zero mock data, dynamic API sync via `useEffect`, and secure token-based formal login
  - **Persistent LocalStorage & Backend Sync**: Bi-directional state merge ensuring zero data loss on page refresh (F5)
  - **Offline Vector Thermal & A4 Label Print Studio**: Native vector QR generation supporting both **A4 Sticker Sheets (24/page)** and **Continuous Thermal Rolls (Zebra/TSC/TVS)** with raw `.ZPL` export

- **Mobile Warehouse Scanner PWA (`vetecura-pwa`)**:
  - Vite + React TypeScript Progressive Web App with Tailwind CSS v4
  - **Continuous High-Speed Camera Auto-Scan**: Uninterrupted viewfinder scanning with instant green laser flash and live on-screen HUD counter
  - **Hardware Barcode Gun Auto-Entry**: Zero-click instant input processing for USB/Bluetooth handheld scanners
  - **Anti-Spam & Duplicate Shield**: In-memory `Set<string>` lock preventing double-counting and false increment loops
  - **Auto JWT Authentication**: Seamless background token exchange eliminating 401 Unauthorized errors
  - **IndexedDB Offline Queue**: Automatic offline scan buffering with 1-tap manual and auto-reconnect sync (`offlineQueue.ts`)
  - **Web Audio Synthesizer (1.8kHz Beep) & Haptic Vibration Feedback**

### Gateway & Deployment
- **Reverse Proxy**: Nginx 1.25 Alpine listening on port 80
- **Containerization**: Docker Compose (`vetecura_backend`, `vetecura_web_admin`, `vetecura_pwa_scanner`, `vetecura_telegram_worker`, `vetecura_postgres`, `vetecura_redis`, `vetecura_gateway`)

---

## 3. Implemented Core Modules Status

| Module Code | Module Name | Implementation Status | Key Features |
|---|---|---|---|
| `INBOUND` | Inbound Stock In & Goods Receipt (GRN) | ✅ **Complete** | PO creation, multi-supplier management, Date & Time tracking, persistent storage, gate scan verification, auto rack suggestions |
| `LABELS` | Thermal & A4 Barcode Studio | ✅ **Complete** | Native offline vector QR codes, A4 3x8 grid (24 labels/page), continuous thermal roll formatting, raw `.zpl` download |
| `DISPATCH` | Outbound Logistics & Picking Verification | ✅ **Complete** | FEFO priority pick lists, sales order barcode scan verification (`Ready to Ship`), mismatch blocking, atomic stock decrement |
| `INVENTORY` | Warehouse Racks & Physical Stock Ledger | ✅ **Complete** | Visual 2D/3D rack occupancy grid, capacity heatmaps, cold-chain isolation, real-time batch/SKU stock ledger |
| `AUDIT` | Anti-Theft & Cryptographic Hash Ledger | ✅ **Complete** | SHA-256 hash-chain verification (`GET /reports/verify-chain`), zero-trust tamper audit, damage write-off review with photo proof preview |
| `RETURNS` | Customer / Clinic Returns Workflow | ✅ **Complete** | Return receipt logging, condition inspection (Good vs Damaged), automatic segregated routing to normal racks vs Damage Hold |
| `CYCLES` | Rack Cycle Counts & Stock Audits | ✅ **Complete** | Duplicate scan detection, rack membership verification, automatic discrepancy reporting |
| `ALERTS` | Telegram Bot Real-Time Alerts | ✅ **Complete** | Async Redis queue worker for 5 Forum Topics (`Stock In`, `Stock Out`, `Alerts`, `Security`, `Reports`), live UI notification stream |
| `REPORTS` | Analytics & Predictive Forecast | ✅ **Complete** | Expiry Risk Scoring `(1/days) × qty × weight`, Low-Stock Demand Forecast `(Daily Burn × Lead Time) − Stock`, 1-click CSV export, Dynamic SQL aggregations |
| `RBAC` | Security & Role-Based Access Control | ✅ **Complete** | 4-Role Permission Matrix (Owner, Manager, Staff, Purchase), JWT Bearer auth, secure login portal (no dev bypass), user management |
| `PWA` | Mobile Warehouse Scanner | ✅ **Complete** | Continuous Auto-Scan mode, Gun Auto-Entry, single-scan lock, offline IndexedDB sync, audio & haptic alerts |
| `PROD` | Production Readiness | ✅ **Complete** | Mock data removed from frontend UI, dynamic KPI queries based on `Product.unit_price`, deployment-ready Docker setup |

---

## 4. Architecture & Key Patterns
1. **Synchronous Audit Ledger Logging**: All stock-affecting operations write an immutable SHA-256 hash-chained entry to `audit_logs` inside the primary database transaction with row-level locking.
2. **Item Barcode Lifecycle State Machine**: Every physical unit progresses deterministically through `ItemBarcodeStatusEnum`:
   - `available` ➔ `reserved_pick` ➔ `dispatched`
   - `damaged_hold` ➔ `quarantine` ➔ `disposed`
   - `returned_hold` ➔ `available` (if good) / `damaged_hold` (if damaged)
3. **Dual-Leg Stock Movements**:
   - Write-off approvals decrement source rack inventory and increment the designated Damage Warehouse.
   - Return inspections cleanly route good products to active warehouse racks and compromised items to the quarantine hold.
4. **Continuous Auto-Scan Engine**: Eliminates camera shutter delays for high-throughput warehouse conveyor and pallet check-in.
5. **FEFO Priority Picking**: Outbound pick lists prioritize batches expiring soonest to eliminate expired waste.
6. **Deterministic SHA-256 Hash Chain**: `AuditLog.calculate_hash()` computes SHA-256 over `(timestamp, user_id, action, entity_type, entity_id, payload_json, previous_hash)`.

---

## 5. Environment & Service Endpoints
- **Nginx Gateway**: `http://localhost/` (Port 80)
- **Web Admin Dashboard**: `http://localhost:3000/` (Direct Next.js Dev / Prod)
- **PWA Mobile Scanner**: `http://localhost:5173/` or `http://localhost/pwa/`
- **Backend API Docs**: `http://localhost/docs` & `http://localhost:8000/docs` (FastAPI Swagger UI)

---

## 6. QA & Test Coverage
- **Pytest Backend Test Suite**: 41/41 unit & integration tests passing (100% pass rate).
- **Next.js Web Admin**: 0 TypeScript / Turbopack compilation errors.
- **Vite PWA Scanner**: 0 TypeScript / Vite rollup bundle errors.
