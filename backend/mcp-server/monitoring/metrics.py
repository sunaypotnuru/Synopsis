from prometheus_client import Counter, Histogram, Gauge, Summary
import time
from functools import wraps
from typing import Callable

# Metrics definitions
TOOL_INVOCATIONS = Counter(
    "mcp_tool_invocations_total",
    "Total number of MCP tool calls",
    ["tool_name", "status"],
)

TOOL_LATENCY = Histogram(
    "mcp_tool_latency_seconds",
    "Latency of MCP tool calls in seconds",
    ["tool_name"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, float("inf")),
)

ACTIVE_SESSIONS = Gauge("mcp_active_sessions", "Number of active MCP sessions")

PREDICTION_CONFIDENCE = Summary(
    "mcp_prediction_confidence", "AI model prediction confidence scores", ["model_name"]
)


def track_metrics(tool_name: str):
    """Decorator to track tool metrics automatically."""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                TOOL_INVOCATIONS.labels(tool_name=tool_name, status="success").inc()
                return result
            except Exception as e:
                TOOL_INVOCATIONS.labels(tool_name=tool_name, status="error").inc()
                raise e
            finally:
                latency = time.time() - start_time
                TOOL_LATENCY.labels(tool_name=tool_name).observe(latency)

        return wrapper

    return decorator
