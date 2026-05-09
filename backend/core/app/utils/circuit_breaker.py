"""
Circuit Breaker Pattern for ML Model Serving.

Prevents cascade failures by monitoring failure rates and temporarily
blocking requests to unhealthy services.

Based on industry best practices from:
- Martin Fowler's Circuit Breaker pattern
- Netflix Hystrix design
- AWS Well-Architected Framework

FREE TIER: Pure Python implementation, no external services required.
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation, requests pass through
    OPEN = "open"  # Failure threshold exceeded, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""

    # Failure threshold
    failure_threshold: int = 5  # Open circuit after N failures
    failure_timeout: float = 60.0  # Reset failure count after N seconds

    # Recovery settings
    recovery_timeout: float = 30.0  # Try recovery after N seconds
    success_threshold: int = 2  # Close circuit after N successes in half-open

    # Monitoring
    window_size: int = 100  # Track last N requests for metrics


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""

    pass


class CircuitBreaker:
    """
    Circuit breaker for protecting against cascade failures.

    States:
    - CLOSED: Normal operation, all requests pass through
    - OPEN: Too many failures, fail fast without calling service
    - HALF_OPEN: Testing recovery, allow limited requests through

    Example:
        breaker = CircuitBreaker(name="anemia-model")

        try:
            result = await breaker.call(call_ml_model, image_data)
        except CircuitBreakerOpenError:
            # Circuit is open, use fallback
            result = get_fallback_response()
    """

    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """
        Initialize circuit breaker.

        Args:
            name: Name of the protected service
            config: Circuit breaker configuration
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()

        # State
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._opened_at: Optional[float] = None

        # Metrics
        self._total_requests = 0
        self._total_failures = 0
        self._total_successes = 0
        self._recent_requests: list[tuple[float, bool]] = []  # (timestamp, success)

        # Lock for thread safety
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        return self._state

    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal operation)."""
        return self._state == CircuitState.CLOSED

    @property
    def is_open(self) -> bool:
        """Check if circuit is open (failing fast)."""
        return self._state == CircuitState.OPEN

    @property
    def is_half_open(self) -> bool:
        """Check if circuit is half-open (testing recovery)."""
        return self._state == CircuitState.HALF_OPEN

    async def call(self, func: Callable, *args, **kwargs):
        """
        Execute function with circuit breaker protection.

        Args:
            func: Async function to call
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            CircuitBreakerOpenError: If circuit is open
            Exception: If function fails
        """
        async with self._lock:
            # Check if we should attempt the call
            if not await self._should_attempt():
                raise CircuitBreakerOpenError(
                    f"Circuit breaker '{self.name}' is OPEN. "
                    f"Service is unavailable."
                )

        # Attempt the call
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result

        except Exception as e:
            await self._on_failure(e)
            raise

    async def _should_attempt(self) -> bool:
        """
        Check if request should be attempted.

        Returns:
            True if request should proceed, False otherwise
        """
        current_time = time.time()

        # CLOSED state: Always attempt
        if self._state == CircuitState.CLOSED:
            return True

        # OPEN state: Check if recovery timeout elapsed
        if self._state == CircuitState.OPEN:
            if self._opened_at is None:
                # Should not happen, but handle gracefully
                self._state = CircuitState.HALF_OPEN
                return True

            time_since_open = current_time - self._opened_at
            if time_since_open >= self.config.recovery_timeout:
                # Try recovery
                logger.info(
                    f"Circuit breaker '{self.name}' transitioning to HALF_OPEN "
                    f"after {time_since_open:.1f}s"
                )
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
                return True

            # Still in timeout period
            return False

        # HALF_OPEN state: Allow limited requests
        if self._state == CircuitState.HALF_OPEN:
            return True

        return False

    async def _on_success(self):
        """Handle successful request."""
        async with self._lock:
            current_time = time.time()

            # Update metrics
            self._total_requests += 1
            self._total_successes += 1
            self._recent_requests.append((current_time, True))
            self._trim_recent_requests()

            # State transitions
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1

                if self._success_count >= self.config.success_threshold:
                    # Recovery successful, close circuit
                    logger.info(
                        f"Circuit breaker '{self.name}' CLOSED after "
                        f"{self._success_count} successful requests"
                    )
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    self._opened_at = None

            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                if self._last_failure_time:
                    time_since_failure = current_time - self._last_failure_time
                    if time_since_failure >= self.config.failure_timeout:
                        self._failure_count = 0

    async def _on_failure(self, error: Exception):
        """Handle failed request."""
        async with self._lock:
            current_time = time.time()

            # Update metrics
            self._total_requests += 1
            self._total_failures += 1
            self._recent_requests.append((current_time, False))
            self._trim_recent_requests()

            self._failure_count += 1
            self._last_failure_time = current_time

            logger.warning(
                f"Circuit breaker '{self.name}' failure {self._failure_count}/"
                f"{self.config.failure_threshold}: {type(error).__name__}"
            )

            # State transitions
            if self._state == CircuitState.HALF_OPEN:
                # Failed during recovery, reopen circuit
                logger.error(
                    f"Circuit breaker '{self.name}' REOPENED after failure "
                    f"during recovery"
                )
                self._state = CircuitState.OPEN
                self._opened_at = current_time
                self._success_count = 0

            elif self._state == CircuitState.CLOSED:
                # Check if threshold exceeded
                if self._failure_count >= self.config.failure_threshold:
                    logger.error(
                        f"Circuit breaker '{self.name}' OPENED after "
                        f"{self._failure_count} failures"
                    )
                    self._state = CircuitState.OPEN
                    self._opened_at = current_time

    def _trim_recent_requests(self):
        """Keep only recent requests within window."""
        if len(self._recent_requests) > self.config.window_size:
            self._recent_requests = self._recent_requests[-self.config.window_size :]

    async def get_metrics(self) -> dict:
        """
        Get circuit breaker metrics.

        Returns:
            Dictionary with metrics
        """
        async with self._lock:
            current_time = time.time()

            # Calculate failure rate
            failure_rate = (
                self._total_failures / self._total_requests * 100
                if self._total_requests > 0
                else 0
            )

            # Calculate recent failure rate (last minute)
            recent_window = 60.0  # 1 minute
            recent_failures = sum(
                1
                for ts, success in self._recent_requests
                if not success and (current_time - ts) <= recent_window
            )
            recent_total = sum(
                1
                for ts, _ in self._recent_requests
                if (current_time - ts) <= recent_window
            )
            recent_failure_rate = (
                recent_failures / recent_total * 100 if recent_total > 0 else 0
            )

            return {
                "name": self.name,
                "state": self._state.value,
                "total_requests": self._total_requests,
                "total_successes": self._total_successes,
                "total_failures": self._total_failures,
                "failure_rate": round(failure_rate, 2),
                "recent_failure_rate": round(recent_failure_rate, 2),
                "failure_count": self._failure_count,
                "opened_at": (
                    datetime.fromtimestamp(self._opened_at).isoformat()
                    if self._opened_at
                    else None
                ),
                "time_since_open": (
                    round(current_time - self._opened_at, 1)
                    if self._opened_at
                    else None
                ),
            }

    async def reset(self):
        """Reset circuit breaker to closed state."""
        async with self._lock:
            logger.info(f"Circuit breaker '{self.name}' manually reset")
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._opened_at = None
            self._last_failure_time = None


# Example usage:
"""
from app.utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError

# Create circuit breaker for each ML model
anemia_breaker = CircuitBreaker(
    name="anemia-model",
    config=CircuitBreakerConfig(
        failure_threshold=5,
        recovery_timeout=30.0
    )
)

async def call_anemia_model_with_protection(image_data: bytes):
    try:
        result = await anemia_breaker.call(
            call_anemia_model,
            image_data
        )
        return result
    except CircuitBreakerOpenError:
        # Circuit is open, return fallback
        logger.warning("Anemia model circuit is open, using fallback")
        return {
            "prediction": "unavailable",
            "message": "Service temporarily unavailable",
            "fallback": True
        }

# Get metrics
metrics = await anemia_breaker.get_metrics()
print(f"Circuit state: {metrics['state']}")
print(f"Failure rate: {metrics['failure_rate']}%")
"""
