"""
In-memory sliding window rate limiting middleware for FastAPI.
Production rate limits (aligned with HIPAA/security blueprint):
  - login/auth:  5 requests per 60 seconds (brute-force protection)
  - register:    3 requests per 60 seconds
  - ai/scan:    10 requests per 60 seconds (compute cost)
  - triage/scribe: 20 requests per 60 seconds
  - general:   100 requests per 60 seconds

Also injects security headers on every response:
  - Strict-Transport-Security (HSTS)
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Referrer-Policy
"""

import time
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict

# Rate limit configurations: (max_requests, window_seconds)
RATE_LIMITS = {
    "default": (100, 60),
    "ai": (10, 60),  # Strict: AI scan /ai/scan
    "triage": (20, 60),  # Moderate: /ai/triage /scribe
    "auth": (5, 60),  # Very strict: login/auth endpoints
    "register": (3, 60),  # Very strict: registration endpoints
}


# Path-based rule matching - most specific first
def get_rate_limit_key(path: str) -> str:
    if "/signup" in path or "/register" in path:
        return "register"
    if "/login" in path or "/auth" in path:
        return "auth"
    if "/ai/scan" in path:
        return "ai"
    if "/triage" in path or "/scribe" in path or "/ai/" in path:
        return "triage"
    return "default"


# Security headers injected on every response
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self)",
}


class RateLimitingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # {ip: {limit_key: [timestamps]}}
        self._requests: dict = defaultdict(lambda: defaultdict(list))

    def _get_client_ip(self, request: Request) -> str:
        return (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.headers.get("X-Real-IP", "")
            or (request.client.host if request.client else "unknown")
        )

    async def dispatch(self, request: Request, call_next):
        # Skip health checks and docs from rate limiting
        if request.url.path in [
            "/api/v1/health",
            "/api/v1/health/detailed",
            "/docs",
            "/openapi.json",
            "/",
        ]:
            response = await call_next(request)
            for header, value in SECURITY_HEADERS.items():
                response.headers[header] = value
            return response

        ip = self._get_client_ip(request)
        limit_key = get_rate_limit_key(request.url.path)
        max_requests, window = RATE_LIMITS[limit_key]

        now = time.time()
        window_start = now - window

        # Sliding window: prune expired timestamps
        self._requests[ip][limit_key] = [
            ts for ts in self._requests[ip][limit_key] if ts > window_start
        ]

        if len(self._requests[ip][limit_key]) >= max_requests:
            retry_after = int(window - (now - self._requests[ip][limit_key][0]))
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    "limit": max_requests,
                    "window_seconds": window,
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after), **SECURITY_HEADERS},
            )

        self._requests[ip][limit_key].append(now)
        response = await call_next(request)

        # Inject rate-limit and security headers on every response
        remaining = max_requests - len(self._requests[ip][limit_key])
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(window_start + window))
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        return response
