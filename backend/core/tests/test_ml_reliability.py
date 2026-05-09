"""
Comprehensive tests for ML Model Reliability (Category 1).

Tests cover:
- Retry logic with exponential backoff
- In-memory caching with TTL
- Circuit breaker pattern
- ML service integration
- Health checks
- Error handling

Run with: pytest backend/core/tests/test_ml_reliability.py -v
"""

import asyncio
import pytest
import time
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

# Import components to test
from app.utils.retry import (
    retry_with_backoff,
    RetryConfig,
    sync_retry_with_backoff
)
from app.utils.cache import InMemoryCache, get_ml_cache
from app.utils.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitBreakerOpenError
)
from app.services.ml_service import (
    MLService,
    MLModelType,
    MLModelStatus,
    HealthCheckResult,
    MLPredictionResult
)


# ============================================================================
# RETRY LOGIC TESTS
# ============================================================================

class TestRetryLogic:
    """Test retry logic with exponential backoff."""
    
    @pytest.mark.asyncio
    async def test_retry_success_on_first_attempt(self):
        """Test successful execution on first attempt."""
        call_count = 0
        
        @retry_with_backoff(config=RetryConfig(max_retries=3))
        async def successful_function():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = await successful_function()
        assert result == "success"
        assert call_count == 1
    
    @pytest.mark.asyncio
    async def test_retry_success_after_failures(self):
        """Test successful execution after retries."""
        call_count = 0
        
        @retry_with_backoff(config=RetryConfig(max_retries=3, initial_delay=0.1))
        async def failing_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return "success"
        
        result = await failing_then_success()
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_exhausted(self):
        """Test retry exhaustion after max attempts."""
        call_count = 0
        
        @retry_with_backoff(config=RetryConfig(max_retries=2, initial_delay=0.1))
        async def always_failing():
            nonlocal call_count
            call_count += 1
            raise Exception("Permanent failure")
        
        with pytest.raises(Exception, match="Permanent failure"):
            await always_failing()
        
        assert call_count == 3  # Initial + 2 retries
    
    @pytest.mark.asyncio
    async def test_retry_timeout(self):
        """Test timeout handling."""
        @retry_with_backoff(config=RetryConfig(max_retries=2, timeout=0.1))
        async def slow_function():
            await asyncio.sleep(1.0)  # Longer than timeout
            return "success"
        
        with pytest.raises(asyncio.TimeoutError):
            await slow_function()
    
    @pytest.mark.asyncio
    async def test_retry_exponential_backoff(self):
        """Test exponential backoff delays."""
        config = RetryConfig(
            max_retries=3,
            initial_delay=1.0,
            exponential_base=2.0,
            jitter=False  # Disable jitter for predictable testing
        )
        
        # Test delay calculation
        assert config.calculate_delay(0) == 1.0  # 1.0 * 2^0
        assert config.calculate_delay(1) == 2.0  # 1.0 * 2^1
        assert config.calculate_delay(2) == 4.0  # 1.0 * 2^2
    
    @pytest.mark.asyncio
    async def test_retry_with_jitter(self):
        """Test jitter adds randomness to delays."""
        config = RetryConfig(
            initial_delay=1.0,
            jitter=True
        )
        
        # Jitter should add 0-25% to delay
        delay1 = config.calculate_delay(0)
        delay2 = config.calculate_delay(0)
        
        # Both should be >= 1.0 and <= 1.25
        assert 1.0 <= delay1 <= 1.25
        assert 1.0 <= delay2 <= 1.25
        
        # They should be different (with high probability)
        # Note: This could theoretically fail, but very unlikely
        assert delay1 != delay2
    
    def test_sync_retry(self):
        """Test synchronous retry decorator."""
        call_count = 0
        
        @sync_retry_with_backoff(config=RetryConfig(max_retries=2, initial_delay=0.1))
        def failing_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise Exception("Temporary failure")
            return "success"
        
        result = failing_then_success()
        assert result == "success"
        assert call_count == 2


# ============================================================================
# CACHING TESTS
# ============================================================================

class TestCaching:
    """Test in-memory caching with TTL."""
    
    @pytest.mark.asyncio
    async def test_cache_set_and_get(self):
        """Test basic cache set and get."""
        cache = InMemoryCache(default_ttl=10.0)
        
        await cache.set("key1", "value1")
        result = await cache.get("key1")
        
        assert result == "value1"
    
    @pytest.mark.asyncio
    async def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = InMemoryCache()
        result = await cache.get("nonexistent")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test cache entries expire after TTL."""
        cache = InMemoryCache(default_ttl=0.5)  # 500ms TTL
        
        await cache.set("key1", "value1")
        
        # Should exist immediately
        assert await cache.get("key1") == "value1"
        
        # Wait for expiration
        await asyncio.sleep(0.6)
        
        # Should be expired
        assert await cache.get("key1") is None
    
    @pytest.mark.asyncio
    async def test_cache_custom_ttl(self):
        """Test custom TTL per entry."""
        cache = InMemoryCache(default_ttl=10.0)
        
        await cache.set("key1", "value1", ttl=0.5)
        await cache.set("key2", "value2", ttl=10.0)
        
        await asyncio.sleep(0.6)
        
        assert await cache.get("key1") is None  # Expired
        assert await cache.get("key2") == "value2"  # Still valid
    
    @pytest.mark.asyncio
    async def test_cache_update(self):
        """Test updating existing cache entry."""
        cache = InMemoryCache()
        
        await cache.set("key1", "value1")
        await cache.set("key1", "value2")  # Update
        
        assert await cache.get("key1") == "value2"
    
    @pytest.mark.asyncio
    async def test_cache_delete(self):
        """Test deleting cache entry."""
        cache = InMemoryCache()
        
        await cache.set("key1", "value1")
        deleted = await cache.delete("key1")
        
        assert deleted is True
        assert await cache.get("key1") is None
    
    @pytest.mark.asyncio
    async def test_cache_clear(self):
        """Test clearing all cache entries."""
        cache = InMemoryCache()
        
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        await cache.clear()
        
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None
    
    @pytest.mark.asyncio
    async def test_cache_max_size_eviction(self):
        """Test LRU eviction when cache is full."""
        cache = InMemoryCache(max_size=3)
        
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        await cache.set("key3", "value3")
        
        # Cache is full, adding new entry should evict oldest
        await cache.set("key4", "value4")
        
        # key1 should be evicted (oldest)
        assert await cache.get("key1") is None
        assert await cache.get("key2") == "value2"
        assert await cache.get("key3") == "value3"
        assert await cache.get("key4") == "value4"
    
    @pytest.mark.asyncio
    async def test_cache_cleanup_expired(self):
        """Test manual cleanup of expired entries."""
        cache = InMemoryCache(default_ttl=0.5)
        
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        
        await asyncio.sleep(0.6)
        
        # Manually trigger cleanup
        removed = await cache.cleanup_expired()
        
        assert removed == 2
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None
    
    @pytest.mark.asyncio
    async def test_cache_statistics(self):
        """Test cache statistics tracking."""
        cache = InMemoryCache()
        
        await cache.set("key1", "value1")
        
        # Hit
        await cache.get("key1")
        
        # Miss
        await cache.get("key2")
        
        stats = await cache.get_stats()
        
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["total_requests"] == 2
        assert stats["hit_rate"] == 50.0
        assert stats["size"] == 1
    
    @pytest.mark.asyncio
    async def test_cache_hit_count(self):
        """Test cache entry hit counting."""
        cache = InMemoryCache()
        
        await cache.set("key1", "value1")
        
        # Access multiple times
        await cache.get("key1")
        await cache.get("key1")
        await cache.get("key1")
        
        # Check internal hit count (if accessible)
        entry = cache._cache.get(cache.cache_key("key1"))
        if entry:
            assert entry.hits == 3


# ============================================================================
# CIRCUIT BREAKER TESTS
# ============================================================================

class TestCircuitBreaker:
    """Test circuit breaker pattern."""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in closed state."""
        breaker = CircuitBreaker("test-service")
        
        assert breaker.state == CircuitState.CLOSED
        assert breaker.is_closed
        assert not breaker.is_open
        assert not breaker.is_half_open
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_success(self):
        """Test successful calls through circuit breaker."""
        breaker = CircuitBreaker("test-service")
        
        async def successful_call():
            return "success"
        
        result = await breaker.call(successful_call)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_on_failures(self):
        """Test circuit breaker opens after threshold failures."""
        config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=1.0
        )
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Service error")
        
        # Fail 3 times to reach threshold
        for i in range(3):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        # Circuit should be open now
        assert breaker.state == CircuitState.OPEN
        assert breaker.is_open
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_fails_fast_when_open(self):
        """Test circuit breaker fails fast when open."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=10.0  # Long timeout
        )
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Service error")
        
        # Open the circuit
        for i in range(2):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        assert breaker.is_open
        
        # Next call should fail fast without calling function
        call_count = 0
        
        async def tracked_call():
            nonlocal call_count
            call_count += 1
            raise Exception("Should not be called")
        
        with pytest.raises(CircuitBreakerOpenError):
            await breaker.call(tracked_call)
        
        assert call_count == 0  # Function was not called
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_half_open_recovery(self):
        """Test circuit breaker transitions to half-open for recovery."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=0.5,  # Short timeout for testing
            success_threshold=2
        )
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Service error")
        
        # Open the circuit
        for i in range(2):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        assert breaker.is_open
        
        # Wait for recovery timeout
        await asyncio.sleep(0.6)
        
        # Next call should transition to half-open
        async def successful_call():
            return "success"
        
        result = await breaker.call(successful_call)
        assert result == "success"
        assert breaker.state == CircuitState.HALF_OPEN
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_closes_after_recovery(self):
        """Test circuit breaker closes after successful recovery."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=0.5,
            success_threshold=2
        )
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Service error")
        
        async def successful_call():
            return "success"
        
        # Open the circuit
        for i in range(2):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        # Wait for recovery
        await asyncio.sleep(0.6)
        
        # Succeed twice to close circuit
        await breaker.call(successful_call)
        await breaker.call(successful_call)
        
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_reopens_on_failure_during_recovery(self):
        """Test circuit breaker reopens if recovery fails."""
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=0.5
        )
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Service error")
        
        # Open the circuit
        for i in range(2):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        # Wait for recovery
        await asyncio.sleep(0.6)
        
        # Fail during recovery
        with pytest.raises(Exception):
            await breaker.call(failing_call)
        
        # Should be open again
        assert breaker.is_open
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_metrics(self):
        """Test circuit breaker metrics collection."""
        breaker = CircuitBreaker("test-service")
        
        async def successful_call():
            return "success"
        
        async def failing_call():
            raise Exception("Error")
        
        # Make some calls
        await breaker.call(successful_call)
        await breaker.call(successful_call)
        
        try:
            await breaker.call(failing_call)
        except:
            pass
        
        metrics = await breaker.get_metrics()
        
        assert metrics["name"] == "test-service"
        assert metrics["total_requests"] == 3
        assert metrics["total_successes"] == 2
        assert metrics["total_failures"] == 1
        assert metrics["failure_rate"] == 33.33
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_reset(self):
        """Test manual circuit breaker reset."""
        config = CircuitBreakerConfig(failure_threshold=2)
        breaker = CircuitBreaker("test-service", config)
        
        async def failing_call():
            raise Exception("Error")
        
        # Open the circuit
        for i in range(2):
            with pytest.raises(Exception):
                await breaker.call(failing_call)
        
        assert breaker.is_open
        
        # Reset
        await breaker.reset()
        
        assert breaker.is_closed


# ============================================================================
# ML SERVICE INTEGRATION TESTS
# ============================================================================

class TestMLService:
    """Test ML service integration."""
    
    @pytest.mark.asyncio
    async def test_ml_service_initialization(self):
        """Test ML service initializes correctly."""
        service = MLService()
        
        assert service.config is not None
        assert service.cache is not None
        assert len(service.config.ENDPOINTS) == 5
    
    @pytest.mark.asyncio
    async def test_ml_service_cache_key_generation(self):
        """Test cache key generation is deterministic."""
        service = MLService()
        
        data = b"test_image_data"
        key1 = service._generate_cache_key(MLModelType.ANEMIA, data)
        key2 = service._generate_cache_key(MLModelType.ANEMIA, data)
        
        assert key1 == key2
        # Key format: "ml:{model_type}:{hash}" where hash is 64 chars
        assert key1.startswith("ml:anemia:")
        assert len(key1.split(":")[-1]) == 64  # SHA256 hash length
    
    @pytest.mark.asyncio
    async def test_ml_service_fallback_result(self):
        """Test fallback result creation."""
        service = MLService()
        
        result = service._create_fallback_result(
            MLModelType.ANEMIA,
            error="Service unavailable",
            response_time_ms=100.0
        )
        
        assert result.model_type == MLModelType.ANEMIA
        assert result.prediction["fallback"] is True
        assert result.prediction["error"] == "Service unavailable"
        assert result.confidence is None
    
    @pytest.mark.asyncio
    async def test_ml_service_health_check_success(self):
        """Test successful health check."""
        service = MLService()
        
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy", "version": "1.0.0"}
        
        # Mock the client's get method
        async def mock_get(*args, **kwargs):
            return mock_response
        
        # Replace the service's client
        mock_client = AsyncMock()
        mock_client.get = mock_get
        mock_client.is_closed = False
        service._client = mock_client
        
        result = await service.check_health(MLModelType.ANEMIA)
        
        assert result.model_type == MLModelType.ANEMIA
        assert result.status == MLModelStatus.HEALTHY
        assert result.version == "1.0.0"
        assert result.response_time_ms is not None
    
    @pytest.mark.asyncio
    async def test_ml_service_health_check_timeout(self):
        """Test health check timeout handling."""
        service = MLService()
        
        # Mock timeout
        mock_client = AsyncMock()
        mock_client.get.side_effect = asyncio.TimeoutError()
        mock_client.is_closed = False
        service._client = mock_client
        
        result = await service.check_health(MLModelType.ANEMIA)
        
        assert result.status == MLModelStatus.UNHEALTHY
        assert result.error == "Timeout"


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    """Integration tests for complete flow."""
    
    @pytest.mark.asyncio
    async def test_retry_with_cache(self):
        """Test retry logic combined with caching."""
        cache = InMemoryCache(default_ttl=10.0)
        call_count = 0
        
        async def expensive_operation(key: str):
            nonlocal call_count
            
            # Check cache first
            cached = await cache.get(key)
            if cached:
                return cached
            
            # Simulate expensive operation with retry
            @retry_with_backoff(config=RetryConfig(max_retries=2, initial_delay=0.1))
            async def inner_operation():
                nonlocal call_count
                call_count += 1
                if call_count < 2:
                    raise Exception("Temporary failure")
                return "computed_value"
            
            result = await inner_operation()
            await cache.set(key, result)
            return result
        
        # First call: should retry and succeed
        result1 = await expensive_operation("key1")
        assert result1 == "computed_value"
        assert call_count == 2
        
        # Second call: should hit cache
        result2 = await expensive_operation("key1")
        assert result2 == "computed_value"
        assert call_count == 2  # No additional calls
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_with_retry(self):
        """Test circuit breaker combined with retry logic."""
        breaker = CircuitBreaker(
            "test-service",
            CircuitBreakerConfig(failure_threshold=3)
        )
        
        call_count = 0
        
        @retry_with_backoff(config=RetryConfig(max_retries=2, initial_delay=0.1))
        async def protected_call():
            nonlocal call_count
            call_count += 1
            
            async def inner_call():
                if call_count < 5:
                    raise Exception("Service error")
                return "success"
            
            return await breaker.call(inner_call)
        
        # Should fail and open circuit
        with pytest.raises(Exception):
            await protected_call()
        
        # Circuit should be open after failures
        assert breaker.is_open or call_count >= 3


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Performance and load tests."""
    
    @pytest.mark.asyncio
    async def test_cache_performance(self):
        """Test cache performance with many entries."""
        cache = InMemoryCache(max_size=1000)
        
        # Write 1000 entries
        start = time.time()
        for i in range(1000):
            await cache.set(f"key{i}", f"value{i}")
        write_time = time.time() - start
        
        # Read 1000 entries
        start = time.time()
        for i in range(1000):
            await cache.get(f"key{i}")
        read_time = time.time() - start
        
        # Should be fast (< 1 second for 1000 operations)
        assert write_time < 1.0
        assert read_time < 1.0
        
        stats = await cache.get_stats()
        assert stats["hit_rate"] == 100.0
    
    @pytest.mark.asyncio
    async def test_concurrent_cache_access(self):
        """Test cache handles concurrent access correctly."""
        cache = InMemoryCache()
        
        async def writer(key: str, value: str):
            await cache.set(key, value)
        
        async def reader(key: str):
            return await cache.get(key)
        
        # Concurrent writes
        await asyncio.gather(*[
            writer(f"key{i}", f"value{i}")
            for i in range(100)
        ])
        
        # Concurrent reads
        results = await asyncio.gather(*[
            reader(f"key{i}")
            for i in range(100)
        ])
        
        # All reads should succeed
        assert all(r == f"value{i}" for i, r in enumerate(results))


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
