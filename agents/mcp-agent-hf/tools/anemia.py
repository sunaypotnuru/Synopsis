"""
Tool 1: diagnose_anemia

Analyze palpebral conjunctiva image to detect anemia and estimate hemoglobin levels.

Research Sources:
- WHO Hemoglobin Cutoffs (2023 update)
"""

from fastmcp import Context
import httpx
from typing import Dict, Optional
from datetime import datetime, timezone
import os

from utils.audit import audit_log


async def diagnose_anemia(
    ctx: Optional[Context] = None,
    image_url: Optional[str] = None,
    patient_id: Optional[str] = None,
    gender: str = "female",  # Default to female per WHO 12.0 baseline
    **kwargs
) -> Dict:
    """
    Analyze palpebral conjunctiva image to detect anemia.

    WHO 2023 Guidelines (Gender-Specific):
    - Women: Normal ≥12.0, Mild 11.0-11.9, Moderate 8.0-10.9, Severe <8.0
    - Men: Normal ≥13.0, Mild 11.0-12.9, Moderate 8.0-10.9, Severe <8.0
    """
    # 💎 Input Validation (FIXED: Prevent None crash)
    if not image_url:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "required",
                    "diagnostics": "image_url is required for analysis",
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

    anemia_service_url = os.getenv(
        "ANEMIA_SERVICE_URL", "https://sunaypotnuru-netra-anemia.hf.space"
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            img_response = await client.get(image_url)
            img_response.raise_for_status()

            ml_response = await client.post(
                f"{anemia_service_url}/predict",
                files={"file": ("image.jpg", img_response.content, "image/jpeg")},
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

    hb = ml_result.get("hemoglobin_estimate", 12.0)
    # 💎 Clinical Logic (FIXED: Gender-specific thresholds)
    severity = _classify_anemia_severity(hb, gender)
    recommendation = _get_anemia_recommendation(hb, severity)

    result = {
        "resourceType": "DiagnosticReport",
        "id": f"anemia-{patient_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "status": "final",
        "code": {
            "coding": [{"system": "http://loinc.org", "code": "718-7"}],
            "text": "Anemia Screening",
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        "result": {
            "hemoglobin_estimate": hb,
            "unit": "g/dL",
            "severity": severity,
            "gender_context": gender,
            "recommendation": recommendation,
            "guideline": "WHO 2023 (Gender-Specific)",
        },
    }

    await audit_log("diagnose_anemia", patient_id, result)
    return result


def _classify_anemia_severity(hb: float, gender: str) -> str:
    """WHO 2023 Gender-Specific Classification."""
    threshold = 13.0 if gender.lower() == "male" else 12.0
    if hb >= threshold:
        return "Normal"
    if hb >= 11.0:
        return "Mild"
    if hb >= 8.0:
        return "Moderate"
    return "Severe"


def _get_anemia_recommendation(hb: float, severity: str) -> str:
    """WHO-based clinical support."""
    recs = {
        "Normal": "Continue iron-rich diet.",
        "Mild": "Dietary counseling + Recheck in 3 months.",
        "Moderate": "Iron supplementation + Investigate cause (GI/Malabsorption).",
        "Severe": "⚠️ URGENT: Hematology referral. Consider transfusion if symptomatic.",
    }
    return recs.get(severity, "Monitor closely.")
