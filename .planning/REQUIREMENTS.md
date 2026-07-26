## v1 Requirements

### Core Engine
- [ ] **CORE-01**: Database schema design and migration setup (PostgreSQL)
- [ ] **CORE-02**: Immutable audit ledger and hash-chained log implementation
- [ ] **CORE-03**: FastAPI core setup with RBAC and JWT auth (Owner, Warehouse Manager, Warehouse Staff, Purchase Team)

### Inbound
- [ ] **INBOUND-01**: Supplier management and Purchase Order (PO) approval workflow
- [ ] **INBOUND-02**: OCR invoice ingestion module
- [ ] **INBOUND-03**: GRN scan verification and Stock In logic
- [ ] **INBOUND-04**: Rack mapping and allocation

### Outbound
- [ ] **OUTBOUND-01**: Pick List generation engine
- [ ] **OUTBOUND-02**: Item-level dispatch scanning (Stock Out)
- [ ] **OUTBOUND-03**: Validation and blocking for unauthorized adjustments
- [ ] **OUTBOUND-04**: Damage and write-off sign-off workflow

### Frontend & Hardware
- [ ] **PWA-01**: Offline-first scanning app (PWA) with sync-on-reconnect
- [ ] **PWA-02**: Barcode scanner driver integration
- [ ] **PWA-03**: Thermal printer driver integration

### Analytics
- [ ] **ALERTS-01**: Redis event queue setup
- [ ] **ALERTS-02**: Telegram bot integration for alerts (5 topic groups)
- [ ] **ALERTS-03**: Operational & Compliance reports generation
- [ ] **ALERTS-04**: Executive dashboard for Owner (real-time inventory visibility)

## v2 Requirements (Deferred)
- Marketplace integrations (Amazon/Flipkart direct sync)

## Out of Scope
- Native mobile app — v1 ships as installable PWA, not App Store/Play Store native
- Multi-currency / multi-country tax handling — out of scope for v1
- Full accounting/ledger module — GST invoicing beyond basic dispatch docs is not required

## Traceability
