from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from app.core.security import get_current_patient, get_current_doctor
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
from app.db.schema import Tables, Col

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


class WaitlistJoinRequest(BaseModel):
    doctor_id: str
    preferred_date: str
    reason: str
    urgency: str = "normal"  # low, normal, high


@router.post("")
async def join_waitlist(
    data: WaitlistJoinRequest, current_user: TokenPayload = Depends(get_current_patient)
):
    """Patient joins a waitlist for a specific doctor."""
    try:
        # Check if already on waitlist for this doctor
        existing = (
            supabase.table(Tables.WAITLIST)
            .select("*")
            .eq(Col.Waitlist.PATIENT_ID, current_user.sub)
            .eq(Col.Waitlist.DOCTOR_ID, data.doctor_id)
            .execute()
        )

        # Consider active waitlist entries only. If status exists and is not 'fulfilled' or 'cancelled'
        active_entries = [
            e
            for e in (existing.data or [])
            if e.get(Col.Waitlist.STATUS) in ["pending", "active", "waiting", None]
        ]

        if active_entries:
            raise HTTPException(
                status_code=400,
                detail="You are already on the waitlist for this doctor.",
            )

        insert_data = {
            Col.Waitlist.PATIENT_ID: current_user.sub,
            Col.Waitlist.DOCTOR_ID: data.doctor_id,
            Col.Waitlist.PREFERRED_DATE: data.preferred_date,
            Col.Waitlist.REASON: data.reason,
            Col.Waitlist.PRIORITY: (
                1 if data.urgency == "high" else 0
            ),  # Map urgency to priority
            Col.Waitlist.STATUS: "waiting",
        }
        res = supabase.table(Tables.WAITLIST).insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to join waitlist.")
        return {"message": "Successfully joined waitlist", "entry": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Waitlist join error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error. The waitlist table might not exist: {str(e)}",
        )


@router.get("/patient")
async def get_patient_waitlist(
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Get waitlist entries for the current patient."""
    try:
        res = (
            supabase.table(Tables.WAITLIST)
            .select("*, profiles_doctor(full_name, specialty, avatar_url)")
            .eq(Col.Waitlist.PATIENT_ID, current_user.sub)
            .order(Col.Waitlist.CREATED_AT, desc=True)
            .execute()
        )
        return {"data": res.data or []}
    except Exception as e:
        logger.error(f"Waitlist get patient error: {e}")
        return {"data": []}


@router.get("/doctor")
async def get_doctor_waitlist(current_user: TokenPayload = Depends(get_current_doctor)):
    """Get waitlist entries for the current doctor."""
    try:
        res = (
            supabase.table(Tables.WAITLIST)
            .select("*, profiles_patient(full_name, avatar_url)")
            .eq(Col.Waitlist.DOCTOR_ID, current_user.sub)
            .eq(Col.Waitlist.STATUS, "waiting")
            .order(Col.Waitlist.CREATED_AT, desc=False)
            .execute()
        )
        return {"data": res.data or []}
    except Exception as e:
        logger.error(f"Waitlist get doctor error: {e}")
        return {"data": []}


@router.put("/{waitlist_id}/status")
async def update_waitlist_status(
    waitlist_id: str,
    status: str,
    current_user: TokenPayload = Depends(get_current_doctor),
):
    """Doctor updates the status of a waitlist entry (e.g., fulfilled, cancelled)."""
    try:
        # Verify it belongs to this doctor
        check = (
            supabase.table(Tables.WAITLIST)
            .select(Col.Waitlist.DOCTOR_ID)
            .eq(Col.Waitlist.ID, waitlist_id)
            .execute()
        )
        if (
            not check.data
            or check.data[0].get(Col.Waitlist.DOCTOR_ID) != current_user.sub
        ):
            raise HTTPException(
                status_code=403, detail="Not authorized to update this entry"
            )
        res = (
            supabase.table(Tables.WAITLIST)
            .update({Col.Waitlist.STATUS: status})
            .eq(Col.Waitlist.ID, waitlist_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Waitlist entry not found")
        return {"message": "Status updated successfully", "entry": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Waitlist status update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
