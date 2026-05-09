"""
Tool 2: detect_cataract

Analyze lens image to detect cataract and assess opacity level.
"""

from fastmcp import Context
import httpx
from typing import Dict, Optional
from datetime import datetime, timezone
import os
from utils.audit import audit_log


async def detect_cataract(
    ctx: Optional[Context] = None,
    image_url: Optional[str] = None,
    patient_id: Optional[str] = None,
    **kwargs
) -> Dict:
    """Analyze lens image for cataract detection."""
    # 💎 Input Validation (FIXED: Prevent None crash)
    if not image_url:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "required",
                    "diagnostics": "image_url is required for cataract analysis",
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
        "CATARACT_SERVICE_URL", "https://sunaypotnuru-netra-cataract-detection.hf.space"
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            img_response = await client.get(image_url)
            img_response.raise_for_status()

            ml_response = await client.post(
                f"{service_url}/predict",
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

    severity = ml_result.get("severity", "Normal")
    opacity = ml_result.get("opacity_score", 0.0)

    # 💎 SURPLUS VALUE: Explainable AI (XAI) Heatmap
    # Provides attention regions for diagnostic transparency
    heatmap_url = f"{service_url}/visualize?image={image_url}&patient={patient_id}"

    result = {
        "resourceType": "DiagnosticReport",
        "id": f"cataract-{patient_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "status": "final",
        "code": {
            "coding": [{"system": "http://loinc.org", "code": "79893-4"}],
            "text": "Cataract Detection",
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        "result": {
            "severity": severity,
            "opacity_score": opacity,
            "attention_heatmap_url": heatmap_url,
            "recommendation": _get_cataract_recommendation(severity),
            "guideline": "AAO 2024 Clinical Standards",
        },
    }

    await audit_log("detect_cataract", patient_id, result)
    return result


def _get_cataract_recommendation(severity: str) -> str:
    """Clinical decision support for cataract."""
    recs = {
        "Normal": "No cataract detected. Annual eye exams.",
        "Early": "Monitor progression annually. Use UV protection.",
        "Moderate": "Monitor every 6 months. Consider surgery if functional impairment.",
        "Advanced": "Ophthalmology referral recommended for surgical evaluation.",
    }
    return recs.get(severity, "Routine follow-up.")
