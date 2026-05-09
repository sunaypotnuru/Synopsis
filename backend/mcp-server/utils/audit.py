"""
utils/audit.py — Unified async audit logging for NetraAI MCP tools.

Design decisions:
- Fully async: all callers must `await audit_log(...)`.
- PHI scrubbing is handled inside AuditLogger.log_tool_invocation().
- Sentry monitoring is intentionally decoupled from this module;
  see _init_sentry_safe() in main.py for the Sentry setup.
- D2: JWT user_id extraction added in Phase 3.
"""

from typing import Dict, Any, Optional
import os
import sys
import jwt

# Resolve package root so imports work regardless of working directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from audit.logger import audit_logger


def extract_user_id_from_token(token: Optional[str]) -> str:
    """
    D2: Extract user_id from JWT token.

    Args:
        token: JWT token (with or without "Bearer " prefix)

    Returns:
        User ID from token, or "anonymous" if extraction fails
    """
    if not token:
        return "anonymous"

    try:
        # Remove "Bearer " prefix if present
        token = token.replace("Bearer ", "").strip()

        # Verify JWT signature whenever a secret is available.
        jwt_secret = os.getenv("JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            return "anonymous"

        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])

        # Extract user_id from standard JWT claims
        user_id = payload.get("sub") or payload.get("user_id") or payload.get("id")
        return user_id if user_id else "anonymous"

    except Exception as e:
        # If JWT parsing fails, fall back to anonymous
        print(f"[AUDIT] JWT parsing failed: {e}")
        return "anonymous"


async def audit_log(
    tool_name: str, patient_id: str, result: Dict[str, Any], token: Optional[str] = None
) -> None:
    """
    Persist an audit record to Supabase with PHI fields scrubbed.

    Args:
        tool_name:  Name of the MCP tool that was invoked.
        patient_id: FHIR Patient ID (used for log correlation, NOT stored raw).
        result:     The tool's return value (PHI will be redacted before storage).
        token:      Optional JWT token for user_id extraction (D2: Phase 3 addition).
    """
    try:
        # D2: Extract user_id from JWT token
        user_id = extract_user_id_from_token(token)

        await audit_logger.log_tool_invocation(
            tool_name=tool_name,
            user_id=user_id,  # D2: Now extracted from JWT instead of hardcoded
            patient_id=patient_id,
            action="execute",
            status="success",
            input_data={},  # Inputs not logged — they may contain raw PHI
            output_data=result,  # AuditLogger scrubs PHI keys before storing
            execution_time_ms=0,
        )
    except Exception as e:
        # Audit failures MUST NOT propagate — clinical tool results take priority
        # Only log in development/debug mode to avoid noise in production
        if os.getenv("ENVIRONMENT", "development") != "production":
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Audit logging failed for {tool_name}: {e}")
