"""
AI Rate Limiting Service
Multi-dimensional rate limiting for AI requests (RPM, TPM, RPD, TPD, Cost)
"""

import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class AIRateLimitService:
    """Service for AI rate limiting and cost control"""

    # Rate limit tiers by user role
    RATE_LIMITS = {
        "free": {
            "rpm": 2,  # Requests per minute
            "rpd": 10,  # Requests per day
            "tpm": 1000,  # Tokens per minute
            "tpd": 10000,  # Tokens per day
            "cpd": 0.10,  # Cost per day (USD)
        },
        "patient": {"rpm": 5, "rpd": 50, "tpm": 5000, "tpd": 50000, "cpd": 1.00},
        "doctor": {"rpm": 20, "rpd": 200, "tpm": 20000, "tpd": 200000, "cpd": 10.00},
        "admin": {
            "rpm": 50,
            "rpd": None,  # Unlimited
            "tpm": 50000,
            "tpd": None,  # Unlimited
            "cpd": None,  # Unlimited
        },
    }

    def __init__(self, db: Session):
        self.db = db

    def get_user_limits(self, user_role: str) -> Dict[str, Any]:
        """
        Get rate limits for user role

        Args:
            user_role: User role (free, patient, doctor, admin)

        Returns:
            Dictionary with rate limits
        """
        return self.RATE_LIMITS.get(user_role.lower(), self.RATE_LIMITS["free"])

    def check_rate_limit(
        self,
        user_id: str,
        user_role: str,
        estimated_tokens: int = 0,
        estimated_cost: float = 0.0,
    ) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Check if user can make an AI request

        Args:
            user_id: User ID
            user_role: User role
            estimated_tokens: Estimated tokens for this request
            estimated_cost: Estimated cost for this request

        Returns:
            Tuple of (allowed, reason, current_usage)
        """
        try:
            # Get user limits
            limits = self.get_user_limits(user_role)

            # Get or create rate limit record
            rate_limit = self._get_or_create_rate_limit(user_id)

            # Check if daily reset needed
            if rate_limit.daily_reset_at <= datetime.now(timezone.utc):
                self._reset_daily_limits(user_id)
                rate_limit = self._get_or_create_rate_limit(user_id)

            # Get current usage
            current_usage = {
                "requests_today": getattr(rate_limit, "requests_today") or 0,
                "tokens_today": getattr(rate_limit, "tokens_today") or 0,
                "cost_today": float(str(getattr(rate_limit, "cost_today") or 0.0)),
                "last_request_at": (
                    rate_limit.last_request_at.isoformat()
                    if rate_limit.last_request_at
                    else None
                ),
            }

            # Check RPM (requests per minute)
            if limits["rpm"] is not None:
                if rate_limit.last_request_at:
                    time_since_last = (
                        datetime.now(timezone.utc) - rate_limit.last_request_at
                    ).total_seconds()
                    if time_since_last < 60 / limits["rpm"]:
                        wait_time = int(60 / limits["rpm"] - time_since_last)
                        return (
                            False,
                            f"Rate limit exceeded: {limits['rpm']} requests per minute. Wait {wait_time}s.",
                            current_usage,
                        )

            # Check RPD (requests per day)
            if limits["rpd"] is not None:
                if rate_limit.requests_today >= limits["rpd"]:
                    return (
                        False,
                        f"Daily request limit exceeded: {limits['rpd']} requests per day",
                        current_usage,
                    )

            # Check TPM (tokens per minute) - approximate
            if limits["tpm"] is not None and estimated_tokens > 0:
                if estimated_tokens > limits["tpm"]:
                    return (
                        False,
                        f"Request would exceed token limit: {estimated_tokens} > {limits['tpm']} tokens per minute",
                        current_usage,
                    )

            # Check TPD (tokens per day)
            if limits["tpd"] is not None:
                if rate_limit.tokens_today + estimated_tokens > limits["tpd"]:
                    remaining = limits["tpd"] - rate_limit.tokens_today
                    return (
                        False,
                        f"Daily token limit exceeded: {remaining} tokens remaining of {limits['tpd']}",
                        current_usage,
                    )

            # Check CPD (cost per day)
            if limits["cpd"] is not None:
                if float(getattr(rate_limit, "cost_today") or 0.0) + estimated_cost > limits["cpd"]:
                    remaining = float(limits["cpd"]) - float(getattr(rate_limit, "cost_today") or 0.0)
                    return (
                        False,
                        f"Daily cost limit exceeded: ${remaining:.4f} remaining of ${limits['cpd']}",
                        current_usage,
                    )

            # All checks passed
            return True, None, current_usage

        except Exception as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            # Fail open (allow request) to avoid blocking users on errors
            return True, None, {}

    def record_request(self, user_id: str, tokens_used: int, cost: float) -> bool:
        """
        Record an AI request and update usage

        Args:
            user_id: User ID
            tokens_used: Tokens used in this request
            cost: Cost of this request

        Returns:
            True if recorded successfully
        """
        try:

            rate_limit = self._get_or_create_rate_limit(user_id)

            # Update usage using setattr to avoid IDE Column typing errors
            setattr(rate_limit, "requests_today", int(getattr(rate_limit, "requests_today") or 0) + 1)
            setattr(rate_limit, "tokens_today", int(getattr(rate_limit, "tokens_today") or 0) + tokens_used)
            setattr(rate_limit, "cost_today", float(getattr(rate_limit, "cost_today") or 0.0) + cost)
            setattr(rate_limit, "last_request_at", datetime.now(timezone.utc))

            self.db.commit()

            return True

        except Exception as e:
            logger.error(f"Error recording request: {str(e)}")
            self.db.rollback()
            return False

    def _get_or_create_rate_limit(self, user_id: str):
        """Get or create rate limit record for user"""
        try:
            from app.models.ai_rate_limit import AIRateLimit

            rate_limit = (
                self.db.query(AIRateLimit)
                .filter(AIRateLimit.user_id == user_id)
                .first()
            )

            if not rate_limit:
                rate_limit = AIRateLimit(
                    user_id=user_id,
                    requests_today=0,
                    tokens_today=0,
                    cost_today=0.0,
                    daily_reset_at=datetime.now(timezone.utc).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    + timedelta(days=1),
                )
                self.db.add(rate_limit)
                self.db.commit()

            return rate_limit

        except Exception as e:
            logger.error(f"Error getting/creating rate limit: {str(e)}")
            raise

    def _reset_daily_limits(self, user_id: str):
        """Reset daily limits for user"""
        try:
            from app.models.ai_rate_limit import AIRateLimit

            rate_limit = (
                self.db.query(AIRateLimit)
                .filter(AIRateLimit.user_id == user_id)
                .first()
            )

            if rate_limit:
                # Use setattr to avoid IDE Column typing errors
                setattr(rate_limit, "requests_today", 0)
                setattr(rate_limit, "tokens_today", 0)
                setattr(rate_limit, "cost_today", 0.0)
                setattr(rate_limit, "daily_reset_at", datetime.now(timezone.utc).replace(
                    hour=0, minute=0, second=0, microsecond=0
                ) + timedelta(days=1))
                self.db.commit()

        except Exception as e:
            logger.error(f"Error resetting daily limits: {str(e)}")
            self.db.rollback()

    def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get usage statistics for user

        Args:
            user_id: User ID

        Returns:
            Dictionary with usage stats
        """
        try:
            rate_limit = self._get_or_create_rate_limit(user_id)

            return {
                "requests_today": getattr(rate_limit, "requests_today") or 0,
                "tokens_today": getattr(rate_limit, "tokens_today") or 0,
                "cost_today": float(str(getattr(rate_limit, "cost_today") or 0.0)),
                "last_request_at": (
                    rate_limit.last_request_at.isoformat()
                    if rate_limit.last_request_at
                    else None
                ),
                "daily_reset_at": rate_limit.daily_reset_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error getting usage stats: {str(e)}")
            return {}

    def estimate_cost(
        self, model_name: str, input_tokens: int, output_tokens: int
    ) -> float:
        """
        Estimate cost for a request

        Args:
            model_name: Model name
            input_tokens: Input token count
            output_tokens: Output token count

        Returns:
            Estimated cost in USD
        """
        # Pricing (example for GPT-3.5-Turbo)
        # For FREE TIER: Use local models (cost = 0)
        pricing = {
            "gpt-3.5-turbo": {
                "input": 0.0015 / 1000,  # $0.0015 per 1K tokens
                "output": 0.002 / 1000,  # $0.002 per 1K tokens
            },
            "gpt-4": {"input": 0.03 / 1000, "output": 0.06 / 1000},
            "local": {"input": 0.0, "output": 0.0},
        }

        # Default to local (free) if model not found
        model_pricing = pricing.get(model_name.lower(), pricing["local"])

        cost = (input_tokens * model_pricing["input"]) + (
            output_tokens * model_pricing["output"]
        )

        return round(cost, 6)

    def get_remaining_quota(self, user_id: str, user_role: str) -> Dict[str, Any]:
        """
        Get remaining quota for user

        Args:
            user_id: User ID
            user_role: User role

        Returns:
            Dictionary with remaining quotas
        """
        try:
            limits = self.get_user_limits(user_role)
            rate_limit = self._get_or_create_rate_limit(user_id)

            remaining = {}

            # Requests
            if limits["rpd"] is not None:
                remaining["requests"] = max(
                    0, limits["rpd"] - rate_limit.requests_today
                )
            else:
                remaining["requests"] = "unlimited"

            # Tokens
            if limits["tpd"] is not None:
                remaining["tokens"] = max(0, limits["tpd"] - rate_limit.tokens_today)
            else:
                remaining["tokens"] = "unlimited"

            # Cost
            if limits["cpd"] is not None:
                remaining["cost_usd"] = max(
                    0.0, limits["cpd"] - float(str(getattr(rate_limit, "cost_today") or 0.0))
                )
            else:
                remaining["cost_usd"] = "unlimited"

            # Percentage used
            if limits["rpd"] is not None:
                remaining["requests_used_percent"] = round(
                    (rate_limit.requests_today / limits["rpd"]) * 100, 1
                )
            else:
                remaining["requests_used_percent"] = 0

            if limits["tpd"] is not None:
                remaining["tokens_used_percent"] = round(
                    (rate_limit.tokens_today / limits["tpd"]) * 100, 1
                )
            else:
                remaining["tokens_used_percent"] = 0

            if limits["cpd"] is not None:
                remaining["cost_used_percent"] = round(
                    (float(str(getattr(rate_limit, "cost_today") or 0.0)) / limits["cpd"]) * 100, 1
                )
            else:
                remaining["cost_used_percent"] = 0

            return remaining

        except Exception as e:
            logger.error(f"Error getting remaining quota: {str(e)}")
            return {}

    def should_alert_user(
        self, user_id: str, user_role: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user should be alerted about approaching limits

        Args:
            user_id: User ID
            user_role: User role

        Returns:
            Tuple of (should_alert, message)
        """
        try:
            remaining = self.get_remaining_quota(user_id, user_role)

            # Alert at 80% usage
            if remaining.get("requests_used_percent", 0) >= 80:
                return (
                    True,
                    f"You've used {remaining['requests_used_percent']}% of your daily request limit",
                )

            if remaining.get("tokens_used_percent", 0) >= 80:
                return (
                    True,
                    f"You've used {remaining['tokens_used_percent']}% of your daily token limit",
                )

            if remaining.get("cost_used_percent", 0) >= 80:
                return (
                    True,
                    f"You've used {remaining['cost_used_percent']}% of your daily cost limit",
                )

            return False, None

        except Exception as e:
            logger.error(f"Error checking alert: {str(e)}")
            return False, None


# Helper function
def get_rate_limit_service(db: Session) -> AIRateLimitService:
    """Get rate limit service instance"""
    return AIRateLimitService(db)
