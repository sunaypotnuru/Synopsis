"""
Background task scheduler for appointment reminders.

Uses APScheduler to send reminders at optimal times:
- 24 hours before: Email + SMS
- 1 hour before: SMS only

Runs every 5 minutes to check for appointments needing reminders.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.supabase import supabase
from app.services.reminder_service import get_reminder_service

logger = logging.getLogger(__name__)

# Scheduler instance
scheduler: AsyncIOScheduler = None


async def check_and_send_24h_reminders():
    """
    Check for appointments 24 hours away and send reminders.

    Runs every 5 minutes.
    Sends reminder if appointment is between 23h45m and 24h15m away.
    """
    try:
        now = datetime.now(ZoneInfo("UTC"))

        # Calculate time window (24 hours ± 15 minutes)
        target_start = now + timedelta(hours=23, minutes=45)
        target_end = now + timedelta(hours=24, minutes=15)

        # Query appointments in this window
        result = (
            supabase.table("appointments")
            .select("id, scheduled_at, reminder_24h_sent")
            .in_("status", ["booked", "scheduled", "confirmed"])
            .gte("scheduled_at", target_start.isoformat())
            .lte("scheduled_at", target_end.isoformat())
            .is_("reminder_24h_sent", "null")  # Not yet sent
            .execute()
        )

        appointments = result.data or []

        if not appointments:
            logger.debug("No appointments need 24h reminders")
            return

        logger.info(f"Sending 24h reminders for {len(appointments)} appointments")

        # Send reminders
        reminder_service = get_reminder_service()

        for appt in appointments:
            try:
                # Send reminder
                status = await reminder_service.send_24h_reminder(appt["id"])

                # Mark as sent
                supabase.table("appointments").update(
                    {"reminder_24h_sent": True, "reminder_24h_sent_at": now.isoformat()}
                ).eq("id", appt["id"]).execute()

                logger.info(
                    f"24h reminder sent: id={appt['id']}, "
                    f"email={status['email']}, sms={status['sms']}"
                )

            except Exception as e:
                logger.error(f"Failed to send 24h reminder for {appt['id']}: {e}")

    except Exception as e:
        logger.error(f"Error in 24h reminder task: {e}")


async def check_and_send_1h_reminders():
    """
    Check for appointments 1 hour away and send SMS reminders.

    Runs every 5 minutes.
    Sends reminder if appointment is between 45m and 1h15m away.
    """
    try:
        now = datetime.now(ZoneInfo("UTC"))

        # Calculate time window (1 hour ± 15 minutes)
        target_start = now + timedelta(minutes=45)
        target_end = now + timedelta(hours=1, minutes=15)

        # Query appointments in this window
        result = (
            supabase.table("appointments")
            .select("id, scheduled_at, reminder_1h_sent")
            .in_("status", ["booked", "scheduled", "confirmed"])
            .gte("scheduled_at", target_start.isoformat())
            .lte("scheduled_at", target_end.isoformat())
            .is_("reminder_1h_sent", "null")  # Not yet sent
            .execute()
        )

        appointments = result.data or []

        if not appointments:
            logger.debug("No appointments need 1h reminders")
            return

        logger.info(f"Sending 1h reminders for {len(appointments)} appointments")

        # Send reminders
        reminder_service = get_reminder_service()

        for appt in appointments:
            try:
                # Send reminder
                status = await reminder_service.send_1h_reminder(appt["id"])

                # Mark as sent
                supabase.table("appointments").update(
                    {"reminder_1h_sent": True, "reminder_1h_sent_at": now.isoformat()}
                ).eq("id", appt["id"]).execute()

                logger.info(f"1h reminder sent: id={appt['id']}, sms={status['sms']}")

            except Exception as e:
                logger.error(f"Failed to send 1h reminder for {appt['id']}: {e}")

    except Exception as e:
        logger.error(f"Error in 1h reminder task: {e}")


def start_reminder_scheduler():
    """
    Start the reminder scheduler.

    Schedules two tasks:
    1. 24h reminders - runs every 5 minutes
    2. 1h reminders - runs every 5 minutes
    """
    global scheduler

    if scheduler is not None:
        logger.warning("Reminder scheduler already running")
        return

    try:
        scheduler = AsyncIOScheduler()

        # Add 24h reminder task (every 5 minutes)
        scheduler.add_job(
            check_and_send_24h_reminders,
            trigger=IntervalTrigger(minutes=5),
            id="24h_reminders",
            name="Send 24-hour appointment reminders",
            replace_existing=True,
        )

        # Add 1h reminder task (every 5 minutes)
        scheduler.add_job(
            check_and_send_1h_reminders,
            trigger=IntervalTrigger(minutes=5),
            id="1h_reminders",
            name="Send 1-hour appointment reminders",
            replace_existing=True,
        )

        scheduler.start()
        logger.info("Reminder scheduler started successfully")

    except Exception as e:
        logger.error(f"Failed to start reminder scheduler: {e}")
        scheduler = None


def stop_reminder_scheduler():
    """Stop the reminder scheduler."""
    global scheduler

    if scheduler is None:
        return

    try:
        scheduler.shutdown(wait=False)
        scheduler = None
        logger.info("Reminder scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping reminder scheduler: {e}")


def get_scheduler_status() -> Dict[str, Any]:
    """
    Get scheduler status.

    Returns:
        Dict with running status and job info
    """
    if scheduler is None:
        return {"running": False, "jobs": []}

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append(
            {
                "id": job.id,
                "name": job.name,
                "next_run": (
                    job.next_run_time.isoformat() if job.next_run_time else None
                ),
            }
        )

    return {"running": scheduler.running, "jobs": jobs}
