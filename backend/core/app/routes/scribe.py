from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import logging
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.ai_service import ai_service
from app.services.supabase import supabase
import json

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/scribe", tags=["AI Scribe"])

# Configure DeepSeek-R1 (Legacy/Local)
DEEPSEEK_MODEL = "deepseek-r1:14b"


class TranscribeRequest(BaseModel):
    audio_data: str  # Base64 encoded audio


class AnalyzeRequest(BaseModel):
    transcript: str
    patient_context: Optional[str] = None


class SaveSOAPRequest(BaseModel):
    appointment_id: str
    patient_id: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    transcript: Optional[str] = None
    is_ai_generated: bool = False
    template_used: Optional[str] = None


@router.post("/transcribe")
async def transcribe_audio(
    request: TranscribeRequest, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Transcribe audio to text using speech-to-text.
    For now, returns mock transcription. In production, integrate with:
    - Google Speech-to-Text API
    - OpenAI Whisper API
    - Azure Speech Services
    """
    try:
        # Mock transcription for now
        # In production, decode base64 audio and send to speech-to-text service
        mock_transcript = """
        Patient presents with complaints of fatigue and dizziness for the past two weeks.
        Reports feeling tired even after adequate sleep. No fever or chills.
        Physical examination shows pale conjunctiva. Blood pressure 110/70.
        Heart rate 88 bpm. Respiratory rate normal.
        Suspect anemia based on clinical presentation and conjunctival pallor.
        Recommend complete blood count and iron studies.
        Advised iron supplementation and dietary modifications.
        Follow-up in two weeks to review lab results.
        """

        return {
            "transcript": mock_transcript.strip(),
            "duration_seconds": 45,
            "confidence": 0.95,
            "language": "en",
        }
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_transcript(
    request: AnalyzeRequest, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Analyze transcript and generate SOAP notes using DeepSeek-R1 (Local AI).
    """
    try:
        # Create prompt for AI Scribe
        prompt = f"""You are a medical AI assistant helping doctors create SOAP notes from consultation transcripts.

Transcript:
{request.transcript}

{f"Patient Context: {request.patient_context}" if request.patient_context else ""}

Please analyze this transcript and generate structured SOAP notes:

1. Subjective: What the patient reports (symptoms, history, concerns)
2. Objective: Observable findings (vital signs, physical exam, test results)
3. Assessment: Medical diagnosis or clinical impression
4. Plan: Treatment plan, medications, follow-up, patient education

Format your response as JSON with keys: subjective, objective, assessment, plan

Be concise, professional, and medically accurate. Use proper medical terminology.

Respond with ONLY the JSON object, no additional text."""

        # Generate SOAP notes using Hybrid AI Service
        result = await ai_service.chat(
            prompt=prompt,
            system_prompt="You are a medical AI assistant HELPING DOCTORS create SOAP notes.",
            format="json",
        )

        if not result["success"]:
            # Return mock SOAP notes if AI service fails entirely
            return {
                "subjective": "Patient reports fatigue and dizziness for 2 weeks. Feels tired despite adequate sleep.",
                "objective": "Physical exam: Pale conjunctiva noted. BP: 110/70 mmHg. HR: 88 bpm. RR: Normal.",
                "assessment": "Suspected anemia based on clinical presentation.",
                "plan": "1. Order CBC with differential and iron studies\n2. Start iron supplementation\n3. Follow-up in 2 weeks",
                "confidence": 0.50,
                "is_mock": True,
                "error": result.get("error", "AI service unavailable"),
            }

        # Parse response
        try:
            soap_data = json.loads(result["content"])
        except (json.JSONDecodeError, KeyError, TypeError):
            # Fallback if JSON parsing fails
            soap_data = {
                "subjective": result["content"][:500],
                "objective": "",
                "assessment": "",
                "plan": "",
            }

        return {
            "subjective": soap_data.get("subjective", ""),
            "objective": soap_data.get("objective", ""),
            "assessment": soap_data.get("assessment", ""),
            "plan": soap_data.get("plan", ""),
            "confidence": 0.95,
            "is_mock": False,
            "model": result["model"],
            "provider": result["provider"],
        }

    except Exception as e:
        logger.error(f"Error analyzing transcript: {e}")
        # Return fallback mock data on error
        return {
            "subjective": "Patient reports symptoms as described in transcript.",
            "objective": "Physical examination findings as noted.",
            "assessment": "Clinical assessment based on presentation.",
            "plan": "Treatment plan as discussed with patient.",
            "confidence": 0.50,
            "is_mock": True,
            "error": str(e),
        }


@router.post("/save")
async def save_soap_notes(
    request: SaveSOAPRequest, current_user: TokenPayload = Depends(get_current_user)
):
    """Save SOAP notes to database."""
    try:
        # Check if SOAP notes already exist for this appointment
        existing = (
            supabase.table("soap_notes")
            .select("id")
            .eq("appointment_id", request.appointment_id)
            .execute()
        )

        soap_data = {
            "appointment_id": request.appointment_id,
            "doctor_id": current_user.sub,
            "patient_id": request.patient_id,
            "subjective": request.subjective,
            "objective": request.objective,
            "assessment": request.assessment,
            "plan": request.plan,
            "transcript": request.transcript,
            "is_ai_generated": request.is_ai_generated,
            "template_used": request.template_used,
        }

        if existing.data:
            # Update existing
            result = (
                supabase.table("soap_notes")
                .update(soap_data)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            # Insert new
            result = supabase.table("soap_notes").insert(soap_data).execute()

        return {
            "success": True,
            "soap_note_id": result.data[0]["id"] if result.data else None,
            "message": "SOAP notes saved successfully",
        }

    except Exception as e:
        logger.error(f"Error saving SOAP notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notes/{appointment_id}")
async def get_soap_notes(
    appointment_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get SOAP notes for an appointment."""
    try:
        result = (
            supabase.table("soap_notes")
            .select("*")
            .eq("appointment_id", appointment_id)
            .execute()
        )

        if not result.data:
            return {
                "found": False,
                "message": "No SOAP notes found for this appointment",
            }

        return {"found": True, "data": result.data[0]}

    except Exception as e:
        logger.error(f"Error fetching SOAP notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_soap_templates(current_user: TokenPayload = Depends(get_current_user)):
    """Get SOAP note templates."""
    templates = [
        {
            "id": "anemia",
            "name": "Anemia Consultation",
            "subjective": "Patient reports [symptoms]. Duration: [timeframe]. Associated symptoms: [list].",
            "objective": "Physical exam: [findings]. Vital signs: BP [value], HR [value]. Conjunctival examination: [findings].",
            "assessment": "Clinical impression: [diagnosis]. Severity: [mild/moderate/severe]. Differential diagnosis: [alternatives].",
            "plan": "1. Laboratory tests: [CBC, iron studies, etc.]\n2. Treatment: [medications]\n3. Dietary recommendations: [iron-rich foods]\n4. Follow-up: [timeframe]\n5. Patient education: [key points]",
        },
        {
            "id": "general",
            "name": "General Check-up",
            "subjective": "Patient presents for routine check-up. Reports [overall health status]. Current concerns: [list].",
            "objective": "General appearance: [description]. Vital signs: [values]. Systems review: [findings].",
            "assessment": "Overall health status: [assessment]. Risk factors: [list].",
            "plan": "1. Preventive care: [recommendations]\n2. Screening tests: [list]\n3. Lifestyle modifications: [suggestions]\n4. Follow-up: [schedule]",
        },
        {
            "id": "follow-up",
            "name": "Follow-up Visit",
            "subjective": "Patient returns for follow-up. Previous diagnosis: [condition]. Current status: [improvement/stable/worsening].",
            "objective": "Interval changes: [findings]. Current examination: [results]. Compliance with treatment: [assessment].",
            "assessment": "Response to treatment: [evaluation]. Current status: [description].",
            "plan": "1. Continue current treatment: [yes/no]\n2. Medication adjustments: [changes]\n3. Additional tests: [if needed]\n4. Next follow-up: [timeframe]",
        },
    ]

    return {"templates": templates}
