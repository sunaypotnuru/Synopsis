"""
Phase 3: Specialized Intake Forms (Mental Health, Women's Health, Child Monitoring).
Provides:
  - GET /intake-form/{specialty}  → Returns the dynamic JSON schema for a given specialty
  - POST /intake-response          → Submit patient's intake form responses for an appointment
  - GET /intake-response/{appointment_id} → Doctor retrieves a patient's intake responses
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
import logging

from app.core.security import get_current_user
from app.services.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intake", tags=["Intake Forms"])


# ─── Pre-defined specialty form schemas ──────────────────────────────────────

SPECIALTY_SCHEMAS: dict[str, Any] = {
    "mental_health": {
        "title": "Mental Health Intake",
        "description": "Please answer these questions to help your doctor prepare for your session.",
        "fields": [
            {
                "id": "phq9_q1",
                "type": "scale",
                "label": "Little interest or pleasure in doing things",
                "min": 0,
                "max": 3,
                "labels": [
                    "Not at all",
                    "Several days",
                    "More than half the days",
                    "Nearly every day",
                ],
            },
            {
                "id": "phq9_q2",
                "type": "scale",
                "label": "Feeling down, depressed or hopeless",
                "min": 0,
                "max": 3,
                "labels": [
                    "Not at all",
                    "Several days",
                    "More than half the days",
                    "Nearly every day",
                ],
            },
            {
                "id": "phq9_q3",
                "type": "scale",
                "label": "Trouble falling or staying asleep, or sleeping too much",
                "min": 0,
                "max": 3,
                "labels": [
                    "Not at all",
                    "Several days",
                    "More than half the days",
                    "Nearly every day",
                ],
            },
            {
                "id": "phq9_q4",
                "type": "scale",
                "label": "Feeling tired or having little energy",
                "min": 0,
                "max": 3,
                "labels": [
                    "Not at all",
                    "Several days",
                    "More than half the days",
                    "Nearly every day",
                ],
            },
            {
                "id": "current_meds",
                "type": "text",
                "label": "Are you currently taking any psychiatric medications? If yes, please list them.",
            },
            {
                "id": "previous_therapy",
                "type": "boolean",
                "label": "Have you ever received therapy or counselling?",
            },
            {
                "id": "emergency_contact",
                "type": "text",
                "label": "Emergency contact name and number",
            },
        ],
    },
    "gynecology": {
        "title": "Women's Health Intake",
        "description": "This information helps your doctor provide personalized care.",
        "fields": [
            {
                "id": "last_period",
                "type": "date",
                "label": "Date of last menstrual period",
            },
            {
                "id": "cycle_regular",
                "type": "boolean",
                "label": "Is your menstrual cycle regular?",
            },
            {
                "id": "pregnancies",
                "type": "number",
                "label": "Number of previous pregnancies",
            },
            {
                "id": "current_contraception",
                "type": "text",
                "label": "Current contraception method (if any)",
            },
            {
                "id": "symptoms",
                "type": "multiselect",
                "label": "Current symptoms",
                "options": [
                    "Irregular periods",
                    "Heavy bleeding",
                    "Pelvic pain",
                    "Hot flashes",
                    "Breast changes",
                    "None",
                ],
            },
            {
                "id": "family_history",
                "type": "text",
                "label": "Family history of breast or ovarian cancer?",
            },
        ],
    },
    "pediatrics": {
        "title": "Child Health Monitoring Intake",
        "description": "For our youngest patients. Please complete on behalf of your child.",
        "fields": [
            {"id": "child_name", "type": "text", "label": "Child's full name"},
            {"id": "child_dob", "type": "date", "label": "Child's date of birth"},
            {"id": "weight_kg", "type": "number", "label": "Child's weight (kg)"},
            {"id": "height_cm", "type": "number", "label": "Child's height (cm)"},
            {
                "id": "vaccinations_uptodate",
                "type": "boolean",
                "label": "Are all vaccinations up to date?",
            },
            {"id": "allergies", "type": "text", "label": "Known allergies"},
            {
                "id": "main_concern",
                "type": "text",
                "label": "Main concern for today's visit",
            },
            {
                "id": "developmental_concerns",
                "type": "boolean",
                "label": "Any developmental concerns (speech, motor, social)?",
            },
        ],
    },
}


# ─── Schemas ─────────────────────────────────────────────────────────────────


class IntakeResponse(BaseModel):
    appointment_id: str
    specialty: str
    responses: dict


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/form/{specialty}")
async def get_intake_form(specialty: str, user=Depends(get_current_user)):
    """Returns the intake form JSON schema for a given specialty."""
    schema = SPECIALTY_SCHEMAS.get(specialty.lower())
    if not schema:
        # Return a basic generic form if specialty not found
        return {
            "specialty": specialty,
            "title": f"{specialty.title()} Intake Form",
            "description": "Please describe your current health concerns.",
            "fields": [
                {
                    "id": "chief_complaint",
                    "type": "text",
                    "label": "What is your main reason for visiting today?",
                },
                {
                    "id": "current_medications",
                    "type": "text",
                    "label": "List any current medications",
                },
                {"id": "allergies", "type": "text", "label": "Known allergies"},
                {
                    "id": "additional_info",
                    "type": "text",
                    "label": "Any other information for your doctor",
                },
            ],
        }
    return {"specialty": specialty, **schema}


@router.post("/response")
async def submit_intake_response(data: IntakeResponse, user=Depends(get_current_user)):
    """Submit patient's intake form responses prior to a consultation."""
    try:
        record = {
            "appointment_id": data.appointment_id,
            "patient_id": user.get("sub"),
            "specialty": data.specialty,
            "responses": data.responses,
        }
        supabase.table("intake_responses").upsert(
            record, on_conflict="appointment_id"
        ).execute()
        return {"success": True, "message": "Intake form submitted successfully"}
    except Exception as e:
        logger.error(f"Error submitting intake form: {e}")
        raise HTTPException(status_code=500, detail="Failed to save intake response")


@router.get("/response/{appointment_id}")
async def get_intake_response(appointment_id: str, user=Depends(get_current_user)):
    """Retrieve a patient's intake form responses (for doctor view)."""
    try:
        result = (
            supabase.table("intake_responses")
            .select("*")
            .eq("appointment_id", appointment_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=404, detail="No intake form found for this appointment"
            )
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching intake response: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch intake response")
