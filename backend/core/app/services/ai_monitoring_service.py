"""
AI Monitoring Service
Tracks AI performance metrics, detects drift, and provides alerting
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.services.cache import cache_service

logger = logging.getLogger(__name__)


class AIMonitoringService:
    """Service for monitoring AI performance and detecting issues"""

    # Alert thresholds
    ERROR_RATE_THRESHOLD = 0.05  # 5%
    AVG_RESPONSE_TIME_THRESHOLD = 5000  # 5 seconds
    LOW_CONFIDENCE_THRESHOLD = 0.5
    LOW_CONFIDENCE_RATE_THRESHOLD = 0.10  # 10%

    def __init__(self, db: Session):
        self.db = db

    # ==================== REAL-TIME METRICS ====================

    def track_request(
        self,
        user_id: str,
        model_name: str,
        prompt_template: Optional[str],
        input_tokens: int,
        output_tokens: int,
        response_time_ms: int,
        confidence_score: float,
        success: bool,
        error_message: Optional[str] = None,
        cost_usd: float = 0.0,
    ) -> bool:
        """
        Track an AI request

        Args:
            user_id: User ID
            model_name: Model name
            prompt_template: Template name (if used)
            input_tokens: Input token count
            output_tokens: Output token count
            response_time_ms: Response time in milliseconds
            confidence_score: Confidence score (0.0-1.0)
            success: Whether request succeeded
            error_message: Error message if failed
            cost_usd: Cost in USD

        Returns:
            True if tracked successfully
        """
        try:
            # Insert into database (assuming model exists)
            from app.models.ai_request import AIRequest

            request = AIRequest(
                user_id=user_id,
                model_name=model_name,
                prompt_template=prompt_template,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                response_time_ms=response_time_ms,
                confidence_score=confidence_score,
                success=success,
                error_message=error_message,
                cost_usd=cost_usd,
            )

            self.db.add(request)
            self.db.commit()

            # Update daily metrics asynchronously
            self._update_daily_metrics(model_name)

            # Check for alerts
            self._check_alerts(model_name)

            return True

        except Exception as e:
            logger.error(f"Error tracking AI request: {str(e)}")
            self.db.rollback()
            return False

    def get_real_time_metrics(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get real-time metrics for the last hour

        Args:
            model_name: Filter by model name (optional)

        Returns:
            Dictionary with real-time metrics
        """
        cache_key = f"ai_metrics:realtime:{model_name or 'all'}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        try:
            from app.models.ai_request import AIRequest

            # Last hour
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

            query = self.db.query(AIRequest).filter(
                AIRequest.created_at >= one_hour_ago
            )

            if model_name:
                query = query.filter(AIRequest.model_name == model_name)

            requests = query.all()

            if not requests:
                return {
                    "total_requests": 0,
                    "success_rate": 0.0,
                    "avg_response_time_ms": 0,
                    "avg_confidence_score": 0.0,
                    "total_tokens": 0,
                    "total_cost_usd": 0.0,
                }

            total = len(requests)
            successful = sum(1 for r in requests if r.success)

            metrics = {
                "total_requests": total,
                "successful_requests": successful,
                "failed_requests": total - successful,
                "success_rate": round(successful / total, 3) if total > 0 else 0.0,
                "error_rate": (
                    round((total - successful) / total, 3) if total > 0 else 0.0
                ),
                "avg_response_time_ms": int(
                    sum(int(float(str(r.response_time_ms or 0))) for r in requests) / total
                ) if total > 0 else 0,
                "avg_confidence_score": round(
                    sum(float(str(r.confidence_score or 0.0)) for r in requests) / total, 3
                ) if total > 0 else 0.0,
                "total_tokens": sum(r.total_tokens or 0 for r in requests),
                "total_cost_usd": round(sum(float(str(r.cost_usd or 0.0)) for r in requests), 6),
                "low_confidence_count": sum(
                    1
                    for r in requests
                    if r.confidence_score < self.LOW_CONFIDENCE_THRESHOLD
                ),
                "period": {
                    "start": one_hour_ago.isoformat(),
                    "end": datetime.now(timezone.utc).isoformat(),
                },
            }

            # Cache for 1 minute
            cache_service.set(cache_key, metrics, ttl=60)

            return metrics

        except Exception as e:
            logger.error(f"Error getting real-time metrics: {str(e)}")
            return {}

    # ==================== PERFORMANCE TRACKING ====================

    def get_daily_metrics(
        self,
        model_name: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get daily aggregated metrics

        Args:
            model_name: Model name
            start_date: Start date (default: 30 days ago)
            end_date: End date (default: today)

        Returns:
            List of daily metrics
        """
        if not end_date:
            end_date = datetime.now(timezone.utc)
        if not start_date:
            start_date = end_date - timedelta(days=30)

        try:
            from app.models.ai_performance_metric import AIPerformanceMetric

            metrics = (
                self.db.query(AIPerformanceMetric)
                .filter(
                    and_(
                        AIPerformanceMetric.model_name == model_name,
                        AIPerformanceMetric.metric_date >= start_date.date(),
                        AIPerformanceMetric.metric_date <= end_date.date(),
                    )
                )
                .order_by(AIPerformanceMetric.metric_date)
                .all()
            )

            return [
                {
                    "date": m.metric_date.isoformat(),
                    "total_requests": m.total_requests,
                    "successful_requests": m.successful_requests,
                    "failed_requests": m.failed_requests,
                    "success_rate": (
                        round(float(getattr(m, "successful_requests")) / float(getattr(m, "total_requests")), 3)
                        if getattr(m, "total_requests") > 0
                        else 0.0
                    ),
                    "avg_response_time_ms": getattr(m, "avg_response_time_ms"),
                    "avg_confidence_score": (
                        float(getattr(m, "avg_confidence_score")) if getattr(m, "avg_confidence_score") is not None else 0.0
                    ),
                    "total_tokens": getattr(m, "total_tokens"),
                    "total_cost_usd": (
                        float(getattr(m, "total_cost_usd")) if getattr(m, "total_cost_usd") is not None else 0.0
                    ),
                }
                for m in metrics
            ]

        except Exception as e:
            logger.error(f"Error getting daily metrics: {str(e)}")
            return []

    def _update_daily_metrics(self, model_name: str):
        """Update daily metrics for a model (called after each request)"""
        try:
            from app.models.ai_request import AIRequest
            from app.models.ai_performance_metric import AIPerformanceMetric

            today = datetime.now(timezone.utc).date()

            # Get today's requests
            requests = (
                self.db.query(AIRequest)
                .filter(
                    and_(
                        AIRequest.model_name == model_name,
                        func.date(AIRequest.created_at) == today,
                    )
                )
                .all()
            )

            if not requests:
                return

            total = len(requests)
            successful = sum(1 for r in requests if r.success)

            # Calculate aggregates
            avg_response_time = int(sum(int(float(str(getattr(r, "response_time_ms") or 0))) for r in requests) / total)
            avg_confidence = sum(float(str(getattr(r, "confidence_score") or 0.0)) for r in requests) / total
            total_tokens = sum(getattr(r, "total_tokens") or 0 for r in requests)
            total_cost = sum(float(str(getattr(r, "cost_usd") or 0.0)) for r in requests)

            # Upsert daily metric
            metric = (
                self.db.query(AIPerformanceMetric)
                .filter(
                    and_(
                        AIPerformanceMetric.model_name == model_name,
                        AIPerformanceMetric.metric_date == today,
                    )
                )
                .first()
            )

            if metric:
                # Update existing using setattr to avoid IDE Column typing errors
                setattr(metric, "total_requests", total)
                setattr(metric, "successful_requests", successful)
                setattr(metric, "failed_requests", total - successful)
                setattr(metric, "avg_response_time_ms", avg_response_time)
                setattr(metric, "avg_confidence_score", avg_confidence)
                setattr(metric, "total_tokens", total_tokens)
                setattr(metric, "total_cost_usd", total_cost)
            else:
                # Create new using setattr to avoid IDE Column typing errors
                metric = AIPerformanceMetric()
                setattr(metric, "model_name", model_name)
                setattr(metric, "metric_date", today)
                setattr(metric, "total_requests", total)
                setattr(metric, "successful_requests", successful)
                setattr(metric, "failed_requests", total - successful)
                setattr(metric, "avg_response_time_ms", avg_response_time)
                setattr(metric, "avg_confidence_score", avg_confidence)
                setattr(metric, "total_tokens", total_tokens)
                setattr(metric, "total_cost_usd", total_cost)
                self.db.add(metric)

            self.db.commit()

        except Exception as e:
            logger.error(f"Error updating daily metrics: {str(e)}")
            self.db.rollback()

    # ==================== DRIFT DETECTION ====================

    def detect_drift(self, model_name: str, days: int = 7) -> Dict[str, Any]:
        """
        Detect performance drift over time

        Args:
            model_name: Model name
            days: Number of days to analyze

        Returns:
            Dictionary with drift analysis
        """
        try:
            # Get metrics for the period
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)

            metrics = self.get_daily_metrics(model_name, start_date, end_date)

            if len(metrics) < 2:
                return {
                    "drift_detected": False,
                    "message": "Insufficient data for drift detection",
                }

            # Calculate trends
            first_half = metrics[: len(metrics) // 2]
            second_half = metrics[len(metrics) // 2 :]

            avg_success_rate_first = sum(m["success_rate"] for m in first_half) / len(
                first_half
            )
            avg_success_rate_second = sum(m["success_rate"] for m in second_half) / len(
                second_half
            )

            avg_response_time_first = sum(
                m["avg_response_time_ms"] for m in first_half
            ) / len(first_half)
            avg_response_time_second = sum(
                m["avg_response_time_ms"] for m in second_half
            ) / len(second_half)

            avg_confidence_first = sum(
                m["avg_confidence_score"] for m in first_half
            ) / len(first_half)
            avg_confidence_second = sum(
                m["avg_confidence_score"] for m in second_half
            ) / len(second_half)

            # Detect significant changes
            success_rate_change = avg_success_rate_second - avg_success_rate_first
            response_time_change = avg_response_time_second - avg_response_time_first
            confidence_change = avg_confidence_second - avg_confidence_first

            drift_detected = False
            issues = []

            # Success rate degradation
            if success_rate_change < -0.05:  # 5% drop
                drift_detected = True
                issues.append(
                    f"Success rate decreased by {abs(success_rate_change)*100:.1f}%"
                )

            # Response time increase
            if response_time_change > 1000:  # 1 second increase
                drift_detected = True
                issues.append(
                    f"Response time increased by {response_time_change:.0f}ms"
                )

            # Confidence degradation
            if confidence_change < -0.1:  # 10% drop
                drift_detected = True
                issues.append(
                    f"Confidence score decreased by {abs(confidence_change)*100:.1f}%"
                )

            return {
                "drift_detected": drift_detected,
                "issues": issues,
                "metrics": {
                    "success_rate_change": round(success_rate_change, 3),
                    "response_time_change_ms": int(response_time_change),
                    "confidence_change": round(confidence_change, 3),
                },
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days,
                },
            }

        except Exception as e:
            logger.error(f"Error detecting drift: {str(e)}")
            return {"drift_detected": False, "error": str(e)}

    # ==================== ALERTING ====================

    def _check_alerts(self, model_name: str):
        """Check if any alerts should be triggered"""
        try:
            metrics = self.get_real_time_metrics(model_name)

            alerts = []

            # High error rate
            if metrics.get("error_rate", 0) > self.ERROR_RATE_THRESHOLD:
                alerts.append(
                    {
                        "type": "high_error_rate",
                        "severity": "high",
                        "message": f"Error rate is {metrics['error_rate']*100:.1f}% (threshold: {self.ERROR_RATE_THRESHOLD*100}%)",
                        "model": model_name,
                    }
                )

            # Slow response time
            if (
                metrics.get("avg_response_time_ms", 0)
                > self.AVG_RESPONSE_TIME_THRESHOLD
            ):
                alerts.append(
                    {
                        "type": "slow_response",
                        "severity": "medium",
                        "message": f"Average response time is {metrics['avg_response_time_ms']}ms (threshold: {self.AVG_RESPONSE_TIME_THRESHOLD}ms)",
                        "model": model_name,
                    }
                )

            # Low confidence rate
            low_confidence_rate = metrics.get("low_confidence_count", 0) / metrics.get(
                "total_requests", 1
            )
            if low_confidence_rate > self.LOW_CONFIDENCE_RATE_THRESHOLD:
                alerts.append(
                    {
                        "type": "low_confidence",
                        "severity": "medium",
                        "message": f"Low confidence rate is {low_confidence_rate*100:.1f}% (threshold: {self.LOW_CONFIDENCE_RATE_THRESHOLD*100}%)",
                        "model": model_name,
                    }
                )

            # Log alerts
            for alert in alerts:
                logger.warning(f"AI Alert: {alert['message']}")
                # TODO: Send to alerting system (email, Slack, etc.)

        except Exception as e:
            logger.error(f"Error checking alerts: {str(e)}")

    def get_model_comparison(self, days: int = 7) -> List[Dict[str, Any]]:
        """
        Compare performance across all models

        Args:
            days: Number of days to analyze

        Returns:
            List of model performance comparisons
        """
        try:
            from app.models.ai_performance_metric import AIPerformanceMetric

            end_date = datetime.now(timezone.utc).date()
            start_date = end_date - timedelta(days=days)

            # Get all models
            models = (
                self.db.query(AIPerformanceMetric.model_name)
                .filter(AIPerformanceMetric.metric_date >= start_date)
                .distinct()
                .all()
            )

            comparisons = []

            for (model_name,) in models:
                metrics = (
                    self.db.query(AIPerformanceMetric)
                    .filter(
                        and_(
                            AIPerformanceMetric.model_name == model_name,
                            AIPerformanceMetric.metric_date >= start_date,
                            AIPerformanceMetric.metric_date <= end_date,
                        )
                    )
                    .all()
                )

                if not metrics:
                    continue

                total_requests = sum(getattr(m, "total_requests") for m in metrics)
                total_successful = sum(getattr(m, "successful_requests") for m in metrics)

                comparisons.append(
                    {
                        "model_name": model_name,
                        "total_requests": total_requests,
                        "success_rate": (
                            round(float(total_successful) / float(total_requests), 3)
                            if total_requests > 0
                            else 0.0
                        ),
                        "avg_response_time_ms": (
                            int(
                                sum(
                                    float(getattr(m, "avg_response_time_ms")) * float(getattr(m, "total_requests"))
                                    for m in metrics
                                )
                                / float(total_requests)
                            )
                            if total_requests > 0
                            else 0
                        ),
                        "avg_confidence_score": (
                            round(
                                sum(
                                    float(getattr(m, "avg_confidence_score")) * float(getattr(m, "total_requests"))
                                    for m in metrics
                                )
                                / float(total_requests),
                                3,
                            )
                            if total_requests > 0
                            else 0.0
                        ),
                        "total_cost_usd": round(
                            sum(float(getattr(m, "total_cost_usd")) for m in metrics), 6
                        ),
                    }
                )

            # Sort by success rate (descending)
            comparisons.sort(key=lambda x: x["success_rate"], reverse=True)

            return comparisons

        except Exception as e:
            logger.error(f"Error getting model comparison: {str(e)}")
            return []

    # ==================== EXPORT ====================

    def export_metrics(
        self,
        model_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: str = "json",
    ) -> Any:
        """
        Export metrics data

        Args:
            model_name: Filter by model (optional)
            start_date: Start date (default: 30 days ago)
            end_date: End date (default: today)
            format: Export format ('json' or 'csv')

        Returns:
            Exported data
        """
        if not end_date:
            end_date = datetime.now(timezone.utc)
        if not start_date:
            start_date = end_date - timedelta(days=30)

        try:
            from app.models.ai_request import AIRequest

            query = self.db.query(AIRequest).filter(
                and_(
                    AIRequest.created_at >= start_date, AIRequest.created_at <= end_date
                )
            )

            if model_name:
                query = query.filter(AIRequest.model_name == model_name)

            requests = query.all()

            if format == "json":
                return [
                    {
                        "timestamp": r.created_at.isoformat(),
                        "model": r.model_name,
                        "template": r.prompt_template,
                        "tokens": r.total_tokens,
                        "response_time_ms": r.response_time_ms,
                        "confidence": float(str(r.confidence_score)),
                        "success": r.success,
                        "cost_usd": float(str(r.cost_usd)),
                    }
                    for r in requests
                ]

            elif format == "csv":
                import csv
                import io

                output = io.StringIO()
                writer = csv.writer(output)

                # Header
                writer.writerow(
                    [
                        "Timestamp",
                        "Model",
                        "Template",
                        "Tokens",
                        "Response Time (ms)",
                        "Confidence",
                        "Success",
                        "Cost (USD)",
                    ]
                )

                # Data
                for r in requests:
                    writer.writerow(
                        [
                            r.created_at.isoformat(),
                            r.model_name,
                            r.prompt_template or "",
                            r.total_tokens,
                            r.response_time_ms,
                            float(str(r.confidence_score)),
                            r.success,
                            float(str(r.cost_usd)),
                        ]
                    )

                return output.getvalue()

        except Exception as e:
            logger.error(f"Error exporting metrics: {str(e)}")
            return None


# Helper function
def get_monitoring_service(db: Session) -> AIMonitoringService:
    """Get monitoring service instance"""
    return AIMonitoringService(db)
