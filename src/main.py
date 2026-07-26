from fastapi import FastAPI
from src.core.config import settings
from src.api.routers import auth
from src.api.routers import suppliers, products, racks, purchase_orders, grn
from src.api.routers import dispatch, writeoffs, returns, cycle_counts

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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
from src.api.routers import notifications, reports
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])




@app.get("/")
def root():
    return {"message": "Welcome to Vetecura IMS"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
