from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import re
import json
import logging
from typing import List, Pattern

logger = logging.getLogger(__name__)


class SecurityInputValidationMiddleware(BaseHTTPMiddleware):
    """
    Advanced input validation middleware for maximum security.
    Prevents XSS, SQL injection, and other common attacks.
    """

    # Dangerous patterns that indicate potential attacks
    XSS_PATTERNS: List[Pattern] = [
        re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"vbscript:", re.IGNORECASE),
        re.compile(r"on\w+\s*=", re.IGNORECASE),
        re.compile(r"<iframe[^>]*>", re.IGNORECASE),
        re.compile(r"<object[^>]*>", re.IGNORECASE),
        re.compile(r"<embed[^>]*>", re.IGNORECASE),
        re.compile(r"<link[^>]*>", re.IGNORECASE),
        re.compile(r"<meta[^>]*>", re.IGNORECASE),
    ]

    SQL_INJECTION_PATTERNS: List[Pattern] = [
        re.compile(r"\bunion\s+select\b", re.IGNORECASE),
        re.compile(r"\bdrop\s+table\b", re.IGNORECASE),
        re.compile(r"\binsert\s+into\b", re.IGNORECASE),
        re.compile(r"\bdelete\s+from\b", re.IGNORECASE),
        re.compile(r"\bupdate\s+\w+\s+set\b", re.IGNORECASE),
        re.compile(r"\bselect\s+.*\bfrom\b", re.IGNORECASE),
        re.compile(r";\s*drop\s+", re.IGNORECASE),
        re.compile(r";\s*delete\s+", re.IGNORECASE),
        re.compile(r"'\s*or\s+'1'\s*=\s*'1", re.IGNORECASE),
        re.compile(r'"\s*or\s+"1"\s*=\s*"1', re.IGNORECASE),
    ]

    PATH_TRAVERSAL_PATTERNS: List[Pattern] = [
        re.compile(r"\.\./", re.IGNORECASE),
        re.compile(r"\.\.\\", re.IGNORECASE),
        re.compile(r"%2e%2e%2f", re.IGNORECASE),
        re.compile(r"%2e%2e%5c", re.IGNORECASE),
    ]

    # Paths that should skip validation (static assets, health checks)
    SKIP_PATHS = {"/health", "/", "/docs", "/openapi.json", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next):
        # Skip validation for certain paths
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Skip validation for static assets
        if any(
            request.url.path.startswith(prefix)
            for prefix in ["/static/", "/assets/", "/public/"]
        ):
            return await call_next(request)

        try:
            # Validate request body for POST/PUT/PATCH requests
            if request.method in ["POST", "PUT", "PATCH"]:
                await self._validate_request_body(request)

            # Validate query parameters
            self._validate_query_parameters(request)

            # Validate headers
            self._validate_headers(request)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Input validation error: {e}")
            raise HTTPException(status_code=400, detail="Invalid request format")

        response = await call_next(request)
        return response

    async def _validate_request_body(self, request: Request):
        """Validate request body for malicious content."""
        body = await request.body()
        if not body:
            return

        try:
            # Try to decode as text
            body_str = body.decode("utf-8")

            # Check for dangerous patterns
            if self._contains_malicious_patterns(body_str):
                logger.warning(
                    f"Malicious content detected in request body from {request.client.host}"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Request contains potentially malicious content",
                )

            # If it's JSON, validate the parsed content too
            if request.headers.get("content-type", "").startswith("application/json"):
                try:
                    json_data = json.loads(body_str)
                    self._validate_json_recursively(json_data)
                except json.JSONDecodeError:
                    # Not valid JSON, but that's okay for some endpoints
                    pass

        except UnicodeDecodeError:
            # Binary data (like file uploads), skip text validation
            # But check for basic malicious binary patterns
            if self._contains_malicious_binary_patterns(body):
                logger.warning(
                    f"Malicious binary content detected from {request.client.host}"
                )
                raise HTTPException(
                    status_code=400,
                    detail="File contains potentially malicious content",
                )

    def _validate_query_parameters(self, request: Request):
        """Validate query parameters for malicious content."""
        for key, value in request.query_params.items():
            if self._contains_malicious_patterns(value):
                logger.warning(
                    f"Malicious query parameter detected: {key} from {request.client.host}"
                )
                raise HTTPException(
                    status_code=400, detail=f"Invalid query parameter: {key}"
                )

    def _validate_headers(self, request: Request):
        """Validate headers for malicious content."""
        dangerous_headers = ["user-agent", "referer", "x-forwarded-for"]

        for header_name in dangerous_headers:
            header_value = request.headers.get(header_name, "")
            if header_value and self._contains_malicious_patterns(header_value):
                logger.warning(
                    f"Malicious header detected: {header_name} from {request.client.host}"
                )
                raise HTTPException(status_code=400, detail="Invalid request headers")

    def _validate_json_recursively(self, data):
        """Recursively validate JSON data for malicious content."""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and self._contains_malicious_patterns(value):
                    raise HTTPException(
                        status_code=400, detail=f"Invalid content in field: {key}"
                    )
                elif isinstance(value, (dict, list)):
                    self._validate_json_recursively(value)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, str) and self._contains_malicious_patterns(item):
                    raise HTTPException(
                        status_code=400, detail="Invalid content in array"
                    )
                elif isinstance(item, (dict, list)):
                    self._validate_json_recursively(item)

    def _contains_malicious_patterns(self, content: str) -> bool:
        """Check if content contains any malicious patterns."""
        if not content:
            return False

        # Check XSS patterns
        for pattern in self.XSS_PATTERNS:
            if pattern.search(content):
                return True

        # Check SQL injection patterns
        for pattern in self.SQL_INJECTION_PATTERNS:
            if pattern.search(content):
                return True

        # Check path traversal patterns
        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            if pattern.search(content):
                return True

        return False

    def _contains_malicious_binary_patterns(self, content: bytes) -> bool:
        """Check binary content for malicious patterns."""
        # Convert to lowercase for case-insensitive matching
        content_lower = content.lower()

        # Common malicious binary patterns
        dangerous_patterns = [
            b"<?php",
            b"<script",
            b"javascript:",
            b"vbscript:",
            b"eval(",
            b"exec(",
            b"system(",
            b"shell_exec(",
            b"passthru(",
            b"file_get_contents(",
        ]

        for pattern in dangerous_patterns:
            if pattern in content_lower:
                return True

        return False
