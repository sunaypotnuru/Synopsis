from fastapi import APIRouter, Depends
from typing import Optional
import logging

from app.core.security import get_current_admin
from app.models.schemas import TokenPayload
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/admin/audit", tags=["Audit"])


@router.get("/logs")
async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Get audit logs with filters."""
    try:
        query = supabase.table("audit_logs").select("*")

        if action:
            query = query.eq("action", action)
        if user_id:
            query = query.eq("user_id", user_id)
        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        res = query.execute()

        return {"logs": res.data or [], "total": len(res.data) if res.data else 0}
    except Exception as e:
        logger.warning(f"audit_logs table not available: {e}")
        return {
            "logs": [],
            "total": 0,
            "message": "Audit log table not yet configured.",
        }


@router.get("/stats")
async def get_audit_stats(current_user: TokenPayload = Depends(get_current_admin)):
    """Get audit statistics."""
    try:
        # Get total logs
        total_res = supabase.table("audit_logs").select("id", count="exact").execute()
        total = (
            total_res.count if hasattr(total_res, "count") and total_res.count else 0
        )
        # Get recent activity (skip unreliable RPC)
        recent_res = (
            supabase.table("audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        return {
            "total_logs": total,
            "actions": [],
            "recent_activity": recent_res.data or [],
        }
    except Exception as e:
        logger.warning(f"audit_logs table not available: {e}")
        return {
            "total_logs": 0,
            "actions": [],
            "recent_activity": [],
            "message": "Audit log table not yet configured.",
        }


async def log_audit(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status: str = "success",
):
    """Helper function to log audit events."""
    try:
        supabase.table("audit_logs").insert(
            {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "status": status,
            }
        ).execute()
    except Exception as e:
        logger.error(f"Error logging audit: {e}")
