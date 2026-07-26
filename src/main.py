from fastapi import FastAPI
from src.core.config import settings
from src.api.routers import auth

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

@app.get("/")
def root():
    return {"message": "Welcome to Vetecura IMS"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
