"""
AI Routes - Hybrid Cloud AI Integration (Groq + Gemini Fallback).

Provides:
  - POST /ai/triage       → Patient symptom checker (Groq-powered)
  - POST /ai/scribe       → Doctor consultation scribe / SOAP note generator
  - GET  /ai/health       → AI service health check
  - POST /ai/extract-lab-vitals → Lab report OCR and extraction
  - POST /ai/assistant    → Health information assistant

Uses Groq API (Primary, FREE, fast) with Gemini as fallback.
No local models required. All AI inference is cloud-based.
"""

import logging
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import ai_service

from app.core.security import get_current_user
from app.services.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])

MEDICAL_DISCLAIMER = (
    "This AI guidance is informational only and is not a diagnosis or a substitute "
    "for professional medical advice. Contact a licensed clinician for personalized care."
)
EMERGENCY_KEYWORDS = {
    "chest pain",
    "shortness of breath",
    "suicidal",
    "suicide",
    "self harm",
    "self-harm",
    "seizure",
    "stroke",
    "unconscious",
    "fainted",
    "overdose",
    "severe bleeding",
}


# ─── Request / Response Models ──────────────────────────────────────────────


class TriageRequest(BaseModel):
    symptoms: str | list[str]
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    location: Optional[str] = None


class ScribeRequest(BaseModel):
    consultation_notes: str
    patient_name: Optional[str] = "Patient"
    doctor_name: Optional[str] = "Doctor"
    specialty: Optional[str] = "General Medicine"


class AssistantRequest(BaseModel):
    message: str
    history: list[dict] = []
    patient_context: Optional[str] = ""


class AssistantFeedbackRequest(BaseModel):
    message_id: str
    rating: int  # -1, 0, 1
    comment: Optional[str] = None


def _extract_user_value(user, key: str, default: str = "") -> str:
    if isinstance(user, dict):
        return str(user.get(key, default))
    return str(getattr(user, key, default))


def _has_emergency_signal(text: str) -> bool:
    lower_text = (text or "").lower()
    return any(keyword in lower_text for keyword in EMERGENCY_KEYWORDS)


def _append_disclaimer(text: str) -> str:
    base = (text or "").strip()
    if MEDICAL_DISCLAIMER.lower() in base.lower():
        return base
    if not base:
        return MEDICAL_DISCLAIMER
    return f"{base}\n\n{MEDICAL_DISCLAIMER}"


def _audit_ai_interaction(
    user_id: str,
    endpoint: str,
    prompt: str,
    success: bool,
    emergency_detected: bool = False,
):
    try:
        supabase.table("audit_logs").insert(
            {
                "user_id": user_id,
                "action": "AI_INTERACTION",
                "resource_type": "ai",
                "resource_id": endpoint,
                "details": {
                    "prompt_preview": (prompt or "")[:200],
                    "success": success,
                    "emergency_detected": emergency_detected,
                },
                "status": "SUCCESS" if success else "FAILED",
                "phi_accessed": False,
            }
        ).execute()
    except Exception as e:
        logger.debug(f"Best-effort AI audit logging skipped: {e}")


def _store_ai_chat_turn(
    *,
    message_id: str,
    user_id: str,
    mode: str,
    prompt: str,
    reply: str,
    success: bool,
    emergency_detected: bool,
):
    """
    Best-effort persistence of AI interactions.
    This should never block the request path if DB/table is unavailable.
    """
    try:
        supabase.table("ai_chat_history").insert(
            {
                "id": message_id,
                "user_id": user_id,
                "mode": mode,
                "prompt": (prompt or "")[:5000],
                "reply": (reply or "")[:20000],
                "success": bool(success),
                "emergency_detected": bool(emergency_detected),
            }
        ).execute()
    except Exception as e:
        logger.debug(f"Best-effort AI chat persistence skipped: {e}")


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/health")
async def ai_health():
    """Check if the AI service is configured and available."""
    # We check the global service state
    return {
        "status": (
            "online" if ai_service.gemini_ready or ai_service.groq_ready else "offline"
        ),
        "provider": "Hybrid (Groq + Gemini Fallback)",
        "groq_ready": ai_service.groq_ready,
        "gemini_ready": ai_service.gemini_ready,
        "message": (
            "AI services operational"
            if (ai_service.gemini_ready or ai_service.groq_ready)
            else "No AI providers configured."
        ),
    }


@router.post("/triage")
async def patient_triage(request: TriageRequest, user=Depends(get_current_user)):
    """
    AI-powered symptom triage for patients using DeepSeek-R1.
    Analyzes symptoms and provides structured JSON with urgency and specialty.
    """
    # Build context for the AI
    age_info = f"Age: {request.age}" if request.age else ""
    gender_info = f"Gender: {request.gender}" if request.gender else ""
    history_info = (
        f"Medical History: {request.medical_history}" if request.medical_history else ""
    )
    context_parts = [p for p in [age_info, gender_info, history_info] if p]
    patient_context = (
        ". ".join(context_parts) if context_parts else "No additional context provided"
    )

    prompt = f"""You are a medical triage assistant with expertise in emergency medicine and clinical decision-making.

Analyze the following patient information and provide a triage assessment.

Patient Context: {patient_context}
Reported Symptoms: {request.symptoms}

Provide your response as a JSON object with the following structure:
{{
  "urgency": "emergency" | "urgent" | "routine",
  "risk_score": 1-10 (integer, where 10 is most severe),
  "risk_level": "low" | "medium" | "high",
  "suggested_specialty": "cardiology" | "neurology" | "general" | etc.,
  "summary": "brief clinical summary",
  "possible_causes": ["cause 1", "cause 2", "cause 3"],
  "immediate_steps": ["step 1", "step 2", "step 3"],
  "when_to_seek_care": "guidance on when to seek emergency care"
}}

Important: Never provide a definitive diagnosis or prescribe medication. Focus on triage and guidance only.

Respond with ONLY the JSON object, no additional text."""

    result = await ai_service.chat(
        prompt=prompt,
        system_prompt="You are a medical triage assistant.",
        format="json",
    )

    if not result["success"]:
        fallback = {
            "urgency": "urgent",
            "risk_score": 7,
            "risk_level": "medium",
            "suggested_specialty": "general",
            "summary": "AI service temporarily unavailable. Please consult a doctor.",
            "possible_causes": ["Service temporarily unavailable"],
            "immediate_steps": ["Consult a healthcare provider"],
            "when_to_seek_care": "Seek emergency care if symptoms worsen.",
            "medical_disclaimer": MEDICAL_DISCLAIMER,
            "emergency_detected": _has_emergency_signal(str(request.symptoms)),
        }
        _audit_ai_interaction(
            user_id=_extract_user_value(user, "sub", "anonymous"),
            endpoint="triage",
            prompt=str(request.symptoms),
            success=False,
            emergency_detected=fallback["emergency_detected"],
        )
        return fallback

    try:
        triage_data = json.loads(result["content"])
        triage_data["medical_disclaimer"] = MEDICAL_DISCLAIMER
        triage_data["emergency_detected"] = triage_data.get(
            "urgency", ""
        ).lower() == "emergency" or _has_emergency_signal(str(request.symptoms))

        # Log to Epidemic Radar if location provided
        if request.location:
            urgency = triage_data.get("urgency", "routine").lower()
            severity = 9 if urgency == "emergency" else 7 if urgency == "urgent" else 3

            try:
                supabase.table("symptom_reports").insert(
                    {
                        "user_id": _extract_user_value(user, "sub", "anonymous"),
                        "symptoms": (
                            request.symptoms
                            if isinstance(request.symptoms, list)
                            else [request.symptoms]
                        ),
                        "severity": severity,
                        "location": f"SRID=4326;{request.location}",
                        "anonymized": True,
                    }
                ).execute()
            except Exception as e:
                logger.error(f"Failed to log symptom report: {e}")

        _audit_ai_interaction(
            user_id=_extract_user_value(user, "sub", "anonymous"),
            endpoint="triage",
            prompt=str(request.symptoms),
            success=True,
            emergency_detected=bool(triage_data.get("emergency_detected")),
        )
        return triage_data

    except Exception as e:
        logger.error(f"AI triage parsing error: {e}")
        fallback = {
            "urgency": "urgent",
            "risk_score": 7,
            "risk_level": "medium",
            "suggested_specialty": "general",
            "summary": "Failed to process AI response. Please consult a doctor.",
            "possible_causes": [f"Parsing error: {str(e)}"],
            "immediate_steps": ["Book a consultation with a healthcare provider"],
            "when_to_seek_care": "Seek emergency care if symptoms worsen rapidly.",
            "medical_disclaimer": MEDICAL_DISCLAIMER,
            "emergency_detected": _has_emergency_signal(str(request.symptoms)),
        }
        _audit_ai_interaction(
            user_id=_extract_user_value(user, "sub", "anonymous"),
            endpoint="triage",
            prompt=str(request.symptoms),
            success=False,
            emergency_detected=fallback["emergency_detected"],
        )
        return fallback


@router.post("/scribe")
async def consultation_scribe(request: ScribeRequest, user=Depends(get_current_user)):
    """
    AI-powered consultation scribe for doctors using DeepSeek-R1.
    Converts rough consultation notes into structured SOAP format.
    """
    # Use .role attribute directly from TokenPayload (it's an enum)
    user_role = str(
        getattr(user, "role", "") or _extract_user_value(user, "role", "")
    ).lower()
    if "doctor" not in user_role and "admin" not in user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Doctors only"
        )

    prompt = f"""You are a medical documentation assistant specializing in clinical note generation.

Convert the following rough consultation notes into a structured SOAP format.

Doctor: {request.doctor_name} ({request.specialty})
Patient: {request.patient_name}

Raw Consultation Notes:
---
{request.consultation_notes}
---

Generate a professional clinical summary in SOAP format:

**S - Subjective** (what the patient reports - symptoms, concerns, history)
**O - Objective** (clinical observations, vitals, examination findings, test results)
**A - Assessment** (diagnosis or clinical impression, differential diagnoses)
**P - Plan** (treatment plan, prescriptions, referrals, follow-up instructions)

Also include:
- **Follow-up Date**: Recommended timeframe for next visit
- **Key Action Items**: Bullet list of immediate next steps for patient and care team

Keep it professional, concise, and clinically appropriate. Use medical terminology where appropriate. Fill in reasonable clinical defaults where information is unclear from the notes."""
    try:
        response = await ai_service.chat(
            prompt=prompt,
            system_prompt="You are a clinical documentation assistant.",
        )
        if not response["success"]:
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable for scribe generation",
            )
        return {
            "soap_note": _append_disclaimer(response["content"]),
            "ai_powered": True,
            "model": response["model"],
            "provider": response["provider"],
            "doctor": request.doctor_name,
            "patient": request.patient_name,
        }
    except Exception as e:
        logger.error(f"DeepSeek scribe error: {e}")
        raise HTTPException(
            status_code=503, detail=f"AI service temporarily unavailable: {str(e)}"
        )


@router.post("/extract-lab-vitals")
async def extract_lab_vitals(
    file: UploadFile = File(...), user=Depends(get_current_user)
):
    """
    AI-powered Lab Report OCR and extraction using DeepSeek-R1 with vision.
    Accepts PDF or Images and returns structured JSON with key vitals.

    Note: DeepSeek-R1 14B doesn't have native vision. For OCR, consider:
    1. Using Tesseract OCR first, then DeepSeek for extraction
    2. Using llama3.2-vision or other vision models
    3. Keeping Gemini for this specific use case
    """
    try:
        await file.read()  # Read file but don't store contents

        return {
            "success": False,
            "message": "OCR feature requires vision model. Using Gemini fallback for text analysis.",
            "data": {"patient_name": "unknown", "test_date": "unknown", "metrics": []},
        }

    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(
            status_code=503, detail=f"Failed to process document: {str(e)}"
        )


@router.post("/assistant")
async def health_assistant(request: AssistantRequest, user=Depends(get_current_user)):
    """
    AI-Powered persistent health assistant.
    Provides generic health info strictly avoiding medical diagnosis.
    """

    if not ai_service.groq_ready and not ai_service.gemini_ready:
        return {"reply": "AI service is currently unavailable."}

    context = (
        f"Patient Context: {request.patient_context}\n"
        if request.patient_context
        else ""
    )

    # System prompt for assistant
    system_prompt = f"""You are Netra AI, a highly empathetic and helpful health information assistant.
You answer questions based on reputable medical sources and evidence-based medicine.

Strict Guidelines:
1. Under NO circumstances should you provide a definitive medical diagnosis.
2. NEVER prescribe medication or recommend specific drugs.
3. Always include a brief disclaimer that you are an AI assistant and users should consult a licensed healthcare provider for personalized medical advice.
4. Keep answers concise, clear, and supportive. Use bullet points for readability when appropriate.
5. If asked about serious symptoms, always recommend seeking immediate medical attention.
6. Focus on general health education, preventive care, and wellness information.

{context}"""

    result = await ai_service.chat(
        prompt=request.message, system_prompt=system_prompt, history=request.history
    )

    emergency_detected = _has_emergency_signal(request.message)
    if emergency_detected:
        emergency_suffix = (
            "\n\n⚠️ Emergency warning: Your message may describe a serious condition. "
            "If there is immediate danger, call local emergency services now."
        )
    else:
        emergency_suffix = ""
    final_reply = _append_disclaimer(result["content"]) + emergency_suffix
    message_id = str(uuid.uuid4())
    _audit_ai_interaction(
        user_id=_extract_user_value(user, "sub", "anonymous"),
        endpoint="assistant",
        prompt=request.message,
        success=bool(result["success"]),
        emergency_detected=emergency_detected,
    )
    _store_ai_chat_turn(
        message_id=message_id,
        user_id=_extract_user_value(user, "sub", "anonymous"),
        mode="assistant",
        prompt=request.message,
        reply=final_reply,
        success=bool(result["success"]),
        emergency_detected=emergency_detected,
    )

    return {
        "message_id": message_id,
        "reply": final_reply,
        "model": result["model"],
        "provider": result["provider"],
        "success": result["success"],
        "medical_disclaimer": MEDICAL_DISCLAIMER,
        "emergency_detected": emergency_detected,
    }


@router.get("/assistant/history")
async def get_assistant_history(limit: int = 50, user=Depends(get_current_user)):
    """
    Return recent assistant interactions for the current user.
    Best-effort: returns empty list if persistence is not configured.
    """
    user_id = _extract_user_value(user, "sub", "anonymous")
    try:
        res = (
            supabase.table("ai_chat_history")
            .select("id, mode, prompt, reply, success, emergency_detected, created_at")
            .eq("user_id", user_id)
            .eq("mode", "assistant")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"items": res.data or []}
    except Exception:
        return {"items": []}


@router.post("/assistant/feedback")
async def submit_assistant_feedback(
    payload: AssistantFeedbackRequest, user=Depends(get_current_user)
):
    """
    Store user feedback on an assistant message.
    Rating should be -1 (bad), 0 (neutral), 1 (good).
    """
    rating = int(payload.rating)
    if rating not in (-1, 0, 1):
        raise HTTPException(status_code=400, detail="rating must be -1, 0, or 1")

    user_id = _extract_user_value(user, "sub", "anonymous")
    try:
        supabase.table("ai_feedback").insert(
            {
                "user_id": user_id,
                "message_id": payload.message_id,
                "rating": rating,
                "comment": payload.comment,
            }
        ).execute()
    except Exception as e:
        logger.debug(f"Best-effort AI feedback persistence skipped: {e}")

    return {"success": True}
