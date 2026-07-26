# Phase 1: Core Engine & Data Infrastructure

**Goal:** Set up the DB schema, immutable audit ledger, FastAPI core, and RBAC/JWT auth

## Requirements
- CORE-01: Database schema design and migration setup (PostgreSQL)
- CORE-02: Immutable audit ledger and hash-chained log implementation
- CORE-03: FastAPI core setup with RBAC and JWT auth

## Implementation Steps
1. Project Initialization & Tooling
   - Setup FastAPI app structure.
   - Configure Alembic for DB migrations.
   - Setup environment variables.
2. Database Schema
   - Create models for Users, Roles, and AuditLog.
   - Implement hash-chaining logic for the AuditLog.
3. Authentication & RBAC
   - Implement JWT-based auth routes.
   - Implement role-based permission dependencies for endpoints.
4. Validation & Testing
   - Ensure the hash chain works immutably.
   - Ensure RBAC properly blocks unauthorized access.
