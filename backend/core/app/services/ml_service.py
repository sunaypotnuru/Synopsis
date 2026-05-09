"""
ML Service with reliability features:
- Health checks for all ML models
- Retry logic with exponential backoff
- Result caching
- Timeout handling
- Audit logging
- Graceful fallbacks
"""

import asyncio
import hashlib
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

import httpx

from app.core.config import settings
from app.utils.retry import retry_with_backoff, RetryConfig
from app.utils.cache import get_ml_cache

logger = logging.getLogger(__name__)


class MLModelType(str, Enum):
    """Supported ML model types."""

    ANEMIA = "anemia"
    CATARACT = "cataract"
    DIABETIC_RETINOPATHY = "diabetic_retinopathy"
    PARKINSONS = "parkinsons"
    MENTAL_HEALTH = "mental_health"


class MLModelStatus(str, Enum):
    """ML model health status."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class HealthCheckResult(BaseModel):
    """Health check result for an ML model."""

    model_type: MLModelType
    status: MLModelStatus
    response_time_ms: Optional[float] = None
    error: Optional[str] = None
    last_checked: datetime
    version: Optional[str] = None


class MLPredictionResult(BaseModel):
    """Result from ML model prediction."""

    model_type: MLModelType
    prediction: Dict[str, Any]
    confidence: Optional[float] = None
    cached: bool = False
    response_time_ms: float
    model_version: Optional[str] = None


class MLServiceConfig:
    """Configuration for ML service."""

    # Model endpoints (updated to use Hugging Face URLs)
    ENDPOINTS = {
        MLModelType.ANEMIA: getattr(
            settings, "ANEMIA_API_URL", "https://sunay-potnuru-netra-anemia.hf.space"
        ),
        MLModelType.CATARACT: getattr(
            settings,
            "CATARACT_API_URL",
            "https://sunay-potnuru-netra-cataract.hf.space",
        ),
        MLModelType.DIABETIC_RETINOPATHY: getattr(
            settings, "DR_API_URL", "https://sunay-potnuru-netra-dr.hf.space"
        ),
        MLModelType.PARKINSONS: getattr(
            settings, "PARKINSONS_API_URL", "https://sunay-potnuru-netra-parkinsons.hf.space"
        ),
        MLModelType.MENTAL_HEALTH: getattr(
            settings,
            "MENTAL_HEALTH_API_URL",
            "https://sunay-potnuru-netra-mental.hf.space",
        ),
    }

    # Retry configuration
    RETRY_CONFIG = RetryConfig(
        max_retries=3,
        initial_delay=1.0,
        max_delay=30.0,
        exponential_base=2.0,
        jitter=True,
        timeout=10.0,
    )

    # Cache TTL (1 hour)
    CACHE_TTL = 3600.0

    # Health check timeout (5 seconds)
    HEALTH_CHECK_TIMEOUT = 5.0


class MLService:
    """
    Service for interacting with ML models with reliability features.
    """

    def __init__(self):
        self.config = MLServiceConfig()
        self.cache = get_ml_cache()
        self._health_status: Dict[MLModelType, HealthCheckResult] = {}
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.RETRY_CONFIG.timeout),
                follow_redirects=True,
            )
        return self._client

    async def close(self):
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _generate_cache_key(self, model_type: MLModelType, data: bytes) -> str:
        """Generate cache key from model type and input data."""
        data_hash = hashlib.sha256(data).hexdigest()
        return f"ml:{model_type.value}:{data_hash}"

    @retry_with_backoff(
        config=MLServiceConfig.RETRY_CONFIG,
        retryable_exceptions=(
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.HTTPStatusError,
        ),
    )
    async def _call_model(
        self,
        model_type: MLModelType,
        endpoint: str,
        files: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Call ML model with retry logic.

        Args:
            model_type: Type of ML model
            endpoint: API endpoint
            files: Files to upload (for image models)
            json_data: JSON data to send

        Returns:
            Model response as dictionary

        Raises:
            httpx.HTTPError: If request fails after retries
        """
        client = await self._get_client()

        logger.info(f"Calling {model_type.value} model at {endpoint}")

        # Make request
        if files:
            response = await client.post(endpoint, files=files)
        elif json_data:
            response = await client.post(endpoint, json=json_data)
        else:
            response = await client.get(endpoint)

        response.raise_for_status()

        return response.json()

    async def predict_anemia(
        self, image_data: bytes, use_cache: bool = True
    ) -> MLPredictionResult:
        """
        Predict anemia from conjunctiva image.

        Args:
            image_data: Image bytes
            use_cache: Whether to use cache (default: True)

        Returns:
            Prediction result
        """
        import time

        start_time = time.time()

        model_type = MLModelType.ANEMIA
        endpoint = f"{self.config.ENDPOINTS[model_type]}/predict"

        # Check cache
        cache_key = self._generate_cache_key(model_type, image_data)
        if use_cache:
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for {model_type.value}")
                cached_result["cached"] = True
                cached_result["response_time_ms"] = (time.time() - start_time) * 1000
                return MLPredictionResult(**cached_result)

        # Call model
        try:
            result = await self._call_model(
                model_type=model_type,
                endpoint=endpoint,
                files={"file": ("image.jpg", image_data, "image/jpeg")},
            )

            response_time_ms = (time.time() - start_time) * 1000

            prediction_result = MLPredictionResult(
                model_type=model_type,
                prediction=result,
                confidence=result.get("confidence"),
                cached=False,
                response_time_ms=response_time_ms,
                model_version=result.get("model_version"),
            )

            # Cache result
            if use_cache:
                await self.cache.set(
                    cache_key, prediction_result.dict(), ttl=self.config.CACHE_TTL
                )

            # Log audit
            await self._log_prediction(prediction_result)

            return prediction_result

        except Exception as e:
            logger.error(f"Anemia prediction failed: {e}")
            # Return graceful fallback
            return self._create_fallback_result(
                model_type,
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000,
            )

    async def predict_cataract(
        self, image_data: bytes, use_cache: bool = True
    ) -> MLPredictionResult:
        """Predict cataract from eye image."""
        import time

        start_time = time.time()

        model_type = MLModelType.CATARACT
        endpoint = f"{self.config.ENDPOINTS[model_type]}/predict"

        cache_key = self._generate_cache_key(model_type, image_data)
        if use_cache:
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                cached_result["cached"] = True
                cached_result["response_time_ms"] = (time.time() - start_time) * 1000
                return MLPredictionResult(**cached_result)

        try:
            result = await self._call_model(
                model_type=model_type,
                endpoint=endpoint,
                files={"file": ("image.jpg", image_data, "image/jpeg")},
            )

            response_time_ms = (time.time() - start_time) * 1000

            prediction_result = MLPredictionResult(
                model_type=model_type,
                prediction=result,
                confidence=result.get("confidence"),
                cached=False,
                response_time_ms=response_time_ms,
                model_version=result.get("model_version"),
            )

            if use_cache:
                await self.cache.set(
                    cache_key, prediction_result.dict(), ttl=self.config.CACHE_TTL
                )

            await self._log_prediction(prediction_result)

            return prediction_result

        except Exception as e:
            logger.error(f"Cataract prediction failed: {e}")
            return self._create_fallback_result(
                model_type,
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000,
            )

    async def predict_diabetic_retinopathy(
        self, image_data: bytes, use_cache: bool = True
    ) -> MLPredictionResult:
        """Predict diabetic retinopathy from retinal image."""
        import time

        start_time = time.time()

        model_type = MLModelType.DIABETIC_RETINOPATHY
        endpoint = f"{self.config.ENDPOINTS[model_type]}/predict"

        cache_key = self._generate_cache_key(model_type, image_data)
        if use_cache:
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                cached_result["cached"] = True
                cached_result["response_time_ms"] = (time.time() - start_time) * 1000
                return MLPredictionResult(**cached_result)

        try:
            result = await self._call_model(
                model_type=model_type,
                endpoint=endpoint,
                files={"file": ("image.jpg", image_data, "image/jpeg")},
            )

            response_time_ms = (time.time() - start_time) * 1000

            prediction_result = MLPredictionResult(
                model_type=model_type,
                prediction=result,
                confidence=result.get("confidence"),
                cached=False,
                response_time_ms=response_time_ms,
                model_version=result.get("model_version"),
            )

            if use_cache:
                await self.cache.set(
                    cache_key, prediction_result.dict(), ttl=self.config.CACHE_TTL
                )

            await self._log_prediction(prediction_result)

            return prediction_result

        except Exception as e:
            logger.error(f"Diabetic retinopathy prediction failed: {e}")
            return self._create_fallback_result(
                model_type,
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000,
            )

    async def check_health(self, model_type: MLModelType) -> HealthCheckResult:
        """
        Check health of ML model.

        Args:
            model_type: Type of ML model to check

        Returns:
            Health check result
        """
        import time

        start_time = time.time()

        endpoint = self.config.ENDPOINTS[model_type]
        health_endpoint = f"{endpoint}/health"

        try:
            client = await self._get_client()
            response = await asyncio.wait_for(
                client.get(health_endpoint), timeout=self.config.HEALTH_CHECK_TIMEOUT
            )

            response_time_ms = (time.time() - start_time) * 1000

            if response.status_code == 200:
                data = response.json()
                result = HealthCheckResult(
                    model_type=model_type,
                    status=MLModelStatus.HEALTHY,
                    response_time_ms=response_time_ms,
                    last_checked=datetime.utcnow(),
                    version=data.get("version"),
                )
            else:
                result = HealthCheckResult(
                    model_type=model_type,
                    status=MLModelStatus.DEGRADED,
                    response_time_ms=response_time_ms,
                    error=f"HTTP {response.status_code}",
                    last_checked=datetime.utcnow(),
                )

        except asyncio.TimeoutError:
            result = HealthCheckResult(
                model_type=model_type,
                status=MLModelStatus.UNHEALTHY,
                error="Timeout",
                last_checked=datetime.utcnow(),
            )

        except Exception as e:
            result = HealthCheckResult(
                model_type=model_type,
                status=MLModelStatus.UNHEALTHY,
                error=str(e),
                last_checked=datetime.utcnow(),
            )

        # Store health status
        self._health_status[model_type] = result

        logger.info(
            f"Health check for {model_type.value}: {result.status.value} "
            f"({result.response_time_ms}ms)"
            if result.response_time_ms
            else ""
        )

        return result

    async def check_all_health(self) -> List[HealthCheckResult]:
        """
        Check health of all ML models.

        Returns:
            List of health check results
        """
        tasks = [self.check_health(model_type) for model_type in MLModelType]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions
        health_results = [r for r in results if isinstance(r, HealthCheckResult)]

        return health_results

    def get_health_status(
        self, model_type: Optional[MLModelType] = None
    ) -> Dict[str, Any]:
        """
        Get cached health status.

        Args:
            model_type: Specific model type (returns all if None)

        Returns:
            Health status dictionary
        """
        if model_type:
            result = self._health_status.get(model_type)
            return result.dict() if result else {"status": "unknown"}

        return {
            model_type.value: result.dict()
            for model_type, result in self._health_status.items()
        }

    def _create_fallback_result(
        self, model_type: MLModelType, error: str, response_time_ms: float
    ) -> MLPredictionResult:
        """Create fallback result when model fails."""
        return MLPredictionResult(
            model_type=model_type,
            prediction={
                "error": error,
                "message": "Model temporarily unavailable. Please try again later.",
                "fallback": True,
            },
            confidence=None,
            cached=False,
            response_time_ms=response_time_ms,
            model_version=None,
        )

    async def _log_prediction(self, result: MLPredictionResult):
        """Log prediction for audit trail (best-effort)."""
        try:
            # TODO: Store in database audit_logs table
            logger.info(
                f"ML Prediction: {result.model_type.value} "
                f"(confidence: {result.confidence}, "
                f"cached: {result.cached}, "
                f"time: {result.response_time_ms:.0f}ms)"
            )
        except Exception as e:
            logger.error(f"Failed to log prediction: {e}")


# Global ML service instance
_ml_service: Optional[MLService] = None


def get_ml_service() -> MLService:
    """Get global ML service instance."""
    global _ml_service
    if _ml_service is None:
        _ml_service = MLService()
    return _ml_service


# Example usage in routes:
"""
from app.services.ml_service import get_ml_service

@router.post("/ml/anemia/predict")
async def predict_anemia(file: UploadFile):
    ml_service = get_ml_service()
    
    image_data = await file.read()
    result = await ml_service.predict_anemia(image_data)
    
    return result

@router.get("/ml/health")
async def check_ml_health():
    ml_service = get_ml_service()
    results = await ml_service.check_all_health()
    return {"models": [r.dict() for r in results]}
"""
