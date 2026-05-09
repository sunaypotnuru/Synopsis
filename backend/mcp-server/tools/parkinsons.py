"""
Tool 5: screen_parkinsons

Screen for Parkinson's disease via spiral drawing analysis.
"""

from fastmcp import Context
import httpx
from typing import Dict, Optional
from datetime import datetime, timezone
import os
from utils.audit import audit_log


async def screen_parkinsons(
    ctx: Optional[Context] = None,
    image_url: Optional[str] = None,
    patient_id: Optional[str] = None,
    **kwargs,
) -> Dict:
    """Screen for Parkinson's disease via spiral drawing analysis."""
    # 💎 Input Validation (FIXED: Prevent None crash)
    if not image_url:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "required",
                    "diagnostics": "image_url (spiral drawing) is required",
                }
            ],
        }

    # Handle ctx being None (when called via FastAPI)
    if ctx and patient_id:
        await ctx.set_state("current_patient_id", patient_id)
    elif ctx:
        patient_id = await ctx.get_state("current_patient_id") or patient_id or "unknown"
    elif not patient_id:
        patient_id = "unknown"

    service_url = os.getenv("PARKINSONS_SERVICE_URL", "https://sunay-potnuru-netra-parkinsons-screening.hf.space")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            img_response = await client.get(image_url)
            img_response.raise_for_status()

            ml_response = await client.post(
                f"{service_url}/predict",
                files={"file": ("spiral.jpg", img_response.content, "image/jpeg")},
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

    score = ml_result.get("updrs_score", 0)
    severity = ml_result.get("severity", "Normal")

    result = {
        "resourceType": "DiagnosticReport",
        "id": f"parkinsons-{patient_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "status": "final",
        "code": {
            "coding": [{"system": "http://loinc.org", "code": "89207-5"}],
            "text": "Parkinson's Screening",
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        "result": {
            "updrs_score": score,
            "severity": severity,
            "interpretation": _interpret_updrs(score),
            "recommendation": _get_parkinsons_recommendation(score),
        },
    }

    await audit_log("screen_parkinsons", patient_id, result)
    return result


def _interpret_updrs(score: int) -> str:
    """Interpret UPDRS score."""
    if score <= 20:
        return "Minimal symptoms"
    if score <= 40:
        return "Mild symptoms"
    if score <= 80:
        return "Moderate symptoms"
    return "Severe symptoms"


def _get_parkinsons_recommendation(score: int) -> str:
    """UPDRS based clinical support."""
    if score <= 20:
        return "Routine monitoring."
    if score <= 40:
        return "Neurology referral recommended. Early intervention PT/OT."
    if score <= 80:
        return "Neurology referral required. Initiate dopaminergic therapy."
    return "⚠️ URGENT: Movement disorder specialist referral. Consider DBS evaluation."
