import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add comprehensive security headers to all responses.
    Implements OWASP security header recommendations.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Get environment for conditional headers
        environment = os.getenv("ENVIRONMENT", "production")
        is_development = environment == "development"

        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature Policy)
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=(), "
            "vibrate=(), "
            "fullscreen=(self), "
            "sync-xhr=()"
        )
        response.headers["Permissions-Policy"] = permissions_policy

        # Content Security Policy
        # Disable CSP for API docs endpoints (Swagger UI)
        if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
            # No CSP for API documentation - allows Swagger UI to load properly
            pass
        elif is_development:
            # More permissive CSP for development
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "connect-src 'self' https: wss: ws://localhost:* http://localhost:*; "
                "media-src 'self' blob:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'self' https://huggingface.co https://*.hf.space;"
            )
            response.headers["Content-Security-Policy"] = csp
        else:
            # Strict CSP for production
            csp = (
                "default-src 'self'; "
                "script-src 'self' https://cdn.jsdelivr.net; "
                "style-src 'self' https://fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https: wss:; "
                "media-src 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'self' https://huggingface.co https://*.hf.space; "
                "upgrade-insecure-requests;"
            )
            response.headers["Content-Security-Policy"] = csp

        # HSTS for HTTPS connections
        if (
            request.url.scheme == "https"
            or request.headers.get("x-forwarded-proto") == "https"
        ):
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Additional security headers (skip for API docs)
        if request.url.path not in ["/docs", "/redoc", "/openapi.json"]:
            response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
            response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
            response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # Cache control for sensitive endpoints
        if any(
            path in request.url.path
            for path in ["/api/v1/patient/", "/api/v1/doctor/", "/api/v1/admin/"]
        ):
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, private"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        # Server header obfuscation
        response.headers["Server"] = "Netra-AI/1.0"

        # Remove potentially sensitive headers
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]

        return response
