# System Architecture — Vetecura IMS

## 1. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend (Web Admin) | Next.js 14 (App Router) + React | Owner/Manager/Purchase dashboards |
| Frontend (Warehouse) | PWA (React + Vite), IndexedDB | Installable on Android scanners/phones, offline-first |
| Backend | FastAPI (Python 3.11+) | Async, auto-generated OpenAPI docs |
| Database | PostgreSQL 15+ | Primary data store |
| Cache / Queue | Redis 7+ | Telegram alert queue, session cache, rate limiting |
| Auth | JWT (access + refresh tokens) + RBAC | Stateless auth, refresh rotation |
| Notifications | Telegram Bot API (Forum/Topics mode) | 5 topic groups |
| OCR | Tesseract / Google Cloud Vision API | Supplier invoice ingestion |
| Barcode/QR | `python-barcode` + `qrcode` (generation), ZXing/html5-qrcode (scanning in browser) | |
| Label Printing | ESC/POS via thermal printer driver (browser → USB/Bluetooth) | |
| Deployment | Docker + Docker Compose | Single VM initially, horizontally scalable later |
| Hosting | AWS EC2 / DigitalOcean Droplet (client-provided) | |

## 2. High-Level System Diagram (textual)

```
[Warehouse Staff PWA] ---(scan events, offline queue)---> [FastAPI Backend]
[Purchase/Manager/Owner Web App (Next.js)] ---(REST/JWT)---> [FastAPI Backend]
[FastAPI Backend] ---> [PostgreSQL] (all transactional data)
[FastAPI Backend] ---> [Redis] (queue for Telegram, cache, rate limit)
[Redis Worker] ---> [Telegram Bot API] (Stock In / Stock Out / Alerts / Security / Reports topics)
[FastAPI Backend] ---> [OCR Service] (invoice parsing on GRN creation)
[FastAPI Backend] ---> [Label Printer Driver] (barcode/QR label generation on demand)
```

## 3. Backend Folder Structure

```
vetecura-backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py            # env settings
│   │   ├── security.py          # JWT, password hashing
│   │   └── redis_client.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── models/               # SQLAlchemy models (1 file per domain, see 02_DATABASE_SCHEMA.md)
│   ├── api/
│   │   └── v1/
│   │       ├── routers/
│   │       │   ├── auth.py
│   │       │   ├── suppliers.py
│   │       │   ├── purchase_orders.py
│   │       │   ├── grn.py
│   │       │   ├── stock_in.py
│   │       │   ├── stock_out.py
│   │       │   ├── pick_lists.py
│   │       │   ├── racks.py
│   │       │   ├── batches.py
│   │       │   ├── writeoffs.py
│   │       │   ├── returns.py
│   │       │   ├── cycle_counts.py
│   │       │   ├── audit_logs.py
│   │       │   ├── reports.py
│   │       │   └── users.py
│   ├── services/
│   │   ├── ocr_service.py
│   │   ├── barcode_service.py
│   │   ├── audit_service.py      # hash-chain writer
│   │   ├── anomaly_service.py    # anomaly detection engine
│   │   ├── telegram_service.py
│   │   └── notification_queue.py # Redis producer/consumer
│   ├── schemas/                  # Pydantic request/response models
│   └── workers/
│       └── telegram_worker.py    # background consumer of Redis queue
├── alembic/                      # DB migrations
├── tests/
├── Dockerfile
└── requirements.txt
```

## 4. Frontend Folder Structure (Web Admin — Next.js)

```
vetecura-web/
├── app/
│   ├── (auth)/login/
│   ├── dashboard/
│   ├── suppliers/
│   ├── purchase-orders/
│   ├── grn/
│   ├── racks/
│   ├── stock/
│   ├── dispatch/
│   ├── writeoffs/
│   ├── returns/
│   ├── reports/
│   └── settings/
├── components/
├── lib/
│   ├── api-client.ts
│   └── auth.ts
└── styles/
```

## 5. Frontend Folder Structure (Warehouse PWA)

```
vetecura-pwa/
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── ScanStockIn.tsx
│   │   ├── ScanStockOut.tsx
│   │   ├── PickList.tsx
│   │   └── CycleCount.tsx
│   ├── offline/
│   │   ├── indexeddb.ts         # local scan queue
│   │   └── syncManager.ts       # syncs queued scans on reconnect
│   ├── scanner/
│   │   └── barcodeReader.ts     # camera + Bluetooth/USB scanner input handling
│   └── service-worker.ts
├── public/
│   └── manifest.json
```

## 6. Key Architectural Decisions

- **Immutable audit ledger**: append-only table, each row's hash includes the previous row's hash (blockchain-style chain). No UPDATE/DELETE permission granted at the DB role level for this table — enforced at Postgres role level, not just app level.
- **Offline-first PWA**: all scan events write to IndexedDB first, then sync to backend. UI never blocks on network — this is critical since warehouses often have poor wifi.
- **Redis-queued Telegram**: scan transactions must never wait on Telegram API latency. Every alert is pushed to a Redis list/stream; a background worker consumes and sends.
- **Modular core + vertical modules**: core engine (auth, RBAC, audit, product/rack master) is generic; Stock In/Out, Returns, Write-offs are pluggable modules — supports future verticals without redesign.
- **OCR is assistive, not authoritative**: OCR-extracted GRN data always requires human confirmation before it's committed — never auto-commits stock quantities from OCR alone.

## 7. Non-Functional Requirements

- API response time < 300ms for scan validation endpoints (this is the operational bottleneck — staff are standing at a rack waiting)
- Audit log write must be synchronous and block the transaction (never queued/async) — it's the anti-theft backbone
- System must handle at least 3,000 scans in a single GRN session without degradation
- All secrets (DB creds, JWT secret, Telegram bot token, OCR API key) in environment variables, never hardcoded
