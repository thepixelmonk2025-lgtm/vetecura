# Deployment & Infrastructure — Vetecura IMS

---

## 1. Environments

| Environment | Purpose |
|---|---|
| Local Dev | Individual development, Docker Compose, seeded test data |
| Staging | Client UAT before go-live, mirrors production config with anonymized/sample data |
| Production | Live system, client-provided hosting |

## 2. Docker Compose Layout (Local / Staging)

```yaml
services:
  backend:
    build: ./vetecura-backend
    env_file: .env
    depends_on: [postgres, redis]
    ports: ["8000:8000"]

  telegram_worker:
    build: ./vetecura-backend
    command: python -m app.workers.telegram_worker
    env_file: .env
    depends_on: [redis, postgres]

  web:
    build: ./vetecura-web
    env_file: .env
    ports: ["3000:3000"]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: vetecura
      POSTGRES_USER: vetecura_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    volumes: ["redisdata:/data"]

volumes:
  pgdata:
  redisdata:
```

PWA (`vetecura-pwa`) is built as a static bundle and served via the same Next.js app or a lightweight static host — it does not need its own container.

## 3. Production Deployment

- Single VM (client-provided: AWS EC2, DigitalOcean Droplet, or similar) running Docker Compose is sufficient for Vetecura's scale (1–20 employee businesses, single or few warehouses).
- Reverse proxy (Nginx or Caddy) in front of `backend` and `web` containers, handling TLS termination (Let's Encrypt via Caddy is simplest to maintain).
- PostgreSQL and Redis run as containers on the same VM initially; can be split to managed services (RDS, ElastiCache/Redis Cloud) if scale later demands it — architecture doesn't need to change, only where the containers point.

## 4. Environment Variables (`.env` — never committed)

```
DATABASE_URL=postgresql://vetecura_app:***@postgres:5432/vetecura
REDIS_URL=redis://redis:6379/0
JWT_SECRET=***
JWT_ACCESS_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7
TELEGRAM_BOT_TOKEN=***
TELEGRAM_GROUP_CHAT_ID=***
OCR_PROVIDER=tesseract   # or google_vision
OCR_API_KEY=***          # if using a cloud OCR provider
OBJECT_STORAGE_BUCKET=***
OBJECT_STORAGE_ACCESS_KEY=***
OBJECT_STORAGE_SECRET_KEY=***
```

## 5. Database Migrations

- Alembic manages all schema changes — no manual `ALTER TABLE` in production ever.
- Migration workflow: write migration locally → test against staging → apply to production during a low-traffic window (early morning, before warehouse shift start).

## 6. Backup Strategy

- PostgreSQL: automated daily full backup + continuous WAL archiving (point-in-time recovery), retained minimum 30 days.
- Redis: persistence enabled (AOF) — queue data is transient by design (alerts, not source-of-truth), so Redis loss is recoverable from `audit_log` reconciliation, not catastrophic.
- Object storage (photo proofs, invoices): versioned bucket, standard cloud provider durability guarantees.
- **Backup restore drill required before go-live** — an untested backup is not a backup.

## 7. Hardware Setup (Client-Side)

| Item | Purpose | Notes |
|---|---|---|
| Barcode/QR scanner (handheld or fixed) | Item/rack/batch scanning | USB HID or Bluetooth; camera-based scanning via PWA also supported as fallback |
| Thermal label printer (network preferred) | Label printing (see `12_MODULE_LABEL_PRINTING.md`) | 2 units recommended: GRN desk, Dispatch bay |
| Android tablets/phones | Warehouse PWA runtime | Any modern Android device with a working camera, no special app store install needed (PWA "Add to Home Screen") |
| Server/VM | Application hosting | Sized for Vetecura's scale — 2 vCPU / 4GB RAM is a reasonable starting point, scalable later |

## 8. Go-Live Checklist

- [ ] Staging UAT signed off by Vetecura (per PRD Definition of Done)
- [ ] Production environment variables set, secrets rotated from staging values (never reuse staging secrets in production)
- [ ] TLS certificate active and auto-renewing
- [ ] Database backup + restore drill completed successfully
- [ ] Telegram bot connected to production group, test alert confirmed in all 5 topics
- [ ] Printers registered and network-reachable from production server
- [ ] All user accounts created with correct roles (per `09_RBAC_SECURITY.md` matrix), no shared logins
- [ ] Staff training completed on PWA scanning workflow (Stock In, Stock Out, Cycle Count)
- [ ] Manager/Owner training completed on approval workflows (PO, write-off, returns) and Web Admin dashboard
- [ ] Rollback plan documented (how to revert to pre-go-live state if a critical issue emerges in week one)

## 9. Post-Launch Monitoring

- Application logs centralized (even a simple hosted log service is sufficient at this scale) — not just container stdout lost on restart.
- Basic uptime monitoring on the backend health endpoint (`GET /health`) with alerting to Owner's phone/Telegram if the system goes down.
- Weekly review of the "Notification Health" panel (from `07_MODULE_TELEGRAM_ALERTS.md`) during the first month to catch delivery issues early.
