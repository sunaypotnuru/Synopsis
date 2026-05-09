"""
Netra AI — Twilio SMS Provider
================================
Production-ready SMS dispatch with delivery tracking.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

try:
    from twilio.rest import Client  # type: ignore[import-untyped]
    from twilio.base.exceptions import TwilioRestException  # type: ignore[import-untyped]
except ImportError:
    Client = None  # type: ignore[assignment, misc]
    TwilioRestException = Exception  # type: ignore[assignment, misc]

try:
    from app.core.config import settings  # type: ignore[import-untyped]
except ImportError:
    settings = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class TwilioProvider:
    """Handles SMS dispatch via Twilio API."""

    def __init__(self) -> None:
        self.account_sid: str = (
            getattr(settings, "TWILIO_ACCOUNT_SID", "") if settings else ""
        )
        self.auth_token: str = (
            getattr(settings, "TWILIO_AUTH_TOKEN", "") if settings else ""
        )
        self.from_number: str = (
            getattr(settings, "TWILIO_PHONE_NUMBER", "") if settings else ""
        )
        self.client: Any = None

        if Client and self.account_sid and not self.account_sid.startswith("AC_mock"):
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio provider initialized.")
            except Exception as e:
                logger.error("Failed to initialize Twilio: %s", e)

    async def send_sms(self, to_number: str, message: str) -> Dict[str, Any]:
        """Send SMS via Twilio. Returns result dict with success flag."""
        if not self.client:
            logger.info("📱 [Mock SMS] → %s: %s", to_number, message[:80])
            return {"success": False, "mock": True}

        try:
            # Ensure country code prefix
            phone = to_number if to_number.startswith("+") else f"+{to_number}"

            msg_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=phone,
            )
            return {
                "success": True,
                "provider": "twilio",
                "message_id": msg_obj.sid,
                "status": msg_obj.status,
            }
        except Exception as e:
            err_msg = str(e)
            logger.error("Twilio error: %s", err_msg)
            return {"success": False, "error": err_msg}
