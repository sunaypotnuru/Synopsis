from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.services.supabase import supabase
from app.services.login_history_service import get_login_history_service
from app.core.security import get_current_user

router = APIRouter(prefix="/auth/security", tags=["auth-security"])

# In-memory protection layer for brute-force mitigation.
# This is process-local by design (safe fallback when DB/logging is unavailable).
_FAILED_ATTEMPTS: Dict[Tuple[str, str], List[datetime]] = {}
_FAILED_ATTEMPTS_LIMIT = 5
_LOCKOUT_MINUTES = 30
_WINDOW_MINUTES = 30


class LoginPrecheckRequest(BaseModel):
    email: EmailStr
    ip_address: str = "unknown"


class LoginAttemptReportRequest(BaseModel):
    email: EmailStr
    success: bool
    ip_address: str = "unknown"
    reason: str = "invalid_credentials"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _prune_attempts(attempts: List[datetime]) -> List[datetime]:
    cutoff = _utcnow() - timedelta(minutes=_WINDOW_MINUTES)
    return [attempt for attempt in attempts if attempt >= cutoff]


def _get_attempt_state(email: str, ip_address: str) -> Tuple[List[datetime], int]:
    key = (email.lower(), ip_address or "unknown")
    attempts = _prune_attempts(_FAILED_ATTEMPTS.get(key, []))
    _FAILED_ATTEMPTS[key] = attempts
    remaining = max(0, _FAILED_ATTEMPTS_LIMIT - len(attempts))
    return attempts, remaining


def _best_effort_audit(action: str, payload: dict) -> None:
    try:
        supabase.table("audit_trail").insert(
            {
                "action": action,
                "event_category": "auth",
                "status": "success" if action == "login_success" else "failed",
                "details": payload,
                "timestamp": _utcnow().isoformat(),
            }
        ).execute()
    except Exception:
        # Never block authentication flow on audit pipeline failures.
        pass


@router.post("/precheck")
async def login_precheck(body: LoginPrecheckRequest):
    attempts, remaining = _get_attempt_state(body.email, body.ip_address)
    if len(attempts) < _FAILED_ATTEMPTS_LIMIT:
        return {
            "allowed": True,
            "remaining_attempts": remaining,
            "retry_after_seconds": 0,
        }

    newest_attempt = max(attempts)
    retry_at = newest_attempt + timedelta(minutes=_LOCKOUT_MINUTES)
    retry_after_seconds = max(0, int((retry_at - _utcnow()).total_seconds()))
    return {
        "allowed": retry_after_seconds <= 0,
        "remaining_attempts": 0,
        "retry_after_seconds": retry_after_seconds,
    }


@router.post("/report-attempt")
async def report_login_attempt(body: LoginAttemptReportRequest):
    key = (body.email.lower(), body.ip_address or "unknown")
    attempts = _prune_attempts(_FAILED_ATTEMPTS.get(key, []))

    if body.success:
        _FAILED_ATTEMPTS.pop(key, None)
        _best_effort_audit(
            "login_success", {"email": body.email, "ip_address": body.ip_address}
        )
        return {
            "status": "ok",
            "locked": False,
            "remaining_attempts": _FAILED_ATTEMPTS_LIMIT,
        }

    attempts.append(_utcnow())
    _FAILED_ATTEMPTS[key] = attempts
    remaining = max(0, _FAILED_ATTEMPTS_LIMIT - len(attempts))
    _best_effort_audit(
        "login_failed",
        {"email": body.email, "ip_address": body.ip_address, "reason": body.reason},
    )
    return {
        "status": "ok",
        "locked": len(attempts) >= _FAILED_ATTEMPTS_LIMIT,
        "remaining_attempts": remaining,
    }


@router.get("/policy")
async def get_auth_security_policy():
    enforce_admin_2fa = False
    try:
        result = (
            supabase.table("system_config")
            .select("value")
            .eq("key", "2fa_enforcement")
            .limit(1)
            .execute()
        )
        if result.data and len(result.data) > 0:
            enforce_admin_2fa = bool(result.data[0].get("value", False))
    except Exception:
        # Keep default policy if config table is unavailable.
        pass

    return {"enforce_admin_2fa": enforce_admin_2fa}


# ============================================================================
# LOGIN HISTORY ENDPOINTS (Category 3: Security Enhancements)
# ============================================================================


class LoginHistoryResponse(BaseModel):
    """Login history record response."""

    id: str
    login_at: str
    ip_address: str
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    success: bool
    failure_reason: Optional[str]


class RecentLoginResponse(BaseModel):
    """Recent login summary response."""

    login_at: str
    ip_address: str
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]


class SuspiciousActivityResponse(BaseModel):
    """Suspicious activity detection response."""

    suspicious: bool
    multiple_ips: bool
    ip_count: int
    multiple_devices: bool
    device_count: int
    failed_attempts_24h: int
    high_failure_rate: bool


@router.get("/login-history", response_model=List[LoginHistoryResponse])
async def get_login_history(
    limit: int = 50, current_user: dict = Depends(get_current_user)
):
    """
    Get user's login history.

    Returns up to `limit` most recent login attempts (success + failure).

    **HIPAA Compliance**: 6-year retention, audit trail
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        login_history_service = get_login_history_service()
        history = await login_history_service.get_user_login_history(user_id, limit)

        return [
            LoginHistoryResponse(
                id=str(record.get("id")),
                login_at=record.get("login_at"),
                ip_address=record.get("ip_address"),
                device_type=record.get("device_type"),
                browser=record.get("browser"),
                os=record.get("os"),
                success=record.get("success"),
                failure_reason=record.get("failure_reason"),
            )
            for record in history
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get login history: {str(e)}"
        )


@router.get("/login-history/recent", response_model=List[RecentLoginResponse])
async def get_recent_logins(
    limit: int = 10, current_user: dict = Depends(get_current_user)
):
    """
    Get recent successful logins.

    Returns up to `limit` most recent successful logins only.
    Useful for "Recent Activity" widgets.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        login_history_service = get_login_history_service()
        recent = await login_history_service.get_recent_logins(user_id, limit)

        return [
            RecentLoginResponse(
                login_at=record.get("login_at"),
                ip_address=record.get("ip_address"),
                device_type=record.get("device_type"),
                browser=record.get("browser"),
                os=record.get("os"),
            )
            for record in recent
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recent logins: {str(e)}"
        )


@router.get("/login-history/suspicious", response_model=SuspiciousActivityResponse)
async def detect_suspicious_activity(current_user: dict = Depends(get_current_user)):
    """
    Detect suspicious login activity.

    Checks for:
    - Multiple IPs (>3 in last 10 logins)
    - Multiple device types (>2 in last 10 logins)
    - High failure rate (>5 failed attempts in 24h)

    **Zero Trust**: Always verify, never trust
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        login_history_service = get_login_history_service()
        activity = await login_history_service.detect_suspicious_activity(user_id)

        return SuspiciousActivityResponse(**activity)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to detect suspicious activity: {str(e)}"
        )


@router.get("/admin/login-history", response_model=List[LoginHistoryResponse])
async def admin_get_all_login_history(
    user_email: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """
    Admin endpoint: Get login history for all users or specific user.

    **Admin Only**: Requires admin role
    **HIPAA Compliance**: Audit trail access for compliance officers
    """
    try:
        # Check if user is admin
        user_role = current_user.get("role")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        # Build query
        query = supabase.table("login_history").select("*")

        # Filter by email if provided
        if user_email:
            query = query.eq("email", user_email)

        # Order by most recent first
        query = query.order("login_at", desc=True).limit(limit)

        result = query.execute()
        history = result.data or []

        return [
            LoginHistoryResponse(
                id=str(record.get("id")),
                login_at=record.get("login_at"),
                ip_address=record.get("ip_address"),
                device_type=record.get("device_type"),
                browser=record.get("browser"),
                os=record.get("os"),
                success=record.get("success"),
                failure_reason=record.get("failure_reason"),
            )
            for record in history
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get login history: {str(e)}"
        )
