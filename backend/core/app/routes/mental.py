from fastapi import APIRouter, Depends, UploadFile, File, HTTPException  # type: ignore
import httpx  # type: ignore
import logging
from app.core.security import get_current_patient  # type: ignore
from app.core.config import settings  # type: ignore
from app.services.supabase import supabase  # type: ignore

router = APIRouter(prefix="/mental", tags=["Mental Health AI"])
logger = logging.getLogger(__name__)


@router.post("/analyze")
async def analyze_mental_health(
    file: UploadFile = File(...), current_patient=Depends(get_current_patient)
):
    """
    Accepts raw microphone buffer, securely transfers via internal HTTPS boundary to ML container, and logs final acoustic triage mapping globally.
    """
    try:
        audio_bytes = await file.read()

        async with httpx.AsyncClient(timeout=45.0) as client:
            files = {
                "file": (
                    file.filename or "recording.webm",
                    audio_bytes,
                    file.content_type,
                )
            }

            try:
                # Transmit binary to native ML container over isolated Docker network
                url = f"{settings.MENTAL_HEALTH_API_URL}/analyze"
                resp = await client.post(url, files=files)
                resp.raise_for_status()
                result = resp.json()
            except httpx.RequestError as e:
                logger.error(f"Error contacting mental health acoustic service: {e}")
                raise HTTPException(503, "Voice Triage Analytics Engine Offline.")

        # Safely log statistical telemetry to Database
        insert_data = {
            "patient_id": current_patient.sub,
            "depression_score": result.get("depression_score"),
            "anxiety_score": result.get("anxiety_score"),
            "stress_score": result.get("stress_score"),
            "confidence": result.get("confidence"),
        }

        supabase.table("mental_health_screenings").insert(insert_data).execute()

        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"Acoustic AI Rejecting Payload: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"AI rejected media: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Mental Health Voice Pipeline Collapse: {e}")
        raise HTTPException(500, str(e))
