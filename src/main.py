import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.core.config import settings
from src.api.routers import auth
from src.api.routers import suppliers, products, racks, purchase_orders, grn
from src.api.routers import dispatch, writeoffs, returns, cycle_counts

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Global Exception Handler to return clean error details and prevent blind 500s
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err_msg = str(exc)
    trace = traceback.format_exc()
    logging.error(f"Internal Server Error on {request.method} {request.url.path}: {err_msg}\n{trace}")
    return JSONResponse(
        status_code=500,
        content={"detail": {"error": "internal_server_error", "message": err_msg}}
    )

# Startup DB Schema Patch — safely adds any missing columns or seed defaults
@app.on_event("startup")
async def ensure_db_schema_patch():
    from src.db.session import AsyncSessionLocal
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as db:
            # 1. Safely add missing columns to goods_receipts if not yet present
            await db.execute(text("ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();"))
            await db.execute(text("ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS gate_entry_at TIMESTAMPTZ DEFAULT NOW();"))
            await db.execute(text("ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;"))
            await db.execute(text("ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS supplier_invoice_file_url TEXT;"))
            await db.execute(text("ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS ocr_extracted_json JSONB;"))
            
            # 2. Ensure at least one warehouse and rack exist so scanning never fails rack assignment
            await db.execute(text("""
                INSERT INTO warehouses (id, name, address, is_damage_warehouse)
                SELECT '00000000-0000-0000-0000-000000000001', 'Main Warehouse', 'Warehouse Dock 1', false
                WHERE NOT EXISTS (SELECT 1 FROM warehouses LIMIT 1);
            """))
            await db.execute(text("""
                INSERT INTO racks (id, warehouse_id, code, capacity_units, qr_label_code)
                SELECT '00000000-0000-0000-0000-000000000002', 
                       (SELECT id FROM warehouses LIMIT 1), 
                       'RACK-A01', 500, 'RACK-A01-QR'
                WHERE NOT EXISTS (SELECT 1 FROM racks LIMIT 1);
            """))
            await db.commit()
            print(" Database schema verified and patched on startup.")
    except Exception as e:
        print(f"⚠️ Startup schema patch notice: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1: Auth
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

# Phase 2: Inbound & Stock In
app.include_router(suppliers.router, prefix=f"{settings.API_V1_STR}/suppliers", tags=["suppliers"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(racks.router, prefix=f"{settings.API_V1_STR}/racks", tags=["racks"])
app.include_router(purchase_orders.router, prefix=f"{settings.API_V1_STR}/purchase-orders", tags=["purchase-orders"])
app.include_router(grn.router, prefix=f"{settings.API_V1_STR}/grn", tags=["grn"])

# Phase 3: Outbound & Anti-Theft
app.include_router(dispatch.router, prefix=f"{settings.API_V1_STR}/dispatch", tags=["dispatch"])
app.include_router(writeoffs.router, prefix=f"{settings.API_V1_STR}/writeoffs", tags=["writeoffs"])
app.include_router(returns.router, prefix=f"{settings.API_V1_STR}/returns", tags=["returns"])
app.include_router(cycle_counts.router, prefix=f"{settings.API_V1_STR}/cycle-counts", tags=["cycle-counts"])

# Phase 5: Alerts & Analytics
from src.api.routers import notifications, reports, users
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])




@app.get("/")
def root():
    return {"message": "Welcome to Vetecura IMS", "docs": "/docs"}


@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    from sqlalchemy import text
    from src.db.session import AsyncSessionLocal
    
    health = {"status": "healthy", "postgres": "disconnected", "redis": "disconnected"}
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            health["postgres"] = "healthy"
    except Exception as e:
        health["postgres"] = f"unhealthy: {str(e)}"
        health["status"] = "unhealthy"

    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(("redis", 6379))
        s.close()
        health["redis"] = "healthy"
    except Exception as e:
        health["redis"] = f"unhealthy: {str(e)}"

    return health
