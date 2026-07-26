# RBAC & Security — Vetecura IMS

---

## 1. Roles

| Role | Description |
|---|---|
| Owner | Full system access, financial visibility, RBAC control, audit chain verification |
| Warehouse Manager | Operational control: PO/GRN approval, dispatch oversight, write-off/return approval, rack config |
| Warehouse Staff | Execution only: scanning (Stock In, Stock Out, Cycle Count), label printing, requesting (not approving) write-offs |
| Purchase Team | Supplier/PO drafting, price history and vendor performance visibility |

## 2. Full Permission Matrix

| Capability | Owner | Manager | Staff | Purchase |
|---|:---:|:---:|:---:|:---:|
| View dashboard (own role's view) | ✅ | ✅ | ✅ | ✅ |
| Create/edit products | ✅ | ✅ | ❌ | ❌ |
| Create supplier | ✅ | ❌ | ❌ | ✅ |
| Draft PO | ✅ | ❌ | ❌ | ✅ |
| Approve/reject PO | ✅ | ✅ | ❌ | ❌ |
| Gate entry / start GRN | ✅ | ✅ | ✅ | ❌ |
| Scan Stock In items | ✅ | ✅ | ✅ | ❌ |
| Confirm OCR/batch fields | ✅ | ✅ | ❌ | ❌ |
| Complete/close GRN | ✅ | ✅ | ❌ | ❌ |
| Create rack / rack template | ✅ | ✅ | ❌ | ❌ |
| Generate pick list | ✅ | ✅ | ❌ | ❌ |
| Scan Stock Out items | ✅ | ✅ | ✅ | ❌ |
| Complete dispatch (normal) | ✅ | ✅ | ✅ | ❌ |
| Force-close mismatched dispatch | ✅ | ✅ | ❌ | ❌ |
| Request write-off | ✅ | ✅ | ✅ | ❌ |
| Approve/reject write-off | ✅ | ✅ | ❌ | ❌ |
| Log return | ✅ | ✅ | ✅ | ❌ |
| Inspect/route return | ✅ | ✅ | ❌ | ❌ |
| Schedule cycle count | ✅ | ✅ | ❌ | ❌ |
| Perform cycle count scan | ✅ | ✅ | ✅ | ❌ |
| Confirm cycle count variance adjustment | ✅ | ✅ | ❌ | ❌ |
| Print/reprint labels | ✅ | ✅ | ✅ | ❌ |
| Create/edit label templates | ✅ | ✅ | ❌ | ❌ |
| Register printers | ✅ | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ |
| Verify audit hash chain | ✅ | ❌ | ❌ | ❌ |
| View Operational reports | ✅ | ✅ | Own actions only | Low-stock only |
| View Compliance reports | ✅ | ✅ | ❌ | ❌ |
| View vendor performance | ✅ | ✅ | ❌ | ✅ |
| Manage users / roles | ✅ | ❌ | ❌ | ❌ |
| Configure anomaly thresholds | ✅ | ❌ | ❌ | ❌ |
| Configure Telegram alert routing | ✅ | ❌ | ❌ | ❌ |

This matrix is the single source of truth — every endpoint in `03_API_SPECIFICATION.md` and each module doc's role column must trace back to this table. Any discrepancy found during development should be resolved by updating this table first, then the endpoint.

## 3. Enforcement Layers

1. **JWT claims** — access token encodes `user_id` and `role`; every request is authenticated via Bearer token.
2. **Route-level dependency** — FastAPI dependency (`require_role(["manager","owner"])`) guards each endpoint; unauthorized calls return `403 forbidden_role`, never a silent empty response.
3. **Row-level scoping** — for Staff viewing "own actions only" reports, queries are filtered by `scanned_by = current_user.id` at the query level, not filtered client-side (never trust the frontend to hide data it already received).
4. **Database role separation** — the application's DB connection role has no UPDATE/DELETE grant on `audit_log`, independent of what the application code does or doesn't enforce. Defense in depth: even a compromised backend can't rewrite history.

## 4. Auth Flow

```
POST /auth/login (email + password)
   → validate password hash (bcrypt/argon2)
   → issue access_token (JWT, short-lived, ~15min) + refresh_token (long-lived, ~7 days, stored hashed in DB)
   → client stores access_token in memory, refresh_token in httpOnly secure cookie (web) or secure storage (PWA)

On access_token expiry:
   POST /auth/refresh (refresh_token)
   → validate against `refresh_tokens` table (not revoked, not expired)
   → issue new access_token
   → rotate refresh_token (invalidate old, issue new) — prevents replay if a refresh token is ever leaked

On logout:
   POST /auth/logout → mark refresh_token revoked in DB
```

## 5. Password & Account Security

- Passwords hashed with bcrypt or argon2, never reversible encryption.
- Minimum password policy enforced at signup/reset: 8+ characters, not on a common-password blocklist.
- Account lockout after repeated failed login attempts (e.g. 5 attempts → 15 minute lockout) — logged as a security event.
- No shared logins — every scan/action must trace to one specific user account, since the entire anti-theft model depends on individual accountability.

## 6. Data Protection

- All API traffic over HTTPS/TLS only — no plaintext HTTP in production, including internal network calls where feasible.
- Secrets (DB credentials, JWT signing key, Telegram bot token, OCR API key) stored in environment variables / secrets manager, never committed to source control.
- Photo proof uploads (write-offs) and invoice uploads (OCR) stored in access-controlled object storage (e.g. S3-compatible bucket with signed URLs), not publicly readable by default.

## 7. Session & Device Considerations for Warehouse PWA

- PWA sessions on shared warehouse tablets/scanners should support quick user-switching (e.g. PIN-based re-auth) without requiring full logout/login for every shift change — improves usability without weakening the "every scan traces to one user" requirement.
- Idle session timeout on shared devices (e.g. auto-lock after 10 minutes of inactivity) to prevent one staff member's session being used by another.

## 8. Definition of Done

- [ ] Every endpoint in `03_API_SPECIFICATION.md` enforces the exact role restriction defined in the matrix above (verified via automated role-based access tests, not manual spot-checks)
- [ ] Refresh token rotation confirmed — reusing an old (rotated-out) refresh token is rejected
- [ ] Row-level scoping confirmed for Staff reports (a Staff account cannot retrieve another staff member's scan history via API manipulation)
- [ ] Account lockout behavior tested and logged correctly
- [ ] Confirmed application DB role cannot UPDATE/DELETE `audit_log` even via a direct crafted query
