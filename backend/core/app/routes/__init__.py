# Export all routers from this module
from app.routes.patient import router as patient_router
from app.routes.doctor import router as doctor_router
from app.routes.admin import router as admin_router
from app.routes.video import router as video_router
from app.routes.ml import router as ml_router
from app.routes.translation import router as translation_router
from app.routes.hospitals import router as hospitals_router
from app.routes.reports import router as reports_router

__all__ = [
    "patient_router",
    "doctor_router",
    "admin_router",
    "video_router",
    "ml_router",
    "translation_router",
    "hospitals_router",
    "reports_router",
]
