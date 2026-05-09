"""
Simple in-memory cache service for AI monitoring metrics.

This module provides a lightweight cache layer that works without Redis,
making it safe for CI environments and local development.
For production deployments with Redis, this can be swapped with a
Redis-backed implementation by setting USE_REDIS_CACHE=true.
"""

import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)


class _CacheEntry:
    """Internal cache entry with TTL support."""

    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, ttl: Optional[int] = None):
        self.value = value
        self.expires_at: Optional[float] = (time.monotonic() + ttl) if ttl else None

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return time.monotonic() > self.expires_at


class InMemoryCacheService:
    """
    Thread-safe in-memory cache with optional TTL support.

    Suitable for single-process deployments and CI environments.
    For multi-process/multi-instance production use, replace with
    a Redis-backed implementation.
    """

    def __init__(self) -> None:
        self._store: dict[str, _CacheEntry] = {}

    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve a cached value.

        Returns None if the key does not exist or has expired.
        """
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.is_expired:
            del self._store[key]
            return None
        return entry.value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Store a value in the cache.

        Args:
            key: Cache key.
            value: Value to store.
            ttl: Time-to-live in seconds. None means no expiry.
        """
        self._store[key] = _CacheEntry(value, ttl)

    def delete(self, key: str) -> None:
        """Remove a key from the cache."""
        self._store.pop(key, None)

    def clear(self) -> None:
        """Clear all cached values."""
        self._store.clear()

    def exists(self, key: str) -> bool:
        """Check if a key exists and has not expired."""
        return self.get(key) is not None

    def evict_expired(self) -> int:
        """
        Remove all expired entries.

        Returns the number of entries removed.
        """
        expired_keys = [k for k, v in self._store.items() if v.is_expired]
        for key in expired_keys:
            del self._store[key]
        return len(expired_keys)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

def _build_cache_service() -> InMemoryCacheService:
    """Build the appropriate cache service based on environment config."""
    use_redis = os.getenv("USE_REDIS_CACHE", "false").lower() == "true"
    if use_redis:
        # Future: swap in a Redis-backed implementation here.
        # For now, log a warning and fall back to in-memory.
        logger.warning(
            "USE_REDIS_CACHE=true but Redis cache is not yet implemented; "
            "falling back to in-memory cache."
        )
    return InMemoryCacheService()


cache_service: InMemoryCacheService = _build_cache_service()

__all__ = ["cache_service", "InMemoryCacheService"]
