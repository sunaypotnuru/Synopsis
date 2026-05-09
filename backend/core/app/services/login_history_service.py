"""
Login History Tracking Service (HIPAA Compliant).

Features:
- Record all login attempts (success + failure)
- Track IP address, user agent, device info
- 6-year retention (HIPAA requirement)
- Audit trail for compliance

Based on 2026 HIPAA audit trail requirements:
- Log all access to ePHI
- 6-year retention minimum
- Track who, when, what, from where

References:
- https://www.ofashandfire.com/blog/hipaa-compliant-audit-trails-healthcare-software
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from zoneinfo import ZoneInfo

from app.services.supabase import supabase

# Try to import user_agents, fallback to basic parsing
try:
    from user_agents import parse as parse_ua

    HAS_USER_AGENTS = True
except ImportError:
    HAS_USER_AGENTS = False

logger = logging.getLogger(__name__)

DEFAULT_TIMEZONE = "UTC"


class LoginHistoryService:
    """
    Login history tracking service.

    HIPAA Compliance:
    - Records all login attempts
    - 6-year retention
    - Audit trail
    """

    async def record_login_attempt(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record a login attempt.

        Args:
            user_id: User's UUID
            email: User's email
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether login was successful
            failure_reason: Reason for failure (if applicable)
            session_id: Session ID (if successful)

        Returns:
            Login history record
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))

            # Parse user agent
            device_info = self._parse_user_agent(user_agent)

            # Create login record
            login_data = {
                "user_id": user_id,
                "email": email,
                "login_at": now.isoformat(),
                "ip_address": ip_address,
                "user_agent": user_agent,
                "device_type": device_info["device_type"],
                "browser": device_info["browser"],
                "os": device_info["os"],
                "success": success,
                "failure_reason": failure_reason,
                "session_id": session_id,
                "created_at": now.isoformat(),
            }

            # Store in database
            result = supabase.table("login_history").insert(login_data).execute()

            if result.data:
                logger.info(
                    f"Login attempt recorded: user={email}, "
                    f"success={success}, ip={ip_address}"
                )
                return result.data[0]

            return login_data

        except Exception as e:
            logger.error(f"Error recording login attempt: {e}")
            # Don't fail login on history recording error
            return {}

    def _parse_user_agent(self, user_agent: str) -> Dict[str, str]:
        """
        Parse user agent string.

        Args:
            user_agent: User agent string

        Returns:
            Dict with device_type, browser, os
        """
        try:
            if not HAS_USER_AGENTS:
                # Fallback to basic parsing
                return self._basic_parse_user_agent(user_agent)

            ua = parse_ua(user_agent)

            # Determine device type
            if ua.is_mobile:
                device_type = "mobile"
            elif ua.is_tablet:
                device_type = "tablet"
            elif ua.is_pc:
                device_type = "desktop"
            else:
                device_type = "unknown"

            # Get browser info
            browser = (
                f"{ua.browser.family} {ua.browser.version_string}"
                if ua.browser.family
                else "Unknown"
            )

            # Get OS info
            os = f"{ua.os.family} {ua.os.version_string}" if ua.os.family else "Unknown"

            return {
                "device_type": device_type,
                "browser": browser[:100],  # Limit length
                "os": os[:100],  # Limit length
            }

        except Exception as e:
            logger.warning(f"Error parsing user agent: {e}")
            return self._basic_parse_user_agent(user_agent)

    def _basic_parse_user_agent(self, user_agent: str) -> Dict[str, str]:
        """Basic user agent parsing fallback."""
        ua_lower = user_agent.lower()

        # Detect device type
        if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
            device_type = "mobile"
        elif "tablet" in ua_lower or "ipad" in ua_lower:
            device_type = "tablet"
        else:
            device_type = "desktop"

        # Detect browser
        if "chrome" in ua_lower:
            browser = "Chrome"
        elif "firefox" in ua_lower:
            browser = "Firefox"
        elif "safari" in ua_lower:
            browser = "Safari"
        elif "edge" in ua_lower:
            browser = "Edge"
        else:
            browser = "Unknown"

        # Detect OS
        if "windows" in ua_lower:
            os = "Windows"
        elif "mac" in ua_lower:
            os = "macOS"
        elif "linux" in ua_lower:
            os = "Linux"
        elif "android" in ua_lower:
            os = "Android"
        elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
            os = "iOS"
        else:
            os = "Unknown"

        return {"device_type": device_type, "browser": browser, "os": os}

    async def get_user_login_history(
        self, user_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get login history for a user.

        Args:
            user_id: User's UUID
            limit: Maximum number of records to return

        Returns:
            List of login history records
        """
        try:
            result = (
                supabase.table("login_history")
                .select("*")
                .eq("user_id", user_id)
                .order("login_at", desc=True)
                .limit(limit)
                .execute()
            )

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting login history: {e}")
            return []

    async def get_recent_logins(
        self, user_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent successful logins for a user.

        Args:
            user_id: User's UUID
            limit: Maximum number of records to return

        Returns:
            List of recent login records
        """
        try:
            result = (
                supabase.table("login_history")
                .select("login_at, ip_address, device_type, browser, os")
                .eq("user_id", user_id)
                .eq("success", True)
                .order("login_at", desc=True)
                .limit(limit)
                .execute()
            )

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting recent logins: {e}")
            return []

    async def get_failed_login_attempts(self, user_id: str, hours: int = 24) -> int:
        """
        Get count of failed login attempts in last N hours.

        Args:
            user_id: User's UUID
            hours: Number of hours to look back

        Returns:
            Count of failed attempts
        """
        try:
            now = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
            since = now - timedelta(hours=hours)

            result = (
                supabase.table("login_history")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .eq("success", False)
                .gte("login_at", since.isoformat())
                .execute()
            )

            return result.count or 0

        except Exception as e:
            logger.error(f"Error getting failed login attempts: {e}")
            return 0

    async def detect_suspicious_activity(self, user_id: str) -> Dict[str, Any]:
        """
        Detect suspicious login activity.

        Args:
            user_id: User's UUID

        Returns:
            Dict with suspicious activity indicators
        """
        try:
            # Get recent logins
            recent = await self.get_recent_logins(user_id, limit=10)

            if not recent:
                return {"suspicious": False}

            # Check for multiple IPs
            ips = set(
                login.get("ip_address") for login in recent if login.get("ip_address")
            )
            multiple_ips = len(ips) > 3

            # Check for multiple device types
            devices = set(
                login.get("device_type") for login in recent if login.get("device_type")
            )
            multiple_devices = len(devices) > 2

            # Get failed attempts
            failed_count = await self.get_failed_login_attempts(user_id, hours=24)
            high_failure_rate = failed_count > 5

            suspicious = multiple_ips or multiple_devices or high_failure_rate

            return {
                "suspicious": suspicious,
                "multiple_ips": multiple_ips,
                "ip_count": len(ips),
                "multiple_devices": multiple_devices,
                "device_count": len(devices),
                "failed_attempts_24h": failed_count,
                "high_failure_rate": high_failure_rate,
            }

        except Exception as e:
            logger.error(f"Error detecting suspicious activity: {e}")
            return {"suspicious": False, "error": str(e)}


# Singleton instance
_login_history_service: Optional[LoginHistoryService] = None


def get_login_history_service() -> LoginHistoryService:
    """Get or create login history service singleton."""
    global _login_history_service
    if _login_history_service is None:
        _login_history_service = LoginHistoryService()
    return _login_history_service
