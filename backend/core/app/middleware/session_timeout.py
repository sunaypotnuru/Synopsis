"""
Session Timeout Middleware (HIPAA Compliant).

Automatically tracks user activity and enforces 15-minute idle timeout.
Complies with HIPAA 45 CFR § 164.312(a)(2)(iii) - Automatic Logoff.
"""

import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.services.session_service import get_session_service, SessionExpiredError

logger = logging.getLogger(__name__)

# Paths that don't require session tracking
EXCLUDED_PATHS = [
    "/health",
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/auth/reset-password",
    "/docs",
    "/openapi.json",
    "/favicon.ico",
]


class SessionTimeoutMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce session timeout.

    Features:
    - Tracks last activity timestamp
    - Auto-logout on 15-minute idle timeout
    - Session extension on valid activity
    - Hard termination (HIPAA compliant)
    """

    async def dispatch(self, request: Request, call_next):
        """Process request and track session activity."""

        # Skip excluded paths
        if any(request.url.path.startswith(path) for path in EXCLUDED_PATHS):
            return await call_next(request)

        # Get session token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            # No session token, continue without tracking
            return await call_next(request)

        session_token = auth_header.replace("Bearer ", "").strip()

        if not session_token:
            return await call_next(request)

        try:
            session_service = get_session_service()

            # Check session validity
            is_valid = await session_service.check_session_validity(session_token)

            if not is_valid:
                # Session expired or invalid
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Session expired due to inactivity. Please log in again.",
                        "error_code": "SESSION_EXPIRED",
                        "requires_reauth": True,
                    },
                )

            # Update activity timestamp (extends session)
            try:
                await session_service.update_activity(session_token)
            except SessionExpiredError:
                # Session expired during request
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Session expired due to inactivity. Please log in again.",
                        "error_code": "SESSION_EXPIRED",
                        "requires_reauth": True,
                    },
                )

            # Process request
            response = await call_next(request)

            # Add session info to response headers
            try:
                seconds_remaining = await session_service.get_time_until_expiry(
                    session_token
                )
                if seconds_remaining is not None:
                    response.headers["X-Session-Expires-In"] = str(seconds_remaining)

                    # Add warning header if close to expiry
                    should_warn = await session_service.should_show_warning(
                        session_token
                    )
                    if should_warn:
                        response.headers["X-Session-Warning"] = "true"
            except Exception as e:
                logger.warning(f"Failed to add session headers: {e}")

            return response

        except Exception as e:
            logger.error(f"Session timeout middleware error: {e}")
            # Don't block request on middleware error
            return await call_next(request)
