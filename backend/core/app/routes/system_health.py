"""
System Health Monitoring Routes
Provides real-time health status of all microservices and system components.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
from datetime import datetime, timedelta
import httpx
import asyncio
import os
from app.core.security import get_current_admin
from app.models.schemas import TokenPayload
from app.core.config import settings
from app.services.supabase import supabase

router = APIRouter(prefix="/admin/system-health", tags=["admin", "system-health"])

_periodic_health_task: asyncio.Task | None = None


def _get_main_api_health_url() -> str:
    """Resolve primary API health URL without relying on fragile frontend port replacement."""
    backend_url = os.getenv("BACKEND_URL")
    if backend_url:
        return f"{backend_url.rstrip('/')}/health"

    # Fallback for local/dev when BACKEND_URL is not set.
    return "http://localhost:8000/health"


def _get_a2a_health_url() -> str:
    """Resolve A2A agent health URL from environment with local fallback."""
    a2a_url = os.getenv("A2A_AGENT_URL")
    if a2a_url:
        return f"{a2a_url.rstrip('/')}/health"
    return "http://localhost:8081/health"


# Microservice endpoints with ports
MICROSERVICES = [
    {
        "name": "Main API Gateway",
        "url": _get_main_api_health_url(),
        "port": 8000,
        "id": "core",
    },
    {
        "name": "Anemia Detection",
        "url": f"{settings.ANEMIA_API_URL}/health",
        "port": 8001,
        "id": "anemia",
    },
    {
        "name": "Diabetic Retinopathy",
        "url": f"{settings.DR_API_URL}/health",
        "port": 8002,
        "id": "dr",
    },
    {
        "name": "Mental Health Analysis",
        "url": f"{settings.MENTAL_HEALTH_API_URL}/health",
        "port": 8003,
        "id": "mental-health",
    },
    {
        "name": "Parkinson's Voice Analysis",
        "url": f"{settings.PARKINSONS_API_URL}/health",
        "port": 8004,
        "id": "parkinsons",
    },
    {
        "name": "Cataract Detection",
        "url": f"{settings.CATARACT_API_URL}/health",
        "port": 8005,
        "id": "cataract",
    },
    {
        "name": "Mental Health Chatbot",
        "url": f"{settings.CHATBOT_API_URL}/health",
        "port": 8006,
        "id": "chatbot",
    },
    {
        "name": "Emergency Services",
        "url": f"{settings.EMERGENCY_API_URL}/health",
        "port": 8007,
        "id": "emergency",
    },
    {
        "name": "LibreTranslate",
        "url": f"{settings.LIBRETRANSLATE_URL}/languages",
        "port": 5000,
        "id": "translation",
    },
    # MCP Server Infrastructure
    {
        "name": "NetraAI MCP Server (HuggingFace)",
        "url": "https://sunay-potnuru-netra-mcp-server.hf.space/health",
        "port": 8080,
        "id": "mcp-server",
    },
    {
        "name": "Supabase Edge Function (MCP Proxy)",
        "url": f"{os.getenv('SUPABASE_URL', '')}/functions/v1/mcp-proxy/health",
        "port": 443,
        "id": "mcp-proxy",
    },
    {
        "name": "A2A Agent Server",
        "url": _get_a2a_health_url(),
        "port": 8081,
        "id": "a2a-agent",
    },
]


async def check_service_health(service_info: Dict) -> Dict:
    """Check health of a single microservice with resilient fallback."""
    url = service_info["url"]
    service_name = service_info["name"]
    port = service_info["port"]
    service_id = service_info["id"]

    try:
        start_time = datetime.now()
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)

            # Fallback for HF/Render spaces that might not have /health but are alive at root
            if response.status_code == 404 and "/health" in url:
                root_url = url.replace("/health", "")
                response = await client.get(root_url)

            latency_ms = (datetime.now() - start_time).total_seconds() * 1000

            # 200 OK is healthy, 401/403/405/422 often mean service is up but needs specific input
            status = (
                "healthy"
                if response.status_code in [200, 401, 403, 405, 422]
                else "unhealthy"
            )

            return {
                "name": service_name,
                "id": service_id,
                "port": port,
                "status": status,
                "latency_ms": round(latency_ms, 2),
                "status_code": response.status_code,
                "last_check": datetime.now().isoformat(),
                "error_message": (
                    None
                    if status == "healthy"
                    else f"Status {response.status_code} returned"
                ),
            }
    except httpx.TimeoutException:
        return {
            "name": service_name,
            "id": service_id,
            "port": port,
            "status": "timeout",
            "latency_ms": 10000,
            "status_code": None,
            "last_check": datetime.now().isoformat(),
            "error_message": "Service timeout after 10 seconds (potential cold start)",
        }
    except Exception as e:
        return {
            "name": service_name,
            "id": service_id,
            "port": port,
            "status": "down",
            "latency_ms": None,
            "status_code": None,
            "last_check": datetime.now().isoformat(),
            "error_message": str(e),
        }


async def _best_effort_store_health_results(
    service_results: List[Dict[str, Any]],
) -> None:
    """
    Best-effort persistence of health check results.
    If the `service_health` table doesn't exist or Supabase is misconfigured, this becomes a no-op.
    """
    try:
        for result in service_results:
            supabase.table("service_health").insert(
                {
                    "service_name": result["name"],
                    "status": result["status"],
                    "latency_ms": result["latency_ms"],
                    "status_code": result.get("status_code"),
                    "error_message": result["error_message"],
                    "checked_at": datetime.now().isoformat(),
                }
            ).execute()
    except Exception:
        # Intentionally swallow to avoid crashing the API due to monitoring persistence issues
        return


async def _periodic_health_monitor(interval_seconds: int) -> None:
    while True:
        try:
            service_checks = [
                check_service_health(service) for service in MICROSERVICES
            ]
            service_results = await asyncio.gather(*service_checks)
            await _best_effort_store_health_results(service_results)
        except Exception:
            # Keep the loop running even if a single cycle fails
            pass

        await asyncio.sleep(max(30, interval_seconds))


def start_periodic_health_monitor() -> None:
    """
    Start a periodic health check loop (opt-in).
    Controlled by env:
      - ENABLE_PERIODIC_HEALTHCHECKS=true/false (default false)
      - HEALTHCHECK_INTERVAL_SECONDS (default 300)
    """
    global _periodic_health_task
    if _periodic_health_task and not _periodic_health_task.done():
        return

    if os.getenv("ENABLE_PERIODIC_HEALTHCHECKS", "false").lower() != "true":
        return

    try:
        interval = int(os.getenv("HEALTHCHECK_INTERVAL_SECONDS", "300"))
    except Exception:
        interval = 300

    _periodic_health_task = asyncio.create_task(_periodic_health_monitor(interval))


def stop_periodic_health_monitor() -> None:
    global _periodic_health_task
    if _periodic_health_task and not _periodic_health_task.done():
        _periodic_health_task.cancel()
    _periodic_health_task = None


async def check_database_health() -> Dict:
    """Check database connectivity and performance."""
    try:
        start_time = datetime.now()
        # Simple query to test database
        # Use a stable, always-present table in our schema.
        supabase.table("profiles_patient").select("id").limit(1).execute()
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000

        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "connected": True,
            "error_message": None,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "latency_ms": None,
            "connected": False,
            "error_message": str(e),
        }


async def check_redis_health() -> Dict:
    """Check Redis connectivity."""
    try:
        import redis.asyncio as redis

        start_time = datetime.now()
        r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))
        await r.ping()
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000

        return {
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
            "connected": True,
            "error_message": None,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "latency_ms": None,
            "connected": False,
            "error_message": str(e),
        }


@router.get("")
async def get_system_health(current_user: TokenPayload = Depends(get_current_admin)):
    """
    Get current health status of all microservices and system components.

    Returns:
    - Service health for all 8 microservices
    - Database connectivity
    - Overall system status
    - Response times
    - Error rates
    """
    # Check all microservices concurrently
    service_checks = [check_service_health(service) for service in MICROSERVICES]
    service_results = await asyncio.gather(*service_checks)

    # Check database
    database_health = await check_database_health()

    # Check redis
    redis_health = await check_redis_health()

    # Calculate overall system status
    healthy_services = sum(1 for s in service_results if s["status"] == "healthy")
    total_services = len(service_results)

    overall_status = (
        "healthy"
        if healthy_services == total_services
        else "degraded" if healthy_services > 0 else "down"
    )

    # Calculate average response time
    response_times = [
        s["latency_ms"] for s in service_results if s["latency_ms"] is not None
    ]
    avg_response_time = (
        round(sum(response_times) / len(response_times), 2) if response_times else None
    )

    # Calculate uptime percentage (based on current check)
    uptime_percentage = round((healthy_services / total_services) * 100, 2)

    # Add database and redis to service results for unified display
    all_service_results = list(service_results)
    all_service_results.append(
        {
            "name": "Database (Supabase)",
            "id": "database",
            "port": 5432,
            "status": database_health["status"],
            "latency_ms": database_health["latency_ms"],
            "status_code": 200 if database_health["connected"] else 500,
            "last_check": datetime.now().isoformat(),
            "error_message": database_health["error_message"],
        }
    )
    all_service_results.append(
        {
            "name": "Cache (Redis)",
            "id": "redis",
            "port": 6379,
            "status": redis_health["status"],
            "latency_ms": redis_health["latency_ms"],
            "status_code": 200 if redis_health["connected"] else 500,
            "last_check": datetime.now().isoformat(),
            "error_message": redis_health["error_message"],
        }
    )

    return {
        "overall_status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "services": all_service_results,
        "database": database_health,
        "redis": redis_health,
        "metrics": {
            "healthy_services": healthy_services,
            "total_services": total_services,
            "uptime_percentage": uptime_percentage,
            "avg_response_time_ms": avg_response_time,
        },
    }


@router.get("/history")
async def get_system_health_history(
    hours: int = 24, current_user: TokenPayload = Depends(get_current_admin)
):
    """
    Get historical health data for system monitoring.

    Parameters:
    - hours: Number of hours of history to retrieve (default: 24)

    Returns:
    - Historical health check data
    - Uptime statistics
    - Response time trends
    - Error rate trends
    """
    try:
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)

        # Query service_health table for historical data
        result = (
            supabase.table("service_health")
            .select("*")
            .gte("checked_at", start_time.isoformat())
            .lte("checked_at", end_time.isoformat())
            .order("checked_at", desc=False)
            .execute()
        )

        health_records = result.data if result.data else []

        # Group by service
        services_history: Dict[str, List[Dict[str, Any]]] = {}
        for record in health_records:
            service_name = record["service_name"]
            if service_name not in services_history:
                services_history[service_name] = []
            services_history[service_name].append(
                {
                    "timestamp": record["checked_at"],
                    "status": record["status"],
                    "latency_ms": record["latency_ms"],
                    "error_message": record.get("error_message"),
                }
            )

        # Calculate statistics for each service
        service_stats = {}
        for service_name, history in services_history.items():
            total_checks = len(history)
            healthy_checks = sum(1 for h in history if h["status"] == "healthy")
            uptime_percentage = (
                round((healthy_checks / total_checks) * 100, 2)
                if total_checks > 0
                else 0
            )

            latencies = [
                h["latency_ms"] for h in history if h["latency_ms"] is not None
            ]
            avg_latency = (
                round(sum(latencies) / len(latencies), 2) if latencies else None
            )

            service_stats[service_name] = {
                "uptime_percentage": uptime_percentage,
                "total_checks": total_checks,
                "healthy_checks": healthy_checks,
                "avg_latency_ms": avg_latency,
                "history": history,
            }

        return {
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours,
            },
            "services": service_stats,
            "total_records": len(health_records),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve health history: {str(e)}"
        )


@router.post("/check")
async def trigger_health_check(current_user: TokenPayload = Depends(get_current_admin)):
    """
    Manually trigger a health check and store results in database.

    This endpoint performs a health check and stores the results
    in the service_health table for historical tracking.
    """
    # Perform health check
    service_checks = [check_service_health(service) for service in MICROSERVICES]
    service_results = await asyncio.gather(*service_checks)

    # Store results in database
    try:
        for result in service_results:
            supabase.table("service_health").insert(
                {
                    "service_name": result["name"],
                    "status": result["status"],
                    "latency_ms": result["latency_ms"],
                    "status_code": result.get("status_code"),
                    "error_message": result["error_message"],
                    "checked_at": datetime.now().isoformat(),
                }
            ).execute()

        return {
            "message": "Health check completed and stored",
            "timestamp": datetime.now().isoformat(),
            "services_checked": len(service_results),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to store health check results: {str(e)}"
        )
