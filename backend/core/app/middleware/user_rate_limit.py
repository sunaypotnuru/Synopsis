"""
User-Level Rate Limiting Middleware.

Features:
- Per-user rate limiting
- Role-based tiers
- In-memory storage (free tier)
- Sliding window algorithm

Based on 2026 API security best practices.
"""

import logging
import time
from collections import defaultdict, deque
from typing import Dict, Deque, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Rate limit tiers (requests per minute)
RATE_LIMITS = {
    "patient": 60,
    "doctor": 120,
    "admin": 300,
    "default": 30,  # For unauthenticated users
}

# In-memory storage for rate limiting
# Format: {user_id: deque of timestamps}
rate_limit_storage: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=1000))

# Paths that bypass rate limiting
BYPASS_PATHS = ["/health", "/docs", "/openapi.json", "/favicon.ico"]


class UserRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Per-user rate limiting middleware.

    Features:
    - Role-based rate limits
    - Sliding window algorithm
    - In-memory storage (free tier)
    - Rate limit headers
    """

    async def dispatch(self, request: Request, call_next):
        """Process request and enforce rate limits."""

        # Skip bypass paths
        if any(request.url.path.startswith(path) for path in BYPASS_PATHS):
            return await call_next(request)

        # Get user info from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        user_role = getattr(request.state, "user_role", "default")

        # Use IP as fallback identifier for unauthenticated users
        if not user_id:
            client_ip = request.client.host if request.client else "unknown"
            user_id = f"ip:{client_ip}"
            user_role = "default"

        # Get rate limit for user role
        limit = RATE_LIMITS.get(user_role, RATE_LIMITS["default"])

        # Check rate limit
        now = time.time()
        is_allowed, remaining, reset_time = self._check_rate_limit(user_id, limit, now)

        if not is_allowed:
            # Rate limit exceeded
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "limit": limit,
                    "reset_at": int(reset_time),
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(reset_time)),
                    "Retry-After": str(int(reset_time - now)),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_time))

        return response

    def _check_rate_limit(
        self, user_id: str, limit: int, now: float
    ) -> Tuple[bool, int, float]:
        """
        Check if user is within rate limit.

        Args:
            user_id: User identifier
            limit: Requests per minute
            now: Current timestamp

        Returns:
            Tuple of (is_allowed, remaining, reset_time)
        """
        # Get user's request history
        requests = rate_limit_storage[user_id]

        # Remove requests older than 1 minute (sliding window)
        window_start = now - 60
        while requests and requests[0] < window_start:
            requests.popleft()

        # Check if under limit
        current_count = len(requests)

        if current_count >= limit:
            # Rate limit exceeded
            # Reset time is when oldest request expires
            reset_time = requests[0] + 60 if requests else now + 60
            return False, 0, reset_time

        # Add current request
        requests.append(now)

        # Calculate remaining and reset time
        remaining = limit - (current_count + 1)
        reset_time = now + 60

        return True, remaining, reset_time
