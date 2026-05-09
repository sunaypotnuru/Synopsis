from fastapi import APIRouter, Depends
import logging
from datetime import datetime, timedelta

from app.core.security import get_current_admin
from app.models.schemas import TokenPayload
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/security", tags=["Admin Security"])


@router.get("/stats")
async def get_security_stats(current_user: TokenPayload = Depends(get_current_admin)):
    """Get security overview stats from audit logs."""
    try:
        # Get failed logins in last 24h
        day_ago = (datetime.now() - timedelta(days=1)).isoformat()

        failed_res = (
            supabase.table("audit_trail")
            .select("id", count="exact")
            .eq("action", "login_failed")
            .gte("timestamp", day_ago)
            .execute()
        )
        failed_count = failed_res.count or 0

        # Get active sessions (approximated from unique user activity in last 15m)
        fifteen_mins_ago = (datetime.now() - timedelta(minutes=15)).isoformat()
        active_res = (
            supabase.table("audit_trail")
            .select("user_id")
            .gte("timestamp", fifteen_mins_ago)
            .execute()
        )
        active_sessions = len(
            set([a.get("user_id") for a in active_res.data or [] if a.get("user_id")])
        )

        # Get alerts (e.g. brute force detection or high severity incidents)
        alerts_res = (
            supabase.table("incidents")
            .select("id, title, severity, created_at")
            .eq("status", "open")
            .execute()
        )

        return {
            "failed_logins_24h": failed_count,
            "active_sessions": active_sessions,
            "open_alerts": len(alerts_res.data or []),
            "security_score": 98,  # Mock score for now
            "last_audit_date": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Security stats error: {e}")
        return {
            "failed_logins_24h": 0,
            "active_sessions": 0,
            "open_alerts": 0,
            "security_score": 100,
            "last_audit_date": datetime.now().isoformat(),
        }


@router.get("/sessions")
async def get_active_sessions(current_user: TokenPayload = Depends(get_current_admin)):
    """Get list of active user sessions (approximated from audit trail)."""
    try:
        thirty_mins_ago = (datetime.now() - timedelta(minutes=30)).isoformat()
        res = (
            supabase.table("audit_trail")
            .select("user_id, ip_address, user_agent, timestamp")
            .gte("timestamp", thirty_mins_ago)
            .order("timestamp", desc=True)
            .execute()
        )

        # Deduplicate by user_id
        seen = set()
        sessions = []
        for s in res.data or []:
            u_id = s.get("user_id")
            if u_id and u_id not in seen:
                seen.add(u_id)
                sessions.append(
                    {
                        "id": u_id[:8],
                        "user_id": u_id,
                        "ip": str(s.get("ip_address")),
                        "device": "Browser",  # Would parse UA in real app
                        "last_active": s.get("timestamp"),
                        "location": "Detected",
                    }
                )

        return sessions
    except Exception as e:
        logger.error(f"Security sessions error: {e}")
        return []


@router.get("/logs")
async def get_security_logs(
    limit: int = 50, current_user: TokenPayload = Depends(get_current_admin)
):
    """Get recent security-related audit logs."""
    try:
        res = (
            supabase.table("audit_trail")
            .select("*")
            .in_("event_category", ["security", "auth"])
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Security logs error: {e}")
        return []
