# Phase 1 Context: Core Engine & Data Infrastructure

## Domain
Set up the DB schema, immutable audit ledger, FastAPI core, and RBAC/JWT auth.

## Decisions

### DB Migrations
- **Tooling:** Use Alembic for PostgreSQL database migrations.

## Canonical Refs
- `01_ARCHITECTURE.md` (Tech stack, system architecture, folder structure)
- `02_DATABASE_SCHEMA.md` (Full PostgreSQL schema with relationships)
- `09_RBAC_SECURITY.md` (Roles, permissions matrix, JWT/auth flow)
