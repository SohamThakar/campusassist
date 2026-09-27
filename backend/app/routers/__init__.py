from app.routers.auth import router as auth_router
from app.routers.complaints import router as complaints_router
from app.routers.technicians import router as technicians_router
from app.routers.assignments import router as assignments_router
from app.routers.analytics import router as analytics_router
from app.routers.notifications import router as notifications_router
from app.routers.websocket import router as ws_router

__all__ = [
    "auth_router",
    "complaints_router",
    "technicians_router",
    "assignments_router",
    "analytics_router",
    "notifications_router",
    "ws_router",
]
