from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from app.services.supabase import supabase

logger = logging.getLogger(__name__)


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log user activity."""

    async def dispatch(self, request: Request, call_next):
        # Skip logging for health checks and static files
        if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        # Get user from request if authenticated
        user_id = None
        if hasattr(request.state, "user"):
            user_id = request.state.user.sub

        # Process request
        response = await call_next(request)

        # Log activity for authenticated users on successful requests
        if user_id and 200 <= response.status_code < 300:
            try:
                # Determine action from method and path
                action = f"{request.method} {request.url.path}"

                # Extract resource info
                resource_type = None
                resource_id = None
                path_parts = request.url.path.split("/")
                if len(path_parts) >= 4:
                    resource_type = path_parts[3]  # e.g., "appointments", "scans"
                if len(path_parts) >= 5:
                    resource_id = path_parts[4]  # e.g., appointment ID

                # Log to database (async, don't wait)
                log_data = {
                    "user_id": user_id,
                    "action": action,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                }

                # Fire and forget - don't block response
                supabase.table("activity_logs").insert(log_data).execute()
            except Exception as e:
                logger.error(f"Error logging activity: {e}")

        return response
