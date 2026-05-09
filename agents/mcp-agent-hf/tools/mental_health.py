"""
Tool 4: analyze_mental_health

Analyze voice recording for mental health screening via sentiment analysis.
"""

from fastmcp import Context
import httpx
from typing import Dict, Optional
from datetime import datetime, timezone
import os
from utils.audit import audit_log


async def analyze_mental_health(
    ctx: Optional[Context] = None,
    audio_url: Optional[str] = None,
    patient_id: Optional[str] = None,
    **kwargs
) -> Dict:
    """Analyze voice recording for mental health screening."""
    # 💎 Input Validation (FIXED: Prevent None crash)
    if not audio_url:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "required",
                    "diagnostics": "audio_url is required for mental health analysis",
                }
            ],
        }

    if patient_id:
        if isinstance(ctx, Context):
            await ctx.set_state("current_patient_id", patient_id)
    else:
        if isinstance(ctx, Context):
            patient_id = await ctx.get_state("current_patient_id") or "unknown"
        else:
            patient_id = "unknown"

    service_url = os.getenv(
        "MENTAL_HEALTH_SERVICE_URL",
        "https://sunaypotnuru-netra-mental-health-voice-analysis.hf.space",
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            audio_response = await client.get(audio_url)
            audio_response.raise_for_status()

            ml_response = await client.post(
                f"{service_url}/predict",
                files={"file": ("audio.wav", audio_response.content, "audio/wav")},
            )
            ml_response.raise_for_status()
            ml_result = ml_response.json()
    except Exception as e:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "exception",
                    "diagnostics": f"ML Service Error: {str(e)}",
                }
            ],
        }

    severity = ml_result.get("severity", "Normal")
    phq9 = ml_result.get("phq9_score", 0)

    # 💎 SURPLUS VALUE: Crisis Detection
    crisis_detected = phq9 >= 20 or "suicide" in str(ml_result).lower()

    result = {
        "resourceType": "DiagnosticReport",
        "id": f"mental-health-{patient_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "status": "final",
        "code": {
            "coding": [{"system": "http://loinc.org", "code": "89204-2"}],
            "text": "Mental Health Screening",
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        "result": {
            "severity": severity,
            "phq9_score": phq9,
            "crisis_detected": crisis_detected,
            "interpretation": _interpret_phq9(phq9),
            "recommendation": _get_mental_health_recommendation(phq9),
            "emergency_contact": (
                "988 (National Crisis Line)" if crisis_detected else None
            ),
        },
    }

    await audit_log("analyze_mental_health", patient_id, result)
    return result


def _interpret_phq9(score: int) -> str:
    """Interpret PHQ-9 score."""
    if score <= 4:
        return "Minimal depression"
    if score <= 9:
        return "Mild depression"
    if score <= 14:
        return "Moderate depression"
    if score <= 19:
        return "Moderately severe depression"
    return "Severe depression"


def _get_mental_health_recommendation(score: int) -> str:
    """PHQ-9 based clinical support."""
    if score <= 9:
        return "Psychoeducation and lifestyle modifications."
    if score <= 14:
        return "Consider psychotherapy or medication. Refer to professional."
    if score <= 19:
        return "⚠️ URGENT: Mental health referral required. Active treatment needed."
    return "⚠️ EMERGENCY: Immediate intervention required. Call 988 if suicidal."
