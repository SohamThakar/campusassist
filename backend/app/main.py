import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.seed import seed_data
from app.routers import (
    auth_router,
    complaints_router,
    technicians_router,
    assignments_router,
    analytics_router,
    notifications_router,
    ws_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure upload directory exists, initialize dev DB if needed, seed administrative accounts
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    try:
        await seed_data()
    except Exception as e:
        print(f"Seed note: {e}")
    yield
    # Shutdown: Clean up resources if any

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Smart Campus — Campus Facility Maintenance Management System",
    lifespan=lifespan,
)

# CORS Middleware: Enforce production domains while supporting local dev origins
origins = settings.cors_origins_list
has_wildcard = "*" in origins or not origins

if has_wildcard:
    # Development origin regex reflection allowing localhost ports with credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount local uploads folder for static photo delivery
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API v1 Routers
api_v1_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(complaints_router, prefix=api_v1_prefix)
app.include_router(technicians_router, prefix=api_v1_prefix)
app.include_router(assignments_router, prefix=api_v1_prefix)
app.include_router(analytics_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)

# WebSocket Router: Mount at root /ws and under /api/v1/ws for reverse proxy flexibility
app.include_router(ws_router)
app.include_router(ws_router, prefix=api_v1_prefix)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Smart Campus API",
        "docs_url": "/docs",
        "api_v1": api_v1_prefix,
    }
