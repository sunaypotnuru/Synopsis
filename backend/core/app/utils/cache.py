"""
In-memory caching utility for ML model results.
Uses TTL (Time To Live) to automatically expire cached entries.
FREE TIER: No external service required - pure Python implementation.
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Represents a cached value with metadata."""

    value: Any
    created_at: float
    ttl: float
    hits: int = 0

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return time.time() > (self.created_at + self.ttl)

    def time_remaining(self) -> float:
        """Get remaining time before expiration in seconds."""
        remaining = (self.created_at + self.ttl) - time.time()
        return max(0, remaining)


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL support.
    Suitable for caching ML model results to reduce API calls.
    """

    def __init__(
        self,
        default_ttl: float = 3600.0,  # 1 hour default
        max_size: int = 1000,  # Maximum number of entries
        cleanup_interval: float = 300.0,  # Cleanup every 5 minutes
    ):
        """
        Initialize cache.

        Args:
            default_ttl: Default time-to-live in seconds (default: 1 hour)
            max_size: Maximum number of cache entries (default: 1000)
            cleanup_interval: How often to run cleanup in seconds (default: 5 min)
        """
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()
        self.default_ttl = default_ttl
        self.max_size = max_size
        self.cleanup_interval = cleanup_interval
        self._cleanup_task: Optional[asyncio.Task] = None

        # Statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "expirations": 0,
        }

    async def start_cleanup_task(self):
        """Start background task for periodic cleanup."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("Cache cleanup task started")

    async def stop_cleanup_task(self):
        """Stop background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Cache cleanup task stopped")

    async def _cleanup_loop(self):
        """Background task that periodically removes expired entries."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self.cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cache cleanup: {e}")

    def _generate_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from function arguments.

        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            SHA256 hash of serialized arguments
        """
        # Create a deterministic string representation
        key_data = {
            "args": args,
            "kwargs": sorted(kwargs.items()),  # Sort for consistency
        }

        # Serialize to JSON and hash
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.sha256(key_str.encode()).hexdigest()

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        async with self._lock:
            entry = self._cache.get(key)

            if entry is None:
                self.stats["misses"] += 1
                return None

            if entry.is_expired():
                # Remove expired entry
                del self._cache[key]
                self.stats["expirations"] += 1
                self.stats["misses"] += 1
                logger.debug(f"Cache expired for key: {key[:16]}...")
                return None

            # Update hit count
            entry.hits += 1
            self.stats["hits"] += 1

            logger.debug(
                f"Cache hit for key: {key[:16]}... "
                f"(hits: {entry.hits}, remaining: {entry.time_remaining():.0f}s)"
            )

            return entry.value

    async def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        async with self._lock:
            # Check if cache is full
            if len(self._cache) >= self.max_size and key not in self._cache:
                # Evict oldest entry (LRU-like behavior)
                await self._evict_oldest()

            # Create cache entry
            entry = CacheEntry(
                value=value,
                created_at=time.time(),
                ttl=ttl if ttl is not None else self.default_ttl,
            )

            self._cache[key] = entry

            logger.debug(
                f"Cached value for key: {key[:16]}... "
                f"(ttl: {entry.ttl}s, size: {len(self._cache)})"
            )

    async def delete(self, key: str) -> bool:
        """
        Delete entry from cache.

        Args:
            key: Cache key

        Returns:
            True if entry was deleted, False if not found
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug(f"Deleted cache entry: {key[:16]}...")
                return True
            return False

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Cleared {count} cache entries")

    async def cleanup_expired(self) -> int:
        """
        Remove all expired entries.

        Returns:
            Number of entries removed
        """
        async with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items() if entry.is_expired()
            ]

            for key in expired_keys:
                del self._cache[key]
                self.stats["expirations"] += 1

            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

            return len(expired_keys)

    async def _evict_oldest(self) -> None:
        """Evict the oldest cache entry (by creation time)."""
        if not self._cache:
            return

        # Find oldest entry
        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k].created_at)

        del self._cache[oldest_key]
        self.stats["evictions"] += 1

        logger.debug(f"Evicted oldest cache entry: {oldest_key[:16]}...")

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        async with self._lock:
            total_requests = self.stats["hits"] + self.stats["misses"]
            hit_rate = (
                self.stats["hits"] / total_requests * 100 if total_requests > 0 else 0
            )

            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self.stats["hits"],
                "misses": self.stats["misses"],
                "hit_rate": round(hit_rate, 2),
                "evictions": self.stats["evictions"],
                "expirations": self.stats["expirations"],
                "total_requests": total_requests,
            }

    def cache_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from arguments.
        Useful for manual cache key generation.
        """
        return self._generate_key(*args, **kwargs)


# Global cache instance
_ml_cache = InMemoryCache(
    default_ttl=3600.0, max_size=1000, cleanup_interval=300.0  # 1 hour  # 5 minutes
)


def get_ml_cache() -> InMemoryCache:
    """Get global ML cache instance."""
    return _ml_cache


def cached(
    ttl: Optional[float] = None,
    key_prefix: str = "",
):
    """
    Decorator for caching async function results.

    Args:
        ttl: Time-to-live in seconds (uses cache default if None)
        key_prefix: Prefix for cache key (useful for namespacing)

    Example:
        @cached(ttl=3600, key_prefix="anemia")
        async def predict_anemia(image_data: bytes):
            # Expensive ML model call
            result = await call_ml_model(image_data)
            return result
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache = get_ml_cache()

            # Generate cache key
            key_data = f"{key_prefix}:{func.__name__}:{args}:{kwargs}"
            cache_key = hashlib.sha256(key_data.encode()).hexdigest()

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_value

            # Call function
            logger.debug(f"Cache miss for {func.__name__}, calling function")
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(cache_key, result, ttl=ttl)

            return result

        return wrapper

    return decorator


# Example usage:
"""
from app.utils.cache import cached, get_ml_cache

# Start cleanup task on app startup
@app.on_event("startup")
async def startup():
    cache = get_ml_cache()
    await cache.start_cleanup_task()

@app.on_event("shutdown")
async def shutdown():
    cache = get_ml_cache()
    await cache.stop_cleanup_task()

# Use decorator for caching
@cached(ttl=3600, key_prefix="anemia")
async def predict_anemia(image_data: bytes):
    # This will be cached for 1 hour
    result = await call_ml_model(image_data)
    return result

# Manual cache usage
cache = get_ml_cache()
key = cache.cache_key("anemia", image_hash="abc123")
result = await cache.get(key)
if result is None:
    result = await expensive_operation()
    await cache.set(key, result, ttl=3600)
"""
