"""
Netra AI — Notification Scheduler & Dispatch Engine
====================================================
Handles automated appointment reminders, medication alerts,
and follow-up messages via SMS (Twilio) + Email (SendGrid) + In-App.
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# ── Third-party imports (installed in container/venv) ───────
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]
except ImportError:
    AsyncIOScheduler = None  # type: ignore[assignment, misc]

try:
    from twilio.rest import Client as TwilioClient  # type: ignore[import-untyped]
    from twilio.base.exceptions import TwilioRestException  # type: ignore[import-untyped]
except ImportError:
    TwilioClient = None  # type: ignore[assignment, misc]
    TwilioRestException = Exception  # type: ignore[assignment, misc]

try:
    from sendgrid import SendGridAPIClient  # type: ignore[import-untyped]
    from sendgrid.helpers.mail import Mail, Email, To, Content  # type: ignore[import-untyped]
except ImportError:
    SendGridAPIClient = None  # type: ignore[assignment, misc]
    Mail = None  # type: ignore[assignment]

try:
    from app.services.supabase import supabase  # type: ignore[import-untyped]
    from app.core.config import settings  # type: ignore[import-untyped]
except ImportError:
    supabase = None  # type: ignore[assignment]
    settings = None  # type: ignore[assignment]

import os

try:
    from app.utils.twilio_client import initiate_voice_call  # type: ignore[import-untyped, misc]
except ImportError:
    initiate_voice_call = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

# ============================================================
# Scheduler instance
# ============================================================
scheduler: Any = AsyncIOScheduler() if AsyncIOScheduler else None

# ============================================================
# Singleton clients (lazy-init on first real call)
# ============================================================
_twilio_client: Any = None
_sendgrid_client: Any = None


def _get_twilio() -> Any:
    """Return a cached Twilio client, or None if not configured."""
    global _twilio_client
    if (
        _twilio_client is None
        and TwilioClient is not None
        and settings
        and getattr(settings, "TWILIO_ACCOUNT_SID", "") != ""
        and not getattr(settings, "TWILIO_ACCOUNT_SID", "").startswith("AC_mock")
    ):
        _twilio_client = TwilioClient(
            settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
        )
        logger.info("Twilio client initialized successfully.")
    return _twilio_client


def _get_sendgrid() -> Any:
    """Return a cached SendGrid client, or None if not configured."""
    global _sendgrid_client
    if (
        _sendgrid_client is None
        and SendGridAPIClient is not None
        and settings
        and getattr(settings, "SENDGRID_API_KEY", "") != ""
        and not getattr(settings, "SENDGRID_API_KEY", "").startswith("SG_mock")
    ):
        _sendgrid_client = SendGridAPIClient(settings.SENDGRID_API_KEY)
        logger.info("SendGrid client initialized successfully.")
    return _sendgrid_client


# ============================================================
# Core helper: fetch templates by trigger event
# ============================================================
async def fetch_templates(trigger_event: str) -> List[Dict[str, Any]]:
    """Fetch active follow-up templates for a given trigger event."""
    if not supabase:
        return []
    res = (
        supabase.table("follow_up_templates")
        .select("*")
        .eq("trigger_event", trigger_event)
        .eq("is_active", True)
        .execute()
    )
    return list(res.data) if res.data else []


# ============================================================
# Send SMS via Twilio
# ============================================================
async def _send_sms(to_phone: Optional[str], body: str) -> Dict[str, Any]:
    """Dispatch an SMS via Twilio. Falls back to mock logging if unconfigured."""
    client = _get_twilio()
    if client and to_phone:
        try:
            # Ensure phone has country code
            phone = to_phone if to_phone.startswith("+") else f"+{to_phone}"
            msg = client.messages.create(
                body=body,
                from_=getattr(settings, "TWILIO_PHONE_NUMBER", ""),
                to=phone,
            )
            logger.info("✅ Twilio SMS sent. SID: %s → %s", msg.sid, phone)
            return {"success": True, "provider": "twilio", "message_id": msg.sid}
        except Exception as e:
            logger.error("❌ Twilio SMS failed to %s: %s", to_phone, e)
            return {"success": False, "error": str(e)}
    else:
        # Avoid Pyright indexing complaints
        body_s = str(body) if body else ""
        truncated = body_s[:80] + "..." if len(body_s) > 80 else body_s
        logger.info("📱 [Mock SMS] → %s: %s", to_phone or "N/A", truncated)
        return {"success": False, "mock": True}


# ============================================================
# Send Email via SendGrid
# ============================================================
async def _send_email(
    to_email: Optional[str], subject: str, body: str
) -> Dict[str, Any]:
    """Dispatch an email via SendGrid. Falls back to mock logging if unconfigured."""
    client = _get_sendgrid()
    if client and Mail and to_email:
        try:
            message = Mail(
                from_email=Email(
                    getattr(settings, "SENDGRID_FROM_EMAIL", "test@test.com"),
                    getattr(settings, "SENDGRID_FROM_NAME", "Netra"),
                ),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", _build_html_email(subject, body)),
            )
            response = client.send(message)
            msg_id = ""
            if hasattr(response, "headers"):
                msg_id = response.headers.get("X-Message-Id", "")
            logger.info(
                "✅ SendGrid email sent to %s. Status: %s",
                to_email,
                getattr(response, "status_code", "?"),
            )
            return {
                "success": True,
                "provider": "sendgrid",
                "message_id": msg_id,
                "status_code": getattr(response, "status_code", 0),
            }
        except Exception as e:
            logger.error("❌ SendGrid email failed to %s: %s", to_email, e)
            return {"success": False, "error": str(e)}
    else:
        logger.info("📧 [Mock Email] → %s | Subject: %s", to_email or "N/A", subject)
        return {"success": False, "mock": True}


def _build_html_email(subject: str, body: str) -> str:
    """Generates a clean, branded HTML email template."""
    year = datetime.now().year
    safe_body = body.replace("\n", "<br>") if body else ""
    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
        <div style="background: linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">🩺 Netra AI</h1>
            <p style="color: rgba(255, 255, 255, 0.85); margin: 8px 0 0; font-size: 14px;">AI-Powered Healthcare Platform</p>
        </div>
        <div style="background: white; padding: 32px 24px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 20px;">{subject}</h2>
            <div style="color: #334155; font-size: 15px; line-height: 1.7;">{safe_body}</div>
        </div>
        <div style="background: #f1f5f9; padding: 20px 24px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: 0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This is an automated message from Netra AI. Please do not reply directly.<br>
                &copy; {year} Netra AI Healthcare Platform
            </p>
        </div>
    </div>
    """


# ============================================================
# Main dispatch: sends SMS + Email + In-App for a template match
# ============================================================
async def send_reminder_or_followup(
    appointment: Dict[str, Any], template: Dict[str, Any]
) -> None:
    """Sends notification matching template structure via SMS + Email + In-App."""
    if not supabase:
        return

    patient_id: str = appointment.get("patient_id", "")
    doctor_id: str = appointment.get("doctor_id", "")

    # Fetch patient / doctor basics including contact info
    patient_res = (
        supabase.table("profiles_patient")
        .select("full_name, email, phone")
        .eq("id", patient_id)
        .single()
        .execute()
    )
    doctor_res = (
        supabase.table("profiles_doctor")
        .select("full_name, specialty")
        .eq("id", doctor_id)
        .single()
        .execute()
    )

    p_data: Dict[str, Any] = (
        patient_res.data if isinstance(patient_res.data, dict) else {}
    )
    d_data: Dict[str, Any] = (
        doctor_res.data if isinstance(doctor_res.data, dict) else {}
    )

    p_name: str = p_data.get("full_name") or "Patient"
    d_name: str = d_data.get("full_name") or "Doctor"
    p_email: Optional[str] = p_data.get("email")
    p_phone: Optional[str] = p_data.get("phone")

    # Fetch notification preferences
    pref_res = (
        supabase.table("notification_preferences")
        .select("email_enabled, sms_enabled")
        .eq("user_id", patient_id)
        .execute()
    )
    prefs: Dict[str, Any] = (
        pref_res.data[0]
        if pref_res.data and len(pref_res.data) > 0
        else {"email_enabled": True, "sms_enabled": False}
    )

    send_email: bool = bool(p_email) and prefs.get("email_enabled", True)
    send_sms: bool = bool(p_phone) and prefs.get("sms_enabled", False)

    # Replace placeholders in template body & subject
    body: str = (
        template.get("body", "")
        .replace("{{patient_name}}", p_name)
        .replace("{{doctor_name}}", d_name)
    )
    subject: str = (
        template.get("subject", "Notification")
        .replace("{{patient_name}}", p_name)
        .replace("{{doctor_name}}", d_name)
    )

    # ── 1) Store in-app notification ────────────────────────
    try:
        supabase.table("notifications").insert(
            {
                "user_id": patient_id,
                "type": template.get("trigger_event", "system"),
                "title": subject,
                "message": body,
                "data": {
                    "appointment_id": appointment.get("id"),
                    "template_id": template.get("id"),
                },
            }
        ).execute()
        logger.info("💾 In-app notification stored for patient %s", patient_id)
    except Exception as e:
        logger.error("Failed to store in-app notification: %s", e)

    # ── 2) Send SMS via Twilio ──────────────────────────────
    if send_sms:
        sms_body: str = f"NetraAI — {subject}: {body}"
        await _send_sms(p_phone, sms_body)
    else:
        logger.info("Skipping SMS for %s: opted out", patient_id)

    # ── 3) Send Email via SendGrid ──────────────────────────
    if send_email:
        await _send_email(p_email, f"Netra AI — {subject}", body)
    else:
        logger.info("Skipping Email for %s: opted out", patient_id)


# ============================================================
# Scheduled job: process upcoming & completed appointments
# ============================================================
async def process_appointments() -> None:
    """Timer loop run every 15 minutes by APScheduler."""
    if not supabase:
        return
    logger.info("⏰ Running scheduled appointment check...")
    now = datetime.utcnow()

    # ── Check Upcoming Appointments ─────────────────────────
    in_24h = now + timedelta(hours=24)
    upcoming_templates: List[Dict[str, Any]] = await fetch_templates(
        "upcoming_appointment"
    )
    if upcoming_templates:
        appts_res = (
            supabase.table("appointments")
            .select("*")
            .in_("status", ["scheduled", "confirmed"])
            .gte("scheduled_at", now.isoformat())
            .lte("scheduled_at", in_24h.isoformat())
            .execute()
        )
        appts_list: List[Dict[str, Any]] = (
            list(appts_res.data) if appts_res.data else []
        )
        for apt in appts_list:
            scheduled_str: str = apt.get("scheduled_at", "")
            apt_time = datetime.fromisoformat(scheduled_str.replace("Z", "+00:00"))
            delta = apt_time - (now.astimezone() if apt_time.tzinfo else now)
            mins_away: float = delta.total_seconds() / 60

            for tpl in upcoming_templates:
                trigger_mins: int = tpl.get("delay_minutes", 1440)
                if trigger_mins - 15 <= mins_away <= trigger_mins + 15:
                    # Check if already sent (dedup)
                    exist = (
                        supabase.table("notifications")
                        .select("id")
                        .eq("user_id", apt.get("patient_id"))
                        .eq("type", tpl.get("trigger_event"))
                        .contains(
                            "data",
                            {
                                "appointment_id": apt.get("id"),
                                "template_id": tpl.get("id"),
                            },
                        )
                        .execute()
                    )
                    if not exist.data:
                        await send_reminder_or_followup(apt, tpl)

    # ── Check Completed Appointments (follow-ups) ───────────
    past_48h = now - timedelta(hours=48)
    completed_templates: List[Dict[str, Any]] = await fetch_templates(
        "appointment_completed"
    )
    if completed_templates:
        appts_res = (
            supabase.table("appointments")
            .select("*")
            .eq("status", "completed")
            .gte("scheduled_at", past_48h.isoformat())
            .lte("scheduled_at", now.isoformat())
            .execute()
        )
        completed_list: List[Dict[str, Any]] = (
            list(appts_res.data) if appts_res.data else []
        )
        for apt in completed_list:
            scheduled_str = apt.get("scheduled_at", "")
            apt_time = datetime.fromisoformat(scheduled_str.replace("Z", "+00:00"))
            delta = (now.astimezone() if apt_time.tzinfo else now) - apt_time
            mins_past: float = delta.total_seconds() / 60
            for tpl in completed_templates:
                trigger_mins = tpl.get("delay_minutes", 60)
                if trigger_mins <= mins_past <= trigger_mins + 30:
                    exist = (
                        supabase.table("notifications")
                        .select("id")
                        .eq("user_id", apt.get("patient_id"))
                        .eq("type", tpl.get("trigger_event"))
                        .contains(
                            "data",
                            {
                                "appointment_id": apt.get("id"),
                                "template_id": tpl.get("id"),
                            },
                        )
                        .execute()
                    )
                    if not exist.data:
                        await send_reminder_or_followup(apt, tpl)


# ============================================================
# Scheduled job: medication reminders
# ============================================================
async def process_medication_reminders() -> None:
    """Check and send medication reminders based on time_slots."""
    if not supabase:
        return
    logger.info("💊 Running medication reminder check...")

    try:
        res = supabase.table("medications").select("*").eq("is_active", True).execute()
        medications: List[Dict[str, Any]] = list(res.data) if res.data else []
        now = datetime.now()

        for med in medications:
            time_slots: List[str] = med.get("time_slots", [])
            patient_id: str = med.get("patient_id", "")

            for slot in time_slots:
                if not slot:
                    continue
                try:
                    parts = slot.split(":")
                    slot_hour, slot_min = int(parts[0]), int(parts[1])
                    time_diff = abs(
                        (slot_hour * 60 + slot_min) - (now.hour * 60 + now.minute)
                    )

                    if time_diff <= 5:
                        today_start = now.replace(
                            hour=0, minute=0, second=0, microsecond=0
                        ).isoformat()
                        existing = (
                            supabase.table("notifications")
                            .select("id")
                            .eq("user_id", patient_id)
                            .eq("type", "medication_reminder")
                            .gte("created_at", today_start)
                            .contains(
                                "data",
                                {"medication_id": med.get("id"), "time_slot": slot},
                            )
                            .execute()
                        )
                        if not existing.data:
                            await send_medication_reminder(med, slot)
                except Exception as slot_err:
                    logger.error("Error processing time slot %s: %s", slot, slot_err)

    except Exception as e:
        logger.error("Medication reminder processing error: %s", e)


async def send_medication_reminder(medication: Dict[str, Any], time_slot: str) -> None:
    """Send SMS + Email + in-app notification for medication reminder."""
    if not supabase:
        return
    patient_id: str = medication.get("patient_id", "")
    med_name: str = medication.get("name", "Medication")
    dosage: str = medication.get("dosage", "")

    try:
        patient_res = (
            supabase.table("profiles_patient")
            .select("full_name, phone, email")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        p_data: Dict[str, Any] = (
            patient_res.data if isinstance(patient_res.data, dict) else {}
        )
        patient_name: str = p_data.get("full_name", "Patient")
        patient_phone: Optional[str] = p_data.get("phone")
        patient_email: Optional[str] = p_data.get("email")

        # Fetch notification preferences
        pref_res = (
            supabase.table("notification_preferences")
            .select("email_enabled, sms_enabled")
            .eq("user_id", patient_id)
            .execute()
        )
        prefs: Dict[str, Any] = (
            pref_res.data[0]
            if pref_res.data and len(pref_res.data) > 0
            else {"email_enabled": True, "sms_enabled": False}
        )

        send_email: bool = bool(patient_email) and prefs.get("email_enabled", True)
        send_sms: bool = bool(patient_phone) and prefs.get("sms_enabled", False)

        message = f"⏰ Medication Reminder: Time to take {med_name} {dosage}"

        # ── In-app notification ─────────────────────────────
        supabase.table("notifications").insert(
            {
                "user_id": patient_id,
                "type": "medication_reminder",
                "title": "Medication Reminder",
                "message": message,
                "data": {
                    "medication_id": medication.get("id"),
                    "time_slot": time_slot,
                    "medication_name": med_name,
                    "dosage": dosage,
                },
            }
        ).execute()

        # ── SMS via Twilio ──────────────────────────────────
        if send_sms:
            sms_body = f"NetraAI Reminder: {patient_name}, it's time to take {med_name} {dosage}. Stay healthy! 💊"
            await _send_sms(patient_phone, sms_body)
        else:
            logger.info("Skipping Medication SMS for %s: opted out", patient_id)

        # ── Email via SendGrid ──────────────────────────────
        if send_email:
            email_subject = f"Medication Reminder — {med_name}"
            email_body = (
                f"Hi {patient_name},<br><br>"
                "This is a friendly reminder to take your medication:<br><br>"
                f"<strong>{med_name}</strong> — {dosage}<br><br>"
                "Stay consistent with your treatment for the best results. 💊"
            )
            await _send_email(patient_email, email_subject, email_body)
        else:
            logger.info("Skipping Medication Email for %s: opted out", patient_id)

    except Exception as e:
        logger.error(
            "Failed to send medication reminder for %s: %s", medication.get("id"), e
        )


# ============================================================
# Scheduled job: Autonomous Twilio Outbound Voice Calls
# ============================================================
async def check_medication_calls() -> None:
    """Scan patient profiles for call_preferences and trigger Twilio autonomous voice agent calls."""
    if not supabase:
        return

    logger.info("🤖 Scanning for Autonomous Nurse Outbound Calls...")
    now = datetime.now()
    current_time = now.strftime("%H:%M")
    today = now.strftime("%a")  # e.g., 'Mon', 'Tue'

    try:
        # We need patients who have opted into voice and whose preferred time is roughly now
        res = (
            supabase.table("profiles_patient")
            .select("id, phone, language, call_preferences, medication_schedule")
            .execute()
        )
        patients = list(res.data) if res.data else []

        for p in patients:
            prefs = p.get("call_preferences") or {}

            # 1. Have they opted into Voice?
            if not prefs.get("voice"):
                continue

            # 2. Is it time? (Match HH:MM strictly, assuming APScheduler runs every 1 minute)
            pref_time = prefs.get("time")
            if not pref_time:
                continue

            # Convert both to minutes for a small 5-min grace window
            try:
                p_hr, p_min = map(int, pref_time.split(":"))
                n_hr, n_min = map(int, current_time.split(":"))
                diff = abs((p_hr * 60 + p_min) - (n_hr * 60 + n_min))
            except Exception:
                continue

            meds_today = [
                m
                for m in p.get("medication_schedule", [])
                if today in m.get("days", [])
            ]
            if not meds_today:
                continue

            today_start = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            existing = (
                supabase.table("voice_call_logs")
                .select("*")
                .eq("patient_id", p["id"])
                .eq("purpose", "medication_check")
                .gte("started_at", today_start)
                .order("started_at", desc=True)
                .limit(1)
                .execute()
            )

            if existing.data:
                last_log = existing.data[0]

                # Check if it hit terminal success or max failure
                if last_log.get("final_status") in ["completed", "retry_exhausted"]:
                    continue

                call_status = last_log.get("call_status", "queued")
                if call_status not in ["busy", "no-answer", "failed", "canceled"]:
                    continue  # Still actively queuing, ringing, or completed

                retry_count = last_log.get("retry_count", 0)
                if retry_count >= 3:
                    supabase.table("voice_call_logs").update(
                        {"final_status": "retry_exhausted"}
                    ).eq("id", last_log["id"]).execute()
                    continue

                next_retry = last_log.get("next_retry_at")
                if not next_retry:
                    # Not yet scheduled—queue it 30 mins out.
                    next_dt = now + timedelta(minutes=30)
                    supabase.table("voice_call_logs").update(
                        {"next_retry_at": next_dt.isoformat()}
                    ).eq("id", last_log["id"]).execute()
                    continue

                next_dt = datetime.fromisoformat(next_retry.replace("Z", "+00:00"))
                now_aware = now.astimezone() if next_dt.tzinfo else now
                if now_aware < next_dt:
                    continue  # Wait out the retry bucket clock

                retry_count += 1
            else:
                if diff > 5:
                    continue  # Fresh calls must originate within their 5m grace window
                retry_count = 0
                last_log = None

            # 5. Initiate Call!
            domain = os.getenv("PUBLIC_DOMAIN", "localhost:8000")
            if "localhost" in domain:
                logger.warning(
                    "Using localhost for TwiML URL. Twilio cannot reach this. Ensure PUBLIC_DOMAIN (like ngrok) is set."
                )

            lang = p.get("language", "hi-IN")
            twiml_url = f"https://{domain}/api/v1/voice/twiml/medication-check?patient_id={p['id']}&language={lang}"

            logger.info(
                f"Initiating Autonomous Voice Call for {p['id']} to {p.get('phone')} (Retry: {retry_count})"
            )
            call_sid = initiate_voice_call(p.get("phone"), twiml_url)

            # Log the iteration
            data = {
                "patient_id": p["id"],
                "call_sid": call_sid,
                "purpose": "medication_check",
                "call_status": "queued",
                "started_at": now.isoformat(),
                "retry_count": retry_count,
                "final_status": None,
                "next_retry_at": None,
            }
            if last_log:
                supabase.table("voice_call_logs").update(data).eq(
                    "id", last_log["id"]
                ).execute()
            else:
                res = supabase.table("voice_call_logs").insert(data).execute()

    except Exception as e:
        logger.error(f"Error checking ambient medication calls: {e}")


# ============================================================
# Scheduler bootstrap
# ============================================================
async def start_reminder_task() -> None:
    """Initializes the APScheduler jobs."""
    if scheduler is None:
        logger.warning("APScheduler not available — skipping background task init.")
        return
    scheduler.add_job(process_appointments, "interval", minutes=15)
    scheduler.add_job(process_medication_reminders, "interval", minutes=5)
    scheduler.add_job(check_medication_calls, "interval", minutes=5)
    scheduler.start()
    logger.info(
        "✅ APScheduler background tasks initialized (appointments + autonomous voice + text reminders)."
    )
