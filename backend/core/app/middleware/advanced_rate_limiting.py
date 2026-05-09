from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
from typing import Dict
import hashlib

logger = logging.getLogger(__name__)


class AdvancedRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting with multiple strategies:
    - Per-IP rate limiting
    - Per-user rate limiting
    - Per-endpoint rate limiting
    - Adaptive rate limiting based on load
    """

    def __init__(self, app):
        super().__init__(app)
        # In-memory storage (use Redis in production)
        self.request_counts: Dict[str, Dict[str, int]] = {}
        self.last_reset: Dict[str, float] = {}

        # Rate limit configurations (requests per minute)
        self.rate_limits = {
            # Authentication endpoints - very strict
            "/api/v1/auth/login": {"requests": 5, "window": 60},
            "/api/v1/auth/register": {"requests": 3, "window": 60},
            "/api/v1/auth/reset-password": {"requests": 3, "window": 300},  # 5 minutes
            # File upload endpoints - moderate
            "/api/v1/patient/scans/upload": {"requests": 10, "window": 60},
            "/api/v1/patient/profile/upload-avatar": {"requests": 5, "window": 60},
            "/api/v1/documents/upload": {"requests": 20, "window": 60},
            # API endpoints - generous but controlled
            "/api/v1/patient/appointments": {"requests": 30, "window": 60},
            "/api/v1/doctor/prescriptions": {"requests": 50, "window": 60},
            "/api/v1/patient/dashboard": {"requests": 60, "window": 60},
            # Admin endpoints - moderate
            "/api/v1/admin/": {"requests": 100, "window": 60, "prefix": True},
            # Default limits
            "default": {"requests": 100, "window": 60},
        }

        # IP-based global limits (requests per minute)
        self.ip_limits = {
            "default": {"requests": 200, "window": 60},
            "strict": {"requests": 50, "window": 60},  # For suspicious IPs
        }

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static assets
        if self._should_skip_rate_limiting(request):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        user_id = self._get_user_id(request)
        endpoint = request.url.path

        try:
            # Check IP-based rate limits
            if not self._check_ip_rate_limit(client_ip):
                logger.warning(f"IP rate limit exceeded for {client_ip}")
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests from this IP address",
                    headers={"Retry-After": "60"},
                )

            # Check endpoint-specific rate limits
            if not self._check_endpoint_rate_limit(client_ip, user_id, endpoint):
                logger.warning(
                    f"Endpoint rate limit exceeded for {endpoint} from {client_ip}"
                )
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests to this endpoint",
                    headers={"Retry-After": "60"},
                )

            # Record the request
            self._record_request(client_ip, user_id, endpoint)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Don't block requests on rate limiting errors

        response = await call_next(request)

        # Add rate limit headers to response
        self._add_rate_limit_headers(response, client_ip, endpoint)

        return response

    def _should_skip_rate_limiting(self, request: Request) -> bool:
        """Determine if rate limiting should be skipped for this request."""
        skip_paths = {"/health", "/", "/docs", "/openapi.json", "/favicon.ico"}

        if request.url.path in skip_paths:
            return True

        # Skip for static assets
        if any(
            request.url.path.startswith(prefix)
            for prefix in ["/static/", "/assets/", "/public/"]
        ):
            return True

        return False

    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP address."""
        # Check for forwarded headers (from load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"

    def _get_user_id(self, request: Request) -> str:
        """Extract user ID from request if available."""
        # Try to get from request state (set by auth middleware)
        if hasattr(request.state, "user") and request.state.user:
            return request.state.user.sub

        # Try to extract from Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # Create a hash of the token as user identifier
            return hashlib.sha256(token.encode()).hexdigest()[:16]

        return "anonymous"

    def _get_rate_limit_config(self, endpoint: str) -> Dict[str, int]:
        """Get rate limit configuration for an endpoint."""
        # Check for exact match
        if endpoint in self.rate_limits:
            return self.rate_limits[endpoint]

        # Check for prefix matches
        for pattern, config in self.rate_limits.items():
            if config.get("prefix", False) and endpoint.startswith(pattern):
                return config

        # Return default
        return self.rate_limits["default"]

    def _check_ip_rate_limit(self, client_ip: str) -> bool:
        """Check if IP is within rate limits."""
        current_time = time.time()
        window_key = f"ip:{client_ip}"

        # Clean old entries
        self._cleanup_old_entries(window_key, current_time)

        # Get current count
        if window_key not in self.request_counts:
            self.request_counts[window_key] = {}

        current_minute = int(current_time // 60)
        current_count = self.request_counts[window_key].get(str(current_minute), 0)

        # Check against limit
        ip_config = self.ip_limits["default"]
        return current_count < ip_config["requests"]

    def _check_endpoint_rate_limit(
        self, client_ip: str, user_id: str, endpoint: str
    ) -> bool:
        """Check if endpoint access is within rate limits."""
        current_time = time.time()

        # Create unique key for this client/endpoint combination
        endpoint_key = f"endpoint:{client_ip}:{user_id}:{endpoint}"

        # Clean old entries
        self._cleanup_old_entries(endpoint_key, current_time)

        # Get current count
        if endpoint_key not in self.request_counts:
            self.request_counts[endpoint_key] = {}

        # Get rate limit config for this endpoint
        config = self._get_rate_limit_config(endpoint)
        window_size = config["window"]
        max_requests = config["requests"]

        # Calculate window start
        window_start = int((current_time - window_size) // 60)
        current_minute = int(current_time // 60)

        # Count requests in the current window
        total_requests = 0
        for minute in range(window_start, current_minute + 1):
            total_requests += self.request_counts[endpoint_key].get(str(minute), 0)

        return total_requests < max_requests

    def _record_request(self, client_ip: str, user_id: str, endpoint: str):
        """Record a request for rate limiting purposes."""
        current_time = time.time()
        current_minute = int(current_time // 60)

        # Record IP-based request
        ip_key = f"ip:{client_ip}"
        if ip_key not in self.request_counts:
            self.request_counts[ip_key] = {}
        self.request_counts[ip_key][str(current_minute)] = (
            self.request_counts[ip_key].get(str(current_minute), 0) + 1
        )

        # Record endpoint-based request
        endpoint_key = f"endpoint:{client_ip}:{user_id}:{endpoint}"
        if endpoint_key not in self.request_counts:
            self.request_counts[endpoint_key] = {}
        self.request_counts[endpoint_key][str(current_minute)] = (
            self.request_counts[endpoint_key].get(str(current_minute), 0) + 1
        )

    def _cleanup_old_entries(self, key: str, current_time: float):
        """Clean up old rate limiting entries to prevent memory leaks."""
        if key not in self.request_counts:
            return

        # Remove entries older than 1 hour
        cutoff_time = current_time - 3600
        cutoff_minute = int(cutoff_time // 60)

        to_remove = []
        for minute_str in self.request_counts[key]:
            if int(minute_str) < cutoff_minute:
                to_remove.append(minute_str)

        for minute_str in to_remove:
            del self.request_counts[key][minute_str]

    def _add_rate_limit_headers(self, response, client_ip: str, endpoint: str):
        """Add rate limiting headers to the response."""
        try:
            config = self._get_rate_limit_config(endpoint)
            current_time = time.time()

            # Calculate remaining requests
            endpoint_key = f"endpoint:{client_ip}:anonymous:{endpoint}"
            if endpoint_key in self.request_counts:
                window_size = config["window"]
                window_start = int((current_time - window_size) // 60)
                current_minute = int(current_time // 60)

                total_requests = 0
                for minute in range(window_start, current_minute + 1):
                    total_requests += self.request_counts[endpoint_key].get(
                        str(minute), 0
                    )

                remaining = max(0, config["requests"] - total_requests)
                reset_time = int((current_minute + 1) * 60)

                response.headers["X-RateLimit-Limit"] = str(config["requests"])
                response.headers["X-RateLimit-Remaining"] = str(remaining)
                response.headers["X-RateLimit-Reset"] = str(reset_time)
                response.headers["X-RateLimit-Window"] = str(config["window"])
        except Exception as e:
            logger.error(f"Error adding rate limit headers: {e}")
            # Don't fail the request if we can't add headers
