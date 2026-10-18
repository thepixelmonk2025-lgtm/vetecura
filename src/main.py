from fastapi import FastAPI
from src.core.config import settings
from src.api.routers import auth
from src.api.routers import suppliers, products, racks, purchase_orders, grn
from src.api.routers import dispatch, writeoffs, returns, cycle_counts

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

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
