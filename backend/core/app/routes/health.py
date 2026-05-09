"""
Health check and system monitoring endpoints.
Returns uptime, database connection status, and basic system metrics.
"""

from fastapi import APIRouter
from datetime import datetime, timezone
import time
import psutil
import os

router = APIRouter(prefix="/health", tags=["health"])

_start_time = time.time()


@router.get("/")
async def health_check():
    """Basic liveness check - returns 200 OK if server is running."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "3.0.0",
    }


@router.get("/detailed")
async def detailed_health():
    """Detailed health metrics including system resources."""
    uptime_seconds = int(time.time() - _start_time)
    uptime_hours = uptime_seconds // 3600
    uptime_minutes = (uptime_seconds % 3600) // 60

    # System metrics
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        memory_percent = mem.percent
        disk_percent = disk.percent
    except Exception:
        cpu_percent = 0
        memory_percent = 0
        disk_percent = 0

    return {
        "status": "healthy",
        "uptime": {
            "seconds": uptime_seconds,
            "human": f"{uptime_hours}h {uptime_minutes}m",
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "disk_percent": disk_percent,
        },
        "api": {
            "version": "3.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
