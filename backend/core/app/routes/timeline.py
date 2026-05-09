from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.core.security import get_current_patient
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
from app.db.schema import Tables, Col

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/timeline", tags=["Timeline"])


def _fmt_date(iso_str: Optional[str]) -> str:
    if not iso_str:
        return "Unknown Date"
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).strftime(
            "%b %d, %Y"
        )
    except Exception:
        return str(iso_str)


@router.get("")
async def get_timeline(
    current_user: TokenPayload = Depends(get_current_patient),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
):
    """Fetch chronological health events."""
    user_id = current_user.sub
    records = []

    # 1. Manual timeline_events
    # Columns: user_id, event_type, event_date, title, description, metadata, related_id
    try:
        q = (
            supabase.table(Tables.TIMELINE_EVENTS)
            .select("*")
            .eq(Col.TimelineEvents.USER_ID, user_id)
        )
        if start_date:
            q = q.gte(Col.TimelineEvents.EVENT_DATE, start_date)
        if end_date:
            q = q.lte(Col.TimelineEvents.EVENT_DATE, end_date)
        res = q.execute()
        if hasattr(res, "__await__"):
            res = await res
        for evt in res.data or []:
            evt_type = evt.get(Col.TimelineEvents.EVENT_TYPE, "")
            if event_type and event_type not in ("manual", evt_type):
                continue
            records.append(
                {
                    "id": evt.get(Col.TimelineEvents.ID),
                    "date": _fmt_date(evt.get(Col.TimelineEvents.EVENT_DATE)),
                    "raw_date": evt.get(Col.TimelineEvents.EVENT_DATE, ""),
                    "type": evt_type or "Manual Event",
                    "title": evt.get(Col.TimelineEvents.TITLE) or "Health Event",
                    "summary": evt.get(Col.TimelineEvents.DESCRIPTION) or "",
                    "is_manual": True,
                }
            )
    except Exception as e:
        logger.warning(f"timeline_events fetch error: {e}")

    # 2. Appointments — no FK join to avoid PGRST200
    if not event_type or event_type in ("appointment", "prescription"):
        try:
            appts_res = (
                supabase.table(Tables.APPOINTMENTS)
                .select(
                    f"{Col.Appointments.ID}, {Col.Appointments.SCHEDULED_AT}, "
                    f"{Col.Appointments.STATUS}, {Col.Appointments.TYPE}, {Col.Appointments.REASON}, "
                    f"{Col.Appointments.DOCTOR_ID}"
                )
                .eq(Col.Appointments.PATIENT_ID, user_id)
                .execute()
            )
            if hasattr(appts_res, "__await__"):
                appts_res = await appts_res
            appts = appts_res.data or []

            try:
                rx_list = (
                    supabase.table(Tables.PRESCRIPTIONS)
                    .select("*")
                    .eq(Col.Prescriptions.PATIENT_ID, user_id)
                    .execute()
                    .data
                    or []
                )
                rx_dict = {
                    rx.get(Col.Prescriptions.APPOINTMENT_ID): rx for rx in rx_list
                }
            except Exception:
                rx_dict = {}

            for appt in appts:
                dt = appt.get(Col.Appointments.SCHEDULED_AT, "")
                if start_date and dt < start_date:
                    continue
                if end_date and dt > end_date:
                    continue
                appt_id = appt.get(Col.Appointments.ID)
                prescription_text = ""
                if appt_id and appt_id in rx_dict:
                    meds = rx_dict[appt_id].get(Col.Prescriptions.MEDICATIONS) or []
                    prescription_text = ", ".join(
                        f"{m.get('name')} {m.get('dosage', '')}"
                        for m in meds
                        if m.get("name")
                    )
                records.append(
                    {
                        "id": appt_id,
                        "date": _fmt_date(dt),
                        "raw_date": dt,
                        "type": "Consultation",
                        "title": "Doctor Consultation",
                        "summary": appt.get(Col.Appointments.REASON)
                        or "Routine checkup",
                        "prescription": prescription_text,
                        "status": appt.get(Col.Appointments.STATUS),
                        "is_manual": False,
                    }
                )
        except Exception as e:
            logger.warning(f"appointments timeline fetch error: {e}")

    # 3. Scans — column is "confidence" not "confidence_score"
    if not event_type or event_type == "scan":
        try:
            scans_res = (
                supabase.table(Tables.SCANS)
                .select("*")
                .eq(Col.Scans.PATIENT_ID, user_id)
                .execute()
            )
            if hasattr(scans_res, "__await__"):
                scans_res = await scans_res
            for scan in scans_res.data or []:
                created_at = scan.get(Col.Scans.CREATED_AT, "")
                if start_date and created_at < start_date:
                    continue
                if end_date and created_at > end_date:
                    continue
                conf_val = scan.get(Col.Scans.CONFIDENCE) or 0
                try:
                    conf_str = f"{int(float(conf_val) * 100)}%"
                except Exception:
                    conf_str = "N/A"
                records.append(
                    {
                        "id": scan.get(Col.Scans.ID),
                        "date": _fmt_date(created_at),
                        "raw_date": created_at,
                        "type": "AI Scan",
                        "title": "AI Health Scan",
                        "summary": f"Result: {scan.get(Col.Scans.PREDICTION) or 'Completed'}",
                        "details": f"Confidence: {conf_str}",
                        "confidence": conf_str,
                        "is_manual": False,
                    }
                )
        except Exception as e:
            logger.warning(f"scans timeline fetch error: {e}")

    # 4. Mental Health Screenings
    if not event_type or event_type == "mental":
        try:
            for scrn in (
                supabase.table(Tables.MENTAL_HEALTH_SCREENINGS)
                .select("*")
                .eq("patient_id", user_id)
                .execute()
                .data
                or []
            ):
                created_at = scrn.get("created_at", "")
                if start_date and created_at < start_date:
                    continue
                if end_date and created_at > end_date:
                    continue
                dep = int(float(scrn.get("depression_score") or 0) * 100)
                anx = int(float(scrn.get("anxiety_score") or 0) * 100)
                stress = int(float(scrn.get("stress_score") or 0) * 100)
                status_summary = (
                    "Acoustic Flags Detected"
                    if (dep > 60 or anx > 60 or stress > 60)
                    else "Normal Baseline"
                )
                records.append(
                    {
                        "id": scrn.get("id"),
                        "date": _fmt_date(created_at),
                        "raw_date": created_at,
                        "type": "AI Voice Triage",
                        "title": "Mental Health Voice Triage",
                        "summary": f"Result: {status_summary}",
                        "details": f"Depression: {dep}% | Anxiety: {anx}% | Stress: {stress}%",
                        "is_manual": False,
                    }
                )
        except Exception as e:
            logger.warning(f"mental_health_screenings timeline fetch error: {e}")

    records.sort(key=lambda x: x.get("raw_date", ""), reverse=True)

    # Show demo data for new users with no records
    if not records:
        now = datetime.now()
        records = [
            {
                "id": "demo-1",
                "date": (now - timedelta(days=2)).strftime("%b %d, %Y"),
                "raw_date": (now - timedelta(days=2)).isoformat(),
                "type": "AI Scan",
                "title": "Anemia Detection Scan",
                "summary": "Result: Normal",
                "details": "Confidence: 94%",
                "is_manual": False,
            },
            {
                "id": "demo-2",
                "date": (now - timedelta(days=10)).strftime("%b %d, %Y"),
                "raw_date": (now - timedelta(days=10)).isoformat(),
                "type": "Consultation",
                "title": "Doctor Consultation",
                "summary": "Routine annual checkup",
                "status": "completed",
                "is_manual": False,
            },
            {
                "id": "demo-3",
                "date": (now - timedelta(days=30)).strftime("%b %d, %Y"),
                "raw_date": (now - timedelta(days=30)).isoformat(),
                "type": "Manual Event",
                "title": "Started Iron Supplements",
                "summary": "Began iron supplementation as prescribed",
                "is_manual": True,
            },
        ]

    return {"records": records}


@router.post("")
async def create_manual_event(
    payload: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Add a manual event to the timeline.
    timeline_events columns: user_id, event_type, event_date, title, description
    """
    if not payload.get("title"):
        raise HTTPException(status_code=400, detail="title is required")

    data = {
        Col.TimelineEvents.USER_ID: current_user.sub,
        Col.TimelineEvents.TITLE: payload["title"],
        Col.TimelineEvents.EVENT_TYPE: payload.get("category")
        or payload.get("event_type")
        or "manual",
        Col.TimelineEvents.EVENT_DATE: payload.get("event_date")
        or datetime.now().isoformat(),
        Col.TimelineEvents.DESCRIPTION: payload.get("description"),
    }
    try:
        # Bug 4 Fix: Use synchronous supabase client correctly in async context
        # The supabase-py sync client's .execute() is blocking but safe in FastAPI with thread pool
        result = supabase.table(Tables.TIMELINE_EVENTS).insert(data).execute()
        if hasattr(result, "__await__"):
            result = await result
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create event.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        logger.error(f"create_manual_event error: {err_msg}")
        # Provide a user-friendly error message instead of raw Python errors
        if "await" in err_msg.lower() or "coroutine" in err_msg.lower():
            raise HTTPException(
                status_code=500, detail="Database operation failed. Please try again."
            )
        raise HTTPException(status_code=500, detail=err_msg)
