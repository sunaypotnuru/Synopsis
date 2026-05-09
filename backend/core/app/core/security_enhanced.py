"""
Enhanced Security Module with JWT Verification and Additional Security Features
"""

import os
import hmac
import hashlib
import time
import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import bleach  # type: ignore[import-untyped]
import base64
import json

from app.core.config import settings
from app.models.schemas import TokenPayload, UserRole
from app.services.supabase import supabase

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Get JWT secret from environment
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
if not JWT_SECRET:
    logger.warning(
        "⚠️ SUPABASE_JWT_SECRET not set! JWT signature verification disabled."
    )

# HTML sanitization configuration
ALLOWED_TAGS = ["b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li"]
ALLOWED_ATTRIBUTES: Dict[str, list] = {}


def sanitize_html(text: str) -> str:
    """
    Remove potentially dangerous HTML/JS from user input
    """
    if not text:
        return text
    return bleach.clean(
        text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True
    )


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verify Supabase JWT with signature validation
    """
    try:
        if JWT_SECRET:
            # SECURE: Verify signature
            payload = jwt.decode(
                token, JWT_SECRET, algorithms=["HS256"], audience="authenticated"
            )
            logger.info("✅ JWT signature verified successfully")
        else:
            # FALLBACK: Decode without verification (DEVELOPMENT ONLY)
            logger.warning("⚠️ JWT signature verification skipped - DEVELOPMENT MODE")
            payload = jwt.decode(token, options={"verify_signature": False})

        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("❌ JWT token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"❌ Invalid JWT token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def log_security_event(
    event_type: str,
    user_id: Optional[str],
    request: Request,
    details: Optional[Dict] = None,
):
    """
    Log security events to database
    """
    try:
        ip_address = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.headers.get("X-Real-IP", "")
            or (request.client.host if request.client else "unknown")
        )

        event_data = {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": request.headers.get("user-agent"),
            "endpoint": str(request.url.path),
            "method": request.method,
            "details": details or {},
        }

        # Log to database (non-blocking)
        try:
            supabase.table("security_events").insert(event_data).execute()
        except Exception as db_err:
            logger.error(f"Failed to log security event to database: {db_err}")

        # Also log to application logs
        logger.warning(
            f"Security Event: {event_type} | User: {user_id} | IP: {ip_address}"
        )

    except Exception as e:
        logger.error(f"Error logging security event: {e}")


def verify_request_signature(
    request_body: str, timestamp: str, signature: str, secret: str
) -> bool:
    """
    Verify HMAC signature for sensitive operations
    Prevents replay attacks and unauthorized requests
    """
    try:
        # Check timestamp (prevent replay attacks - 5 minute window)
        current_time = time.time()
        request_time = float(timestamp)

        if abs(current_time - request_time) > 300:  # 5 minutes
            logger.warning(
                f"❌ Request timestamp too old: {current_time - request_time}s"
            )
            return False

        # Verify signature
        message = f"{timestamp}.{request_body}"
        expected = hmac.new(
            secret.encode(), message.encode(), hashlib.sha256
        ).hexdigest()

        is_valid = hmac.compare_digest(expected, signature)

        if not is_valid:
            logger.warning("❌ Invalid request signature")

        return is_valid

    except Exception as e:
        logger.error(f"Error verifying request signature: {e}")
        return False


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None,
) -> TokenPayload:
    """
    Get current authenticated user with enhanced security
    """
    # Bypass auth mode (DEVELOPMENT ONLY)
    if settings.BYPASS_AUTH:
        logger.warning("⚠️ BYPASS_AUTH is enabled - DEVELOPMENT MODE")
        role = UserRole.PATIENT
        email = "sunaysujsy@gmail.com"
        sub = "00000000-0000-0000-0000-000000000000"

        if credentials and credentials.credentials:
            token = credentials.credentials
            try:
                parts = token.split(".")
                if len(parts) == 3:
                    payload_part = parts[1]
                else:
                    payload_part = token

                payload_part += "=" * (-len(payload_part) % 4)

                try:
                    decoded = base64.urlsafe_b64decode(payload_part).decode("utf-8")
                except (UnicodeDecodeError, Exception):
                    decoded = base64.b64decode(payload_part).decode("utf-8")

                payload = json.loads(decoded)
                email = payload.get("email", email)
                sub = payload.get("sub", sub)
                user_meta = payload.get("user_metadata", {})
                role_str = user_meta.get("role") or payload.get("role", "patient")
                role = UserRole(
                    role_str.lower() if isinstance(role_str, str) else str(role_str)
                )

            except Exception as e:
                logger.error(f"Failed to decode bypass token: {e}")

        return TokenPayload(sub=sub, email=email, role=role)

    # Real authentication path
    if not credentials:
        if request:
            log_security_event(
                "auth_missing", None, request, {"reason": "No credentials provided"}
            )
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    try:
        payload = verify_supabase_jwt(token)

        user_metadata = payload.get("user_metadata", {})
        role_str = user_metadata.get("role", "patient")

        try:
            role = UserRole(role_str)
        except ValueError:
            role = UserRole.PATIENT

        user_id = payload.get("sub", "")
        email = payload.get("email", "")

        # Log successful authentication
        if request:
            log_security_event("auth_success", user_id, request, {"role": role.value})

        return TokenPayload(sub=user_id, email=email, role=role)

    except HTTPException:
        # Log failed authentication
        if request:
            log_security_event(
                "auth_failed", None, request, {"reason": "Invalid token"}
            )
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        if request:
            log_security_event("auth_error", None, request, {"error": str(e)})
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_patient(
    current_user: TokenPayload = Depends(get_current_user), request: Request = None
) -> TokenPayload:
    """
    Verify user has patient or admin role
    """
    if current_user.role not in [UserRole.PATIENT, UserRole.ADMIN]:
        if request:
            log_security_event(
                "permission_denied",
                current_user.sub,
                request,
                {"required_role": "patient", "actual_role": current_user.role.value},
            )
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_current_doctor(
    current_user: TokenPayload = Depends(get_current_user), request: Request = None
) -> TokenPayload:
    """
    Verify user has doctor or admin role
    """
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        if request:
            log_security_event(
                "permission_denied",
                current_user.sub,
                request,
                {"required_role": "doctor", "actual_role": current_user.role.value},
            )
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_current_admin(
    current_user: TokenPayload = Depends(get_current_user), request: Request = None
) -> TokenPayload:
    """
    Verify user has admin role
    """
    if current_user.role != UserRole.ADMIN:
        if request:
            log_security_event(
                "permission_denied",
                current_user.sub,
                request,
                {"required_role": "admin", "actual_role": current_user.role.value},
            )
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def log_failed_login(email: str, request: Request, reason: str):
    """
    Log failed login attempts for security monitoring
    """
    try:
        ip_address = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.headers.get("X-Real-IP", "")
            or (request.client.host if request.client else "unknown")
        )

        failed_login_data = {
            "email": email,
            "ip_address": ip_address,
            "user_agent": request.headers.get("user-agent"),
            "reason": reason,
        }

        # Log to database
        try:
            supabase.table("failed_login_attempts").insert(failed_login_data).execute()
        except Exception as db_err:
            logger.error(f"Failed to log failed login to database: {db_err}")

        # Also log to application logs
        logger.warning(f"Failed login attempt: {email} from {ip_address} - {reason}")

        # Check for brute force attacks (more than 5 failed attempts in 5 minutes)
        try:
            recent_attempts = (
                supabase.table("failed_login_attempts")
                .select("id")
                .eq("email", email)
                .gte("attempted_at", "now() - interval '5 minutes'")
                .execute()
            )

            if recent_attempts.data and len(recent_attempts.data) >= 5:
                logger.error(
                    f"🚨 BRUTE FORCE ATTACK DETECTED: {email} from {ip_address}"
                )
                log_security_event(
                    "brute_force_detected",
                    None,
                    request,
                    {"email": email, "attempts": len(recent_attempts.data)},
                )
        except Exception as e:
            logger.error(f"Error checking brute force: {e}")

    except Exception as e:
        logger.error(f"Error logging failed login: {e}")


# Export all security functions
__all__ = [
    "sanitize_html",
    "verify_supabase_jwt",
    "log_security_event",
    "verify_request_signature",
    "get_current_user",
    "get_current_patient",
    "get_current_doctor",
    "get_current_admin",
    "log_failed_login",
]
