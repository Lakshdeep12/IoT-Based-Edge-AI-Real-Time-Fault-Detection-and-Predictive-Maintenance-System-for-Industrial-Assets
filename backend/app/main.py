import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, Base

# Import all models to ensure they are registered for create_all
from app.models import User, Device, Telemetry, Prediction, Alert, MaintenanceLog

# Import all routers
from app.api.auth import router as auth_router
from app.api.devices import router as devices_router
from app.api.telemetry import router as telemetry_router
from app.api.predictions import router as predictions_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.maintenance import router as maintenance_router

# Setup Logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

if settings.AUTO_CREATE_TABLES:
    # Convenient for local demos; production should run Alembic migrations instead.
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.exception(f"Database initialization failed: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Industrial Asset Health Monitoring & Predictive Maintenance Platform",
    version="1.0.0"
)

# Configure CORS for frontend consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under settings.API_V1_STR ("/api")
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(maintenance_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # Allow running directly for development/testing
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
