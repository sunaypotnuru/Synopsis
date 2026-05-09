"""
Netra AI — Unified Notification Service
=========================================
Orchestrates multi-channel notification dispatch (Email + SMS + In-App)
with delivery tracking and deduplication.
"""

from __future__ import annotations
import logging
from typing import Any, Dict, Optional

from app.services.email_provider import SendGridProvider  # type: ignore[import-untyped]
from app.services.sms_provider import TwilioProvider  # type: ignore[import-untyped]

try:
    from app.services.supabase import supabase  # type: ignore[import-untyped]
except ImportError:
    supabase = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class NotificationService:
    """High-level notification dispatcher supporting email, sms, or both channels."""

    def __init__(self) -> None:
        self.email_provider = SendGridProvider()
        self.sms_provider = TwilioProvider()

    async def send_notification(
        self,
        user_id: str,
        channel: str,  # 'email', 'sms', or 'both'
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        notification_type: str = "system",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send notification via specified channel.
        Stores delivery status in notifications table.

        Returns dict with notification_id and per-channel results.
        """
        if not supabase:
            logger.warning("Supabase not available — skipping notification.")
            return {"success": False, "error": "supabase_unavailable"}

        # ── Get user contact info & preferences ─────────────
        user_res = (
            supabase.table("profiles_patient")
            .select("email, phone, full_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        user_data: Dict[str, Any] = (
            user_res.data if isinstance(user_res.data, dict) else {}
        )

        email: Optional[str] = user_data.get("email")
        phone: Optional[str] = user_data.get("phone")

        # Fetch notification preferences
        pref_res = (
            supabase.table("notification_preferences")
            .select("email_enabled, sms_enabled")
            .eq("user_id", user_id)
            .execute()
        )
        prefs: Dict[str, Any] = (
            pref_res.data[0]
            if pref_res.data and len(pref_res.data) > 0
            else {"email_enabled": True, "sms_enabled": False}
        )

        wants_email: bool = prefs.get("email_enabled", True)
        wants_sms: bool = prefs.get("sms_enabled", False)

        # Ensure we only send if the channel is requested AND the user has it enabled globally
        send_email: bool = bool(email) and wants_email and channel in ("email", "both")
        send_sms: bool = bool(phone) and wants_sms and channel in ("sms", "both")

        # ── Insert notification record (pending) ────────────
        notification_data: Dict[str, Any] = {
            "user_id": user_id,
            "type": notification_type,
            "title": subject,
            "message": body,
            "channel": channel,
            "email_status": "pending" if send_email else None,
            "sms_status": "pending" if send_sms else None,
            "data": metadata or {},
        }

        try:
            insert_res = (
                supabase.table("notifications").insert(notification_data).execute()
            )
            notification_id: str = insert_res.data[0]["id"] if insert_res.data else ""
        except Exception as e:
            logger.error("Failed to insert notification record: %s", e)
            notification_id = ""

        results: Dict[str, Any] = {}

        # ── Send Email ──────────────────────────────────────
        if send_email and email:
            email_result = await self.email_provider.send_email(
                to_email=email,
                subject=subject,
                html_content=html_body or body,
            )
            results["email"] = email_result
            if notification_id:
                try:
                    supabase.table("notifications").update(
                        {
                            "email_status": (
                                "sent" if email_result.get("success") else "failed"
                            ),
                            "provider_message_id": email_result.get("message_id", ""),
                            "error_message": (
                                email_result.get("error")
                                if not email_result.get("success")
                                else None
                            ),
                        }
                    ).eq("id", notification_id).execute()
                except Exception as e:
                    logger.error("Failed to update email status: %s", e)
        elif channel in ("email", "both") and not wants_email:
            logger.info(
                "Skipping email for user %s: email_enabled=False in preferences",
                user_id,
            )

        # ── Send SMS ────────────────────────────────────────
        if send_sms and phone:
            sms_result = await self.sms_provider.send_sms(
                to_number=phone,
                message=body,
            )
            results["sms"] = sms_result
            if notification_id:
                try:
                    supabase.table("notifications").update(
                        {
                            "sms_status": (
                                "sent" if sms_result.get("success") else "failed"
                            ),
                            "provider_message_id": sms_result.get("message_id", ""),
                            "error_message": (
                                sms_result.get("error")
                                if not sms_result.get("success")
                                else None
                            ),
                        }
                    ).eq("id", notification_id).execute()
                except Exception as e:
                    logger.error("Failed to update SMS status: %s", e)
        elif channel in ("sms", "both") and not wants_sms:
            logger.info(
                "Skipping SMS for user %s: sms_enabled=False in preferences", user_id
            )

        return {
            "notification_id": notification_id,
            "results": results,
        }
