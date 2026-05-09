"""
Industrial-Grade Session Management Service (HIPAA Compliant).

Features:
- 15-minute idle timeout (HIPAA requirement)
- Activity tracking
- Automatic logout
- Session extension on activity
- Hard termination (no soft hide)

Based on 2026 HIPAA compliance standards:
- 45 CFR § 164.312(a)(2)(iii) - Automatic Logoff
- Session timeout: 15 minutes of inactivity
- Hard termination: Re-authentication mandatory

References:
- https://www.accountablehq.com/post/session-timeout-requirements-for-ehr-systems-2026-compliance-standards-and-best-practices
- https://hoop.dev/blog/hipaa-session-timeout-enforcement-why-it-matters-and-how-to-implement-it/
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo

from app.services.supabase import supabase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configuration
SESSION_TIMEOUT_MINUTES = getattr(
    settings, "SESSION_TIMEOUT_MINUTES", 15
)  # HIPAA standard
SESSION_WARNING_MINUTES = getattr(
    settings, "SESSION_WARNING_MINUTES", 2
)  # Warning before timeout
DEFAULT_TIMEZONE = "UTC"


class SessionExpiredError(Exception):
    """Raised when session has expired."""

    pass


class SessionService:
    """
    Industrial-grade session management service.

    HIPAA Compliance:
    - 15-minute idle timeout
    - Hard termination (no soft hide)
    - Activity tracking
    - Audit logging
    """

    def __init__(self):
        self.timeout_minutes = SESSION_TIMEOUT_MINUTES
        self.warning_minutes = SESSION_WARNING_MINUTES

    async def create_session(
        self,
        user_id: str,
        session_token: str,
        ip_address: str,
        user_agent: str,
        device_fingerprint: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new session with timeout tracking.

        Args:
            user_id: User's UUID
            session_token: Session token from Supabase Auth
            ip_address: Client IP address
            user_agent: Client user agent
            device_fingerprint: Device fingerprint (optional)

        Returns:
            Session data
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            expires_at = now + timedelta(minutes=self.timeout_minutes)

            session_data = {
                "user_id": user_id,
                "session_token": session_token,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "device_fingerprint": device_fingerprint,
                "created_at": now.isoformat(),
                "last_activity_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "is_active": True,
            }

            # Store in database (best-effort)
            try:
                result = supabase.table("user_sessions").insert(session_data).execute()
                if result.data:
                    logger.info(
                        f"Session created: user={user_id[:8]}***, expires={expires_at.isoformat()}"
                    )
                    return result.data[0]
            except Exception as db_error:
                logger.warning(f"Failed to store session in database: {db_error}")
                # Return session data even if DB storage fails
                return session_data

            return session_data

        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise

    async def update_activity(self, session_token: str) -> Dict[str, Any]:
        """
        Update session activity timestamp (extends session).

        Args:
            session_token: Session token

        Returns:
            Updated session data

        Raises:
            SessionExpiredError: If session has expired
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            new_expires_at = now + timedelta(minutes=self.timeout_minutes)

            # Get current session
            result = (
                supabase.table("user_sessions")
                .select("*")
                .eq("session_token", session_token)
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )

            if not result.data:
                raise SessionExpiredError("Session not found or inactive")

            session = result.data

            # Check if session has expired
            expires_at = datetime.fromisoformat(
                str(session["expires_at"]).replace("Z", "+00:00")
            )

            if now > expires_at:
                # Session expired - mark as inactive
                await self.terminate_session(session_token, reason="timeout")
                raise SessionExpiredError("Session has expired due to inactivity")

            # Update activity timestamp
            update_result = (
                supabase.table("user_sessions")
                .update(
                    {
                        "last_activity_at": now.isoformat(),
                        "expires_at": new_expires_at.isoformat(),
                    }
                )
                .eq("session_token", session_token)
                .execute()
            )

            if update_result.data:
                logger.debug(
                    f"Session activity updated: user={session['user_id'][:8]}***"
                )
                return update_result.data[0]

            return session

        except SessionExpiredError:
            raise
        except Exception as e:
            logger.error(f"Error updating session activity: {e}")
            # Don't fail the request if activity update fails
            return {}

    async def check_session_validity(self, session_token: str) -> bool:
        """
        Check if session is still valid.

        Args:
            session_token: Session token

        Returns:
            True if valid, False otherwise
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Get session
            result = (
                supabase.table("user_sessions")
                .select("expires_at, is_active")
                .eq("session_token", session_token)
                .maybe_single()
                .execute()
            )

            if not result.data:
                return False

            session = result.data

            # Check if active
            if not session.get("is_active"):
                return False

            # Check if expired
            expires_at = datetime.fromisoformat(
                str(session["expires_at"]).replace("Z", "+00:00")
            )

            if now > expires_at:
                # Auto-terminate expired session
                await self.terminate_session(session_token, reason="timeout")
                return False

            return True

        except Exception as e:
            logger.error(f"Error checking session validity: {e}")
            # Fail-safe: assume invalid on error
            return False

    async def get_time_until_expiry(self, session_token: str) -> Optional[int]:
        """
        Get seconds until session expires.

        Args:
            session_token: Session token

        Returns:
            Seconds until expiry, or None if session not found
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Get session
            result = (
                supabase.table("user_sessions")
                .select("expires_at, is_active")
                .eq("session_token", session_token)
                .maybe_single()
                .execute()
            )

            if not result.data or not result.data.get("is_active"):
                return None

            expires_at = datetime.fromisoformat(
                str(result.data["expires_at"]).replace("Z", "+00:00")
            )

            seconds_remaining = (expires_at - now).total_seconds()

            return max(0, int(seconds_remaining))

        except Exception as e:
            logger.error(f"Error getting time until expiry: {e}")
            return None

    async def should_show_warning(self, session_token: str) -> bool:
        """
        Check if session warning should be shown.

        Args:
            session_token: Session token

        Returns:
            True if warning should be shown
        """
        try:
            seconds_remaining = await self.get_time_until_expiry(session_token)

            if seconds_remaining is None:
                return False

            warning_seconds = self.warning_minutes * 60

            return seconds_remaining <= warning_seconds

        except Exception as e:
            logger.error(f"Error checking warning status: {e}")
            return False

    async def terminate_session(
        self, session_token: str, reason: str = "manual"
    ) -> bool:
        """
        Terminate a session (hard termination).

        Args:
            session_token: Session token
            reason: Termination reason (timeout, manual, security)

        Returns:
            True if terminated successfully
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Mark session as inactive
            result = (
                supabase.table("user_sessions")
                .update(
                    {
                        "is_active": False,
                        "terminated_at": now.isoformat(),
                        "termination_reason": reason,
                    }
                )
                .eq("session_token", session_token)
                .execute()
            )

            if result.data:
                logger.info(f"Session terminated: reason={reason}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error terminating session: {e}")
            return False

    async def terminate_all_user_sessions(
        self, user_id: str, except_session: Optional[str] = None
    ) -> int:
        """
        Terminate all sessions for a user.

        Args:
            user_id: User's UUID
            except_session: Session token to exclude (current session)

        Returns:
            Number of sessions terminated
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Build query
            query = (
                supabase.table("user_sessions")
                .update(
                    {
                        "is_active": False,
                        "terminated_at": now.isoformat(),
                        "termination_reason": "user_logout_all",
                    }
                )
                .eq("user_id", user_id)
                .eq("is_active", True)
            )

            # Exclude current session if specified
            if except_session:
                query = query.neq("session_token", except_session)

            result = query.execute()

            count = len(result.data) if result.data else 0
            logger.info(f"Terminated {count} sessions for user: {user_id[:8]}***")

            return count

        except Exception as e:
            logger.error(f"Error terminating user sessions: {e}")
            return 0

    async def cleanup_expired_sessions(self) -> int:
        """
        Cleanup expired sessions (background task).

        Returns:
            Number of sessions cleaned up
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Find expired sessions
            result = (
                supabase.table("user_sessions")
                .update(
                    {
                        "is_active": False,
                        "terminated_at": now.isoformat(),
                        "termination_reason": "timeout",
                    }
                )
                .eq("is_active", True)
                .lt("expires_at", now.isoformat())
                .execute()
            )

            count = len(result.data) if result.data else 0

            if count > 0:
                logger.info(f"Cleaned up {count} expired sessions")

            return count

        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0


# Singleton instance
_session_service: Optional[SessionService] = None


def get_session_service() -> SessionService:
    """Get or create session service singleton."""
    global _session_service
    if _session_service is None:
        _session_service = SessionService()
    return _session_service
