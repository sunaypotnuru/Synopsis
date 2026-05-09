"""
Netra AI — SendGrid Email Provider
===================================
Production-ready email dispatch with delivery tracking.
"""

from __future__ import annotations
import logging
from typing import Any, Dict, Optional

try:
    from sendgrid import SendGridAPIClient  # type: ignore[import-untyped]
    from sendgrid.helpers.mail import Mail, Email, To, Content  # type: ignore[import-untyped]
except ImportError:
    SendGridAPIClient = None  # type: ignore[assignment, misc]
    Mail = None  # type: ignore[assignment]

try:
    from app.core.config import settings  # type: ignore[import-untyped]
except ImportError:
    settings = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class SendGridProvider:
    """Handles email dispatch via SendGrid API."""

    def __init__(self) -> None:
        self.api_key: str = (
            getattr(settings, "SENDGRID_API_KEY", "") if settings else ""
        )
        self.from_email: str = (
            getattr(settings, "SENDGRID_FROM_EMAIL", "noreply@netra-ai.com")
            if settings
            else "noreply@netra-ai.com"
        )
        self.from_name: str = (
            getattr(settings, "SENDGRID_FROM_NAME", "Netra AI")
            if settings
            else "Netra AI"
        )
        self.client: Any = None

        if (
            SendGridAPIClient
            and self.api_key
            and not self.api_key.startswith("SG_mock")
        ):
            try:
                self.client = SendGridAPIClient(self.api_key)
                logger.info("SendGrid provider initialized.")
            except Exception as e:
                logger.error("Failed to initialize SendGrid: %s", e)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send email via SendGrid. Returns result dict with success flag."""
        if not self.client or not Mail:
            logger.info("📧 [Mock Email] → %s | Subject: %s", to_email, subject)
            return {"success": False, "mock": True}

        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            if text_content:
                message.add_content(Content("text/plain", text_content))

            response = self.client.send(message)
            msg_id = ""
            if hasattr(response, "headers"):
                msg_id = response.headers.get("X-Message-Id", "")

            return {
                "success": True,
                "provider": "sendgrid",
                "message_id": msg_id,
                "status_code": getattr(response, "status_code", 0),
            }
        except Exception as e:
            logger.error("SendGrid error: %s", e)
            return {"success": False, "error": str(e)}
