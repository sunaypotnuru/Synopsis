"""
Netra AI — Webhook Handlers for Delivery Status
=================================================
Receives delivery callbacks from SendGrid and Twilio to update
notification status in real-time.
"""

from __future__ import annotations
import logging
from typing import Any

from fastapi import APIRouter, Request

try:
    from app.services.supabase import supabase  # type: ignore[import-untyped]
except ImportError:
    supabase = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/sendgrid")
async def sendgrid_webhook(request: Request) -> dict[str, str]:
    """
        Handle SendGrid event webhooks.
        Events: delivered,
    opened, clicked,
    bounced, dropped,
    etc.
        Configure at: https://app.sendgrid.com/settings/mail_settings → Event Webhook
    """
    try:
        events = await request.json()
        if not isinstance(events, list):
            events = [events]

        for event in events:
            raw_id: str = event.get("sg_message_id", "")
            message_id = raw_id.split(".")[0] if raw_id else ""
            event_type: str = event.get("event", "")

            if not message_id or not supabase:
                continue

            if event_type in ("delivered", "open", "click"):
                supabase.table("notifications").update(
                    {
                        "email_status": (
                            event_type if event_type == "delivered" else "opened"
                        ),
                        "delivered_at": event.get("timestamp"),
                    }
                ).eq("provider_message_id", message_id).execute()
                logger.info("SendGrid webhook: %s for %s", event_type, message_id)

            elif event_type in ("bounce", "dropped", "deferred"):
                supabase.table("notifications").update(
                    {
                        "email_status": "failed",
                        "error_message": event.get("reason", event_type),
                    }
                ).eq("provider_message_id", message_id).execute()
                logger.warning(
                    "SendGrid %s for %s: %s",
                    event_type,
                    message_id,
                    event.get("reason", ""),
                )

    except Exception as e:
        logger.error("SendGrid webhook error: %s", e)

    return {"status": "ok"}


@router.post("/twilio/status")
async def twilio_status_callback(request: Request) -> dict[str, str]:
    """
        Handle Twilio SMS status callbacks.
        Statuses: queued,
    sent, delivered,
    undelivered, failed.
        Configure at: Twilio Console → Phone Number → Messaging → Status Callback URL
    """
    try:
        form_data = await request.form()
        message_sid: str = str(form_data.get("MessageSid", ""))
        message_status: str = str(form_data.get("MessageStatus", ""))

        if message_sid and supabase:
            update_data: dict[str, Any] = {"sms_status": message_status}
            if message_status == "delivered":
                update_data["delivered_at"] = str(form_data.get("Timestamp", ""))
            elif message_status in ("failed", "undelivered"):
                update_data["error_message"] = str(
                    form_data.get("ErrorMessage", message_status)
                )

            supabase.table("notifications").update(update_data).eq(
                "provider_message_id", message_sid
            ).execute()
            logger.info("Twilio status: %s for SID %s", message_status, message_sid)

    except Exception as e:
        logger.error("Twilio webhook error: %s", e)

    return {"status": "ok"}
