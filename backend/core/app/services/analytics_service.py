"""
Analytics Service for Admin Dashboard
Provides comprehensive analytics and KPIs for healthcare platform
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

# SQLAlchemy models for analytics queries
from app.db.models import User, Appointment, AIConsultation, Message
from app.services.cache import cache_service
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for calculating and retrieving analytics data"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== USER ANALYTICS ====================

    def get_user_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive user analytics

        Args:
            start_date: Start date for filtering (default: 30 days ago)
            end_date: End date for filtering (default: now)

        Returns:
            Dictionary with user analytics
        """
        cache_key = f"analytics:users:{start_date}:{end_date}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Total users by role
        total_users = (
            self.db.query(User.role, func.count(User.id).label("count"))
            .group_by(User.role)
            .all()
        )

        # New registrations in period
        new_users = (
            self.db.query(func.count(User.id))
            .filter(User.created_at >= start_date, User.created_at <= end_date)
            .scalar()
            or 0
        )

        # Active users (users with activity in period)
        active_users = (
            self.db.query(func.count(func.distinct(Appointment.user_id)))
            .filter(
                Appointment.created_at >= start_date, Appointment.created_at <= end_date
            )
            .scalar()
            or 0
        )

        # User growth rate
        previous_period_start = start_date - (end_date - start_date)
        previous_new_users = (
            self.db.query(func.count(User.id))
            .filter(
                User.created_at >= previous_period_start, User.created_at < start_date
            )
            .scalar()
            or 0
        )

        growth_rate = 0.0
        if previous_new_users > 0:
            growth_rate = ((new_users - previous_new_users) / previous_new_users) * 100

        # Daily active users (last 7 days)
        dau_data = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            dau = (
                self.db.query(func.count(func.distinct(Appointment.user_id)))
                .filter(
                    Appointment.created_at >= day_start,
                    Appointment.created_at < day_end,
                )
                .scalar()
                or 0
            )

            dau_data.append(
                {"date": day_start.strftime("%Y-%m-%d"), "active_users": dau}
            )

        result = {
            "total_users": sum(count for _, count in total_users),
            "users_by_role": {role: count for role, count in total_users},
            "new_users": new_users,
            "active_users": active_users,
            "growth_rate": round(growth_rate, 2),
            "daily_active_users": list(reversed(dau_data)),
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }

        cache_service.set(cache_key, result, ttl=300)  # Cache for 5 minutes
        return result

    # ==================== APPOINTMENT ANALYTICS ====================

    def get_appointment_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive appointment analytics

        Args:
            start_date: Start date for filtering (default: 30 days ago)
            end_date: End date for filtering (default: now)

        Returns:
            Dictionary with appointment analytics
        """
        cache_key = f"analytics:appointments:{start_date}:{end_date}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Total appointments by status
        appointments_by_status = (
            self.db.query(Appointment.status, func.count(Appointment.id).label("count"))
            .filter(
                Appointment.created_at >= start_date, Appointment.created_at <= end_date
            )
            .group_by(Appointment.status)
            .all()
        )

        total_appointments = sum(count for _, count in appointments_by_status)
        completed = next(
            (
                count
                for status, count in appointments_by_status
                if status == "completed"
            ),
            0,
        )
        cancelled = next(
            (
                count
                for status, count in appointments_by_status
                if status == "cancelled"
            ),
            0,
        )

        # Completion rate
        completion_rate = (
            (completed / total_appointments * 100) if total_appointments > 0 else 0
        )
        cancellation_rate = (
            (cancelled / total_appointments * 100) if total_appointments > 0 else 0
        )

        # Daily appointment trends
        daily_trends = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_count = (
                self.db.query(func.count(Appointment.id))
                .filter(
                    Appointment.created_at >= day_start,
                    Appointment.created_at < day_end,
                )
                .scalar()
                or 0
            )

            daily_trends.append(
                {"date": day_start.strftime("%Y-%m-%d"), "appointments": day_count}
            )

        # Peak hours (appointments by hour of day)
        peak_hours = (
            self.db.query(
                extract("hour", Appointment.scheduled_time).label("hour"),
                func.count(Appointment.id).label("count"),
            )
            .filter(
                Appointment.created_at >= start_date, Appointment.created_at <= end_date
            )
            .group_by("hour")
            .order_by("hour")
            .all()
        )

        # Average appointments per day
        days_in_period = (end_date - start_date).days or 1
        avg_per_day = total_appointments / days_in_period

        result = {
            "total_appointments": total_appointments,
            "appointments_by_status": {
                status: count for status, count in appointments_by_status
            },
            "completed": completed,
            "cancelled": cancelled,
            "completion_rate": round(completion_rate, 2),
            "cancellation_rate": round(cancellation_rate, 2),
            "avg_per_day": round(avg_per_day, 2),
            "daily_trends": list(reversed(daily_trends)),
            "peak_hours": [
                {"hour": int(hour), "count": count} for hour, count in peak_hours
            ],
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }

        cache_service.set(cache_key, result, ttl=300)
        return result

    # ==================== AI USAGE ANALYTICS ====================

    def get_ai_usage_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get AI consultation usage analytics

        Args:
            start_date: Start date for filtering (default: 30 days ago)
            end_date: End date for filtering (default: now)

        Returns:
            Dictionary with AI usage analytics
        """
        cache_key = f"analytics:ai_usage:{start_date}:{end_date}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Total consultations
        total_consultations = (
            self.db.query(func.count(AIConsultation.id))
            .filter(
                AIConsultation.created_at >= start_date,
                AIConsultation.created_at <= end_date,
            )
            .scalar()
            or 0
        )

        # Average confidence score
        avg_confidence = (
            self.db.query(func.avg(AIConsultation.confidence_score))
            .filter(
                AIConsultation.created_at >= start_date,
                AIConsultation.created_at <= end_date,
            )
            .scalar()
            or 0.0
        )

        # Confidence distribution
        high_confidence = (
            self.db.query(func.count(AIConsultation.id))
            .filter(
                AIConsultation.created_at >= start_date,
                AIConsultation.created_at <= end_date,
                AIConsultation.confidence_score >= 0.8,
            )
            .scalar()
            or 0
        )

        medium_confidence = (
            self.db.query(func.count(AIConsultation.id))
            .filter(
                AIConsultation.created_at >= start_date,
                AIConsultation.created_at <= end_date,
                AIConsultation.confidence_score >= 0.5,
                AIConsultation.confidence_score < 0.8,
            )
            .scalar()
            or 0
        )

        low_confidence = (
            self.db.query(func.count(AIConsultation.id))
            .filter(
                AIConsultation.created_at >= start_date,
                AIConsultation.created_at <= end_date,
                AIConsultation.confidence_score < 0.5,
            )
            .scalar()
            or 0
        )

        # Daily AI usage trends
        daily_trends = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_count = (
                self.db.query(func.count(AIConsultation.id))
                .filter(
                    AIConsultation.created_at >= day_start,
                    AIConsultation.created_at < day_end,
                )
                .scalar()
                or 0
            )

            day_avg_confidence = (
                self.db.query(func.avg(AIConsultation.confidence_score))
                .filter(
                    AIConsultation.created_at >= day_start,
                    AIConsultation.created_at < day_end,
                )
                .scalar()
                or 0.0
            )

            daily_trends.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "consultations": day_count,
                    "avg_confidence": round(float(day_avg_confidence), 3),
                }
            )

        # Most common symptoms (top 10)
        # Note: This assumes symptoms are stored in a way we can query
        # Adjust based on actual data structure

        result = {
            "total_consultations": total_consultations,
            "avg_confidence_score": round(float(avg_confidence), 3),
            "confidence_distribution": {
                "high": high_confidence,
                "medium": medium_confidence,
                "low": low_confidence,
            },
            "daily_trends": list(reversed(daily_trends)),
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }

        cache_service.set(cache_key, result, ttl=300)
        return result

    # ==================== REVENUE ANALYTICS ====================

    def get_revenue_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get revenue analytics (placeholder for future payment integration)

        Args:
            start_date: Start date for filtering (default: 30 days ago)
            end_date: End date for filtering (default: now)

        Returns:
            Dictionary with revenue analytics
        """
        cache_key = f"analytics:revenue:{start_date}:{end_date}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Placeholder: Assuming $50 per completed appointment
        APPOINTMENT_PRICE = 50.0

        completed_appointments = (
            self.db.query(func.count(Appointment.id))
            .filter(
                Appointment.created_at >= start_date,
                Appointment.created_at <= end_date,
                Appointment.status == "completed",
            )
            .scalar()
            or 0
        )

        estimated_revenue = completed_appointments * APPOINTMENT_PRICE

        # Previous period comparison
        previous_period_start = start_date - (end_date - start_date)
        previous_completed = (
            self.db.query(func.count(Appointment.id))
            .filter(
                Appointment.created_at >= previous_period_start,
                Appointment.created_at < start_date,
                Appointment.status == "completed",
            )
            .scalar()
            or 0
        )

        previous_revenue = previous_completed * APPOINTMENT_PRICE
        revenue_growth = 0.0
        if previous_revenue > 0:
            revenue_growth = (
                (estimated_revenue - previous_revenue) / previous_revenue
            ) * 100

        # Daily revenue trends
        daily_trends = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_completed = (
                self.db.query(func.count(Appointment.id))
                .filter(
                    Appointment.created_at >= day_start,
                    Appointment.created_at < day_end,
                    Appointment.status == "completed",
                )
                .scalar()
                or 0
            )

            daily_trends.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "revenue": day_completed * APPOINTMENT_PRICE,
                    "appointments": day_completed,
                }
            )

        result = {
            "total_revenue": estimated_revenue,
            "completed_appointments": completed_appointments,
            "avg_revenue_per_appointment": APPOINTMENT_PRICE,
            "revenue_growth": round(revenue_growth, 2),
            "daily_trends": list(reversed(daily_trends)),
            "note": "Revenue is estimated based on completed appointments. Actual payment integration pending.",
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }

        cache_service.set(cache_key, result, ttl=300)
        return result

    # ==================== SYSTEM PERFORMANCE ANALYTICS ====================

    def get_system_performance(self) -> Dict[str, Any]:
        """
        Get system performance metrics

        Returns:
            Dictionary with system performance metrics
        """
        cache_key = "analytics:system_performance"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        # Database connection pool stats
        # Note: These are placeholders - actual implementation depends on DB setup

        # Active sessions (approximate from recent activity)
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)

        active_sessions = (
            self.db.query(func.count(func.distinct(Appointment.user_id)))
            .filter(Appointment.created_at >= last_hour)
            .scalar()
            or 0
        )

        # Cache hit rate (from cache service if available)
        cache_stats = (
            cache_service.get_stats() if hasattr(cache_service, "get_stats") else {}
        )

        # Total records in key tables
        total_users = self.db.query(func.count(User.id)).scalar() or 0
        total_appointments = self.db.query(func.count(Appointment.id)).scalar() or 0
        total_consultations = self.db.query(func.count(AIConsultation.id)).scalar() or 0
        total_messages = self.db.query(func.count(Message.id)).scalar() or 0

        result = {
            "active_sessions": active_sessions,
            "database_stats": {
                "total_users": total_users,
                "total_appointments": total_appointments,
                "total_consultations": total_consultations,
                "total_messages": total_messages,
            },
            "cache_stats": cache_stats,
            "uptime_note": "System uptime tracking requires external monitoring service",
            "timestamp": now.isoformat(),
        }

        cache_service.set(cache_key, result, ttl=60)  # Cache for 1 minute
        return result

    # ==================== MESSAGING ANALYTICS ====================

    def get_messaging_analytics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get messaging system analytics

        Args:
            start_date: Start date for filtering (default: 30 days ago)
            end_date: End date for filtering (default: now)

        Returns:
            Dictionary with messaging analytics
        """
        cache_key = f"analytics:messaging:{start_date}:{end_date}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Total messages
        total_messages = (
            self.db.query(func.count(Message.id))
            .filter(Message.created_at >= start_date, Message.created_at <= end_date)
            .scalar()
            or 0
        )

        # Active conversations
        active_conversations = (
            self.db.query(func.count(func.distinct(Message.conversation_id)))
            .filter(Message.created_at >= start_date, Message.created_at <= end_date)
            .scalar()
            or 0
        )

        # Active users (senders)
        active_users = (
            self.db.query(func.count(func.distinct(Message.sender_id)))
            .filter(Message.created_at >= start_date, Message.created_at <= end_date)
            .scalar()
            or 0
        )

        # Average messages per conversation
        avg_messages_per_conversation = (
            (total_messages / active_conversations) if active_conversations > 0 else 0
        )

        # Daily messaging trends
        daily_trends = []
        for i in range(7):
            day = end_date - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_messages = (
                self.db.query(func.count(Message.id))
                .filter(Message.created_at >= day_start, Message.created_at < day_end)
                .scalar()
                or 0
            )

            day_conversations = (
                self.db.query(func.count(func.distinct(Message.conversation_id)))
                .filter(Message.created_at >= day_start, Message.created_at < day_end)
                .scalar()
                or 0
            )

            daily_trends.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "messages": day_messages,
                    "conversations": day_conversations,
                }
            )

        result = {
            "total_messages": total_messages,
            "active_conversations": active_conversations,
            "active_users": active_users,
            "avg_messages_per_conversation": round(avg_messages_per_conversation, 2),
            "daily_trends": list(reversed(daily_trends)),
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }

        cache_service.set(cache_key, result, ttl=300)
        return result

    # ==================== OVERVIEW ANALYTICS ====================

    def get_overview(self) -> Dict[str, Any]:
        """
        Get overview analytics dashboard

        Returns:
            Dictionary with overview of all key metrics
        """
        cache_key = "analytics:overview"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        now = datetime.utcnow()
        last_30_days = now - timedelta(days=30)

        # Get summary from each analytics category
        user_summary = self.get_user_analytics(last_30_days, now)
        appointment_summary = self.get_appointment_analytics(last_30_days, now)
        ai_summary = self.get_ai_usage_analytics(last_30_days, now)
        revenue_summary = self.get_revenue_analytics(last_30_days, now)
        messaging_summary = self.get_messaging_analytics(last_30_days, now)
        system_summary = self.get_system_performance()

        result = {
            "overview": {
                "total_users": user_summary["total_users"],
                "new_users_30d": user_summary["new_users"],
                "active_users_30d": user_summary["active_users"],
                "total_appointments_30d": appointment_summary["total_appointments"],
                "completion_rate": appointment_summary["completion_rate"],
                "ai_consultations_30d": ai_summary["total_consultations"],
                "ai_avg_confidence": ai_summary["avg_confidence_score"],
                "estimated_revenue_30d": revenue_summary["total_revenue"],
                "total_messages_30d": messaging_summary["total_messages"],
                "active_conversations_30d": messaging_summary["active_conversations"],
            },
            "users": user_summary,
            "appointments": appointment_summary,
            "ai_usage": ai_summary,
            "revenue": revenue_summary,
            "messaging": messaging_summary,
            "system": system_summary,
            "generated_at": now.isoformat(),
        }

        cache_service.set(cache_key, result, ttl=300)
        return result


# Singleton instance
def get_analytics_service(db: Session) -> AnalyticsService:
    """Get analytics service instance"""
    return AnalyticsService(db)
