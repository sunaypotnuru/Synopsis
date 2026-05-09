"""
Retry utility with exponential backoff for ML model requests.
Based on industry best practices for handling rate limits and transient failures.
"""

import asyncio
import logging
import random
from functools import wraps
from typing import Any, Callable, Optional, Tuple, Type

logger = logging.getLogger(__name__)


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        timeout: float = 10.0,
    ):
        """
        Initialize retry configuration.

        Args:
            max_retries: Maximum number of retry attempts (default: 3)
            initial_delay: Initial delay in seconds (default: 1.0)
            max_delay: Maximum delay in seconds (default: 60.0)
            exponential_base: Base for exponential backoff (default: 2.0)
            jitter: Add random jitter to prevent thundering herd (default: True)
            timeout: Request timeout in seconds (default: 10.0)
        """
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.timeout = timeout

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for given attempt using exponential backoff.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        # Exponential backoff: delay = initial_delay * (base ^ attempt)
        delay = min(
            self.initial_delay * (self.exponential_base**attempt), self.max_delay
        )

        # Add jitter to prevent synchronized retries (thundering herd problem)
        if self.jitter:
            # Random jitter between 0% and 25% of delay
            jitter_amount = delay * random.uniform(0, 0.25)
            delay += jitter_amount

        return delay


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
):
    """
    Decorator for retrying async functions with exponential backoff.

    Args:
        config: Retry configuration (uses defaults if None)
        retryable_exceptions: Tuple of exceptions that trigger retry
        on_retry: Optional callback function called on each retry

    Example:
        @retry_with_backoff(
            config=RetryConfig(max_retries=3, initial_delay=1.0),
            retryable_exceptions=(httpx.TimeoutException, httpx.ConnectError)
        )
        async def call_ml_model(data):
            response = await client.post(url, json=data)
            return response.json()
    """
    if config is None:
        config = RetryConfig()

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(config.max_retries + 1):
                try:
                    # Execute function with timeout
                    result = await asyncio.wait_for(
                        func(*args, **kwargs), timeout=config.timeout
                    )

                    # Success - log if this was a retry
                    if attempt > 0:
                        logger.info(
                            f"{func.__name__} succeeded on attempt {attempt + 1}"
                        )

                    return result

                except asyncio.TimeoutError as e:
                    last_exception = e
                    logger.warning(
                        f"{func.__name__} timed out after {config.timeout}s "
                        f"(attempt {attempt + 1}/{config.max_retries + 1})"
                    )

                except retryable_exceptions as e:
                    last_exception = e
                    logger.warning(
                        f"{func.__name__} failed with {type(e).__name__}: {str(e)} "
                        f"(attempt {attempt + 1}/{config.max_retries + 1})"
                    )

                except Exception as e:
                    # Non-retryable exception - fail immediately
                    logger.error(
                        f"{func.__name__} failed with non-retryable exception: "
                        f"{type(e).__name__}: {str(e)}"
                    )
                    raise

                # If this was the last attempt, raise the exception
                if attempt >= config.max_retries:
                    logger.error(
                        f"{func.__name__} failed after {config.max_retries + 1} attempts"
                    )
                    raise last_exception

                # Calculate delay and wait before retry
                delay = config.calculate_delay(attempt)
                logger.info(
                    f"Retrying {func.__name__} in {delay:.2f}s "
                    f"(attempt {attempt + 2}/{config.max_retries + 1})"
                )

                # Call on_retry callback if provided
                if on_retry:
                    try:
                        on_retry(last_exception, attempt)
                    except Exception as callback_error:
                        logger.error(f"on_retry callback failed: {callback_error}")

                await asyncio.sleep(delay)

            # Should never reach here, but just in case
            raise last_exception

        return wrapper

    return decorator


def sync_retry_with_backoff(
    config: Optional[RetryConfig] = None,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
):
    """
    Decorator for retrying synchronous functions with exponential backoff.

    Similar to retry_with_backoff but for sync functions.
    """
    if config is None:
        config = RetryConfig()

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import time

            last_exception = None

            for attempt in range(config.max_retries + 1):
                try:
                    result = func(*args, **kwargs)

                    if attempt > 0:
                        logger.info(
                            f"{func.__name__} succeeded on attempt {attempt + 1}"
                        )

                    return result

                except retryable_exceptions as e:
                    last_exception = e
                    logger.warning(
                        f"{func.__name__} failed with {type(e).__name__}: {str(e)} "
                        f"(attempt {attempt + 1}/{config.max_retries + 1})"
                    )

                except Exception as e:
                    logger.error(
                        f"{func.__name__} failed with non-retryable exception: "
                        f"{type(e).__name__}: {str(e)}"
                    )
                    raise

                if attempt >= config.max_retries:
                    logger.error(
                        f"{func.__name__} failed after {config.max_retries + 1} attempts"
                    )
                    raise last_exception

                delay = config.calculate_delay(attempt)
                logger.info(
                    f"Retrying {func.__name__} in {delay:.2f}s "
                    f"(attempt {attempt + 2}/{config.max_retries + 1})"
                )

                if on_retry:
                    try:
                        on_retry(last_exception, attempt)
                    except Exception as callback_error:
                        logger.error(f"on_retry callback failed: {callback_error}")

                time.sleep(delay)

            raise last_exception

        return wrapper

    return decorator


# Example usage:
"""
from app.utils.retry import retry_with_backoff, RetryConfig
import httpx

# Configure retry behavior
ml_retry_config = RetryConfig(
    max_retries=3,
    initial_delay=1.0,
    max_delay=30.0,
    timeout=10.0
)

@retry_with_backoff(
    config=ml_retry_config,
    retryable_exceptions=(httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError)
)
async def call_anemia_model(image_data: bytes):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://sunay-potnuru-netra-anemia.hf.space/predict",
            files={"file": image_data},
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()
"""
