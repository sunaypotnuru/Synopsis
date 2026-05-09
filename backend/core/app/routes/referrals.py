from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import secrets
import string
import logging
from datetime import datetime

from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
from app.db.schema import Col
from pydantic import BaseModel

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/referrals", tags=["Referrals"])


def generate_referral_code(length=8):
    """Generate a unique referral code."""
    characters = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(characters) for _ in range(length))


@router.get("/my-code")
async def get_my_referral_code(current_user: TokenPayload = Depends(get_current_user)):
    """Get user's referral code."""
    try:
        # Check if user already has a referral code
        res = (
            supabase.table("referrals")
            .select("referral_code")
            .eq("referrer_id", current_user.sub)
            .limit(1)
            .execute()
        )

        if res.data:
            return {"referral_code": res.data[0]["referral_code"]}

        # Generate new code
        code = generate_referral_code()

        # Ensure uniqueness
        while True:
            check = (
                supabase.table("referrals")
                .select("id")
                .eq("referral_code", code)
                .execute()
            )
            if not check.data:
                break
            code = generate_referral_code()

        # Create referral record
        supabase.table("referrals").insert(
            {"referrer_id": current_user.sub, "referral_code": code, "status": "active"}
        ).execute()

        return {"referral_code": code}
    except Exception as e:
        logger.error(f"Error getting referral code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_referral_stats(current_user: TokenPayload = Depends(get_current_user)):
    """Get referral statistics."""
    try:
        # Get all referrals
        res = (
            supabase.table("referrals")
            .select("*")
            .eq("referrer_id", current_user.sub)
            .execute()
        )

        total = len(res.data) if res.data else 0
        successful = (
            len([r for r in (res.data or []) if r.get("referee_id")]) if res.data else 0
        )
        pending = total - successful

        # Get referred users details
        referred_users = []
        if res.data:
            for referral in res.data:
                if referral.get("referee_id"):
                    user_res = (
                        supabase.table("profiles_patient")
                        .select("full_name, created_at")
                        .eq("id", referral["referee_id"])
                        .execute()
                    )
                    if user_res.data:
                        referred_users.append(
                            {
                                "name": user_res.data[0]["full_name"],
                                "joined_at": user_res.data[0]["created_at"],
                            }
                        )

        return {
            "total_referrals": total,
            "successful": successful,
            "pending": pending,
            "referred_users": referred_users,
        }
    except Exception as e:
        logger.error(f"Error getting referral stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply/{code}")
async def apply_referral_code(
    code: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Apply a referral code during signup."""
    try:
        # Find referral
        res = (
            supabase.table("referrals").select("*").eq("referral_code", code).execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Invalid referral code")

        referral = res.data[0]

        # Check if already used
        if referral.get("referee_id"):
            raise HTTPException(status_code=400, detail="Referral code already used")

        # Update referral
        supabase.table("referrals").update(
            {
                "referee_id": current_user.sub,
                "status": "completed",
                "completed_at": datetime.now().isoformat(),
            }
        ).eq("id", referral["id"]).execute()

        # Award points to referrer (50 points) — upsert to avoid duplicate key errors
        supabase.table("user_points").upsert(
            {"user_id": referral["referrer_id"], "total_points": 50, "level": 1},
            on_conflict="user_id",
        ).execute()

        # Award points to new user (25 points) — upsert to avoid duplicate key errors
        supabase.table("user_points").upsert(
            {"user_id": current_user.sub, "total_points": 25, "level": 1},
            on_conflict="user_id",
        ).execute()

        return {"message": "Referral code applied successfully", "bonus_points": 25}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying referral code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# MEDICAL REFERRALS (Second Opinion)
# ============================================


class MedicalReferralCreate(BaseModel):
    target_doctor_id: str
    patient_id: str
    notes: Optional[str] = None


@router.post("/medical")
async def create_medical_referral(
    data: MedicalReferralCreate, current_user: TokenPayload = Depends(get_current_user)
):
    """Create a new referral to another doctor (Second Opinion)."""
    try:
        # Check if patient exists and if caller is their doctor
        appt_check = (
            supabase.table("appointments")
            .select("id")
            .eq("doctor_id", current_user.sub)
            .eq("patient_id", data.patient_id)
            .execute()
        )
        if not appt_check.data:
            raise HTTPException(
                status_code=403, detail="Not authorized to refer this patient."
            )

        # medical_referrals columns: referring_doctor_id, target_doctor_id, patient_id, reason, urgency, status, notes, target_notes
        # NOTE: no "access_token" column in this table
        referral = {
            Col.MedicalReferrals.REFERRING_DOCTOR_ID: current_user.sub,
            Col.MedicalReferrals.TARGET_DOCTOR_ID: data.target_doctor_id,
            Col.MedicalReferrals.PATIENT_ID: data.patient_id,
            Col.MedicalReferrals.REASON: data.notes or "Second opinion requested",
            Col.MedicalReferrals.STATUS: "pending",
            Col.MedicalReferrals.NOTES: data.notes,
        }
        res = supabase.table("medical_referrals").insert(referral).execute()
        return res.data[0] if res.data else {}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating medical referral: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to create medical referral."
        )


@router.get("/medical/sent")
async def get_sent_medical_referrals(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get referrals sent by this doctor."""
    try:
        res = (
            supabase.table("medical_referrals")
            .select(
                "*, target:profiles_doctor!target_doctor_id(full_name, specialty), patient:profiles_patient!patient_id(full_name, age, gender)"
            )
            .eq("referring_doctor_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching sent referrals: {e}")
        return []


@router.get("/medical/received")
async def get_received_medical_referrals(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get referrals received by this doctor."""
    try:
        res = (
            supabase.table("medical_referrals")
            .select(
                "*, referrer:profiles_doctor!referring_doctor_id(full_name, specialty), patient:profiles_patient!patient_id(full_name, age, gender)"
            )
            .eq("target_doctor_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching received referrals: {e}")
        return []


@router.put("/medical/{id}/respond")
async def respond_to_medical_referral(
    id: str, payload: dict, current_user: TokenPayload = Depends(get_current_user)
):
    """Accept or decline a received referral."""
    try:
        status = payload.get("status")
        if status not in ["accepted", "declined"]:
            raise HTTPException(status_code=400, detail="Invalid status")

        res = (
            supabase.table("medical_referrals")
            .update({"status": status, "target_notes": payload.get("notes")})
            .eq("id", id)
            .eq("target_doctor_id", current_user.sub)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Referral not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error responding to medical referral: {e}")
        raise HTTPException(status_code=500, detail="Failed to update medical referral")
