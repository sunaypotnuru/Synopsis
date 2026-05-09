"""
Tool 10: 💎 orchestrate_screening_workflow (INTELLIGENT VERSION)

Research Sources:
- WHO Anemia Guidelines (Gender-Specific)
- FastMCP 3.0 session state management
"""

from fastmcp import Context
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from utils.audit import audit_log
from tools.anemia import diagnose_anemia
from tools.cataract import detect_cataract
from tools.dr import screen_diabetic_retinopathy
from tools.mental_health import analyze_mental_health
from tools.parkinsons import screen_parkinsons
from tools.comparison import compare_diagnostic_history
from tools.fhir_ops import get_patient_fhir

logger = logging.getLogger(__name__)


async def orchestrate_screening_workflow(
    ctx: Optional[Context],
    chief_complaint: str,
    patient_id: Optional[str] = None,
    input_data: Optional[Dict] = None,
    **kwargs,
) -> Dict:
    """
    Intelligent clinical orchestration engine with SHARP-on-MCP support.

    Accepts FHIR context (fhir_server, fhir_token) and propagates to all diagnostic tools.
    """
    input_data = input_data or {}

    # 💎 SHARP-on-MCP: Extract FHIR context from kwargs (passed from A2A bridge)
    fhir_server = kwargs.get("fhir_server")
    fhir_token = kwargs.get("fhir_token")

    # Handle ctx being None (when called via FastAPI)
    if ctx and not patient_id:
        patient_id = await ctx.get_state("current_patient_id")

    if not patient_id:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "required",
                    "diagnostics": "Patient ID required for workflow orchestration.",
                }
            ],
        }

    if ctx:
        await ctx.set_state("current_patient_id", patient_id)
        # Store FHIR context in session state for downstream tools
        if fhir_server:
            await ctx.set_state("fhir_server", fhir_server)
        if fhir_token:
            await ctx.set_state("fhir_token", fhir_token)

    # 💎 INTELLIGENCE: Retrieve patient demographics for clinical precision
    try:
        patient_record = await get_patient_fhir(
            ctx, patient_id, fhir_server=fhir_server, fhir_token=fhir_token
        )
        gender = patient_record.get("gender", "female")
        patient_name = patient_record.get("name", [{}])[0].get("text", "Unknown")
        birth_date = patient_record.get("birthDate", "Unknown")
    except Exception as e:
        logger.warning("Failed to fetch patient FHIR context for workflow: %s", e)
        gender = "female"  # Safe default
        patient_name = "Unknown"
        birth_date = "Unknown"

    workflow = _determine_workflow(chief_complaint.lower())
    if not workflow["tools"]:
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "warning",
                    "code": "not-supported",
                    "diagnostics": f"No workflow for: {chief_complaint}",
                }
            ],
        }

    results = {
        "resourceType": "WorkflowResult",
        "patient_id": patient_id,
        "patient_name": patient_name,
        "birth_date": birth_date,
        "gender_context": gender,
        "chief_complaint": chief_complaint,
        "workflow": workflow["name"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fhir_context_used": bool(fhir_server),
        "diagnostic_results": [],
        "comparison_results": [],
    }

    # 💎 CLINICAL LOOP: Execute tools with patient-specific context + FHIR propagation
    for tool_name in workflow["tools"]:
        try:
            if tool_name == "diagnose_anemia":
                # Pass gender + FHIR context to anemia tool
                res = await diagnose_anemia(
                    ctx,
                    input_data.get("image_url"),
                    patient_id,
                    gender=gender,
                    fhir_server=fhir_server,
                    fhir_token=fhir_token,
                )
                results["diagnostic_results"].append({"tool": tool_name, "result": res})
                await _try_comparison(ctx, "anemia", patient_id, results, fhir_server, fhir_token)

            elif tool_name == "detect_cataract":
                res = await detect_cataract(
                    ctx,
                    input_data.get("image_url"),
                    patient_id,
                    fhir_server=fhir_server,
                    fhir_token=fhir_token,
                )
                results["diagnostic_results"].append({"tool": tool_name, "result": res})
                await _try_comparison(ctx, "cataract", patient_id, results, fhir_server, fhir_token)

            elif tool_name == "screen_diabetic_retinopathy":
                res = await screen_diabetic_retinopathy(
                    ctx,
                    input_data.get("image_url"),
                    patient_id,
                    fhir_server=fhir_server,
                    fhir_token=fhir_token,
                )
                results["diagnostic_results"].append({"tool": tool_name, "result": res})
                await _try_comparison(ctx, "dr", patient_id, results, fhir_server, fhir_token)

            elif tool_name == "analyze_mental_health":
                res = await analyze_mental_health(
                    ctx,
                    input_data.get("audio_url"),
                    patient_id,
                    fhir_server=fhir_server,
                    fhir_token=fhir_token,
                )
                results["diagnostic_results"].append({"tool": tool_name, "result": res})
                await _try_comparison(
                    ctx, "mental_health", patient_id, results, fhir_server, fhir_token
                )

            elif tool_name == "screen_parkinsons":
                res = await screen_parkinsons(
                    ctx,
                    input_data.get("image_url"),
                    patient_id,
                    fhir_server=fhir_server,
                    fhir_token=fhir_token,
                )
                results["diagnostic_results"].append({"tool": tool_name, "result": res})
                await _try_comparison(
                    ctx, "parkinsons", patient_id, results, fhir_server, fhir_token
                )

        except Exception as e:
            logger.error(f"Tool {tool_name} failed for patient {patient_id}: {e}")
            results["diagnostic_results"].append({"tool": tool_name, "error": str(e)})

    results["recommendations"] = _generate_recommendations(results)
    results["next_steps"] = _generate_next_steps(results)
    results["clinical_summary"] = _generate_clinical_summary(results)

    await audit_log("orchestrate_screening_workflow", patient_id, results)
    return results


async def _try_comparison(ctx, diag_type, patient_id, results, fhir_server=None, fhir_token=None):
    """Try to compare diagnostic history with FHIR context support"""
    try:
        comp = await compare_diagnostic_history(
            ctx, diag_type, patient_id, fhir_server=fhir_server, fhir_token=fhir_token
        )
        if comp.get("resourceType") == "Comparison":
            results["comparison_results"].append(comp)
    except Exception as e:
        logger.warning(
            "Diagnostic history comparison failed for %s (%s): %s",
            diag_type,
            patient_id,
            e,
        )


def _determine_workflow(complaint: str) -> Dict:
    workflows = {
        "fatigue": {
            "name": "Fatigue Workup",
            "tools": ["diagnose_anemia", "analyze_mental_health"],
        },
        "vision": {
            "name": "Vision Screening",
            "tools": ["detect_cataract", "screen_diabetic_retinopathy"],
        },
        "tremor": {"name": "Movement Screening", "tools": ["screen_parkinsons"]},
        "diabetes": {
            "name": "Diabetes Screening",
            "tools": ["screen_diabetic_retinopathy", "diagnose_anemia"],
        },
    }
    for kw, wf in workflows.items():
        if kw in complaint:
            return wf
    return {"name": "Unknown", "tools": []}


def _generate_recommendations(results: Dict) -> List[str]:
    recs = []
    for diag in results["diagnostic_results"]:
        if "result" in diag:
            severity = diag["result"].get("result", {}).get("severity", "Normal")
            if severity not in ["Normal", "Mild"]:
                recs.append(f"{diag['tool'].replace('_', ' ').title()}: {severity} detected.")

    for comp in results["comparison_results"]:
        if "comparison" in comp and "trend" in comp["comparison"]:
            if "Worsening" in comp["comparison"]["trend"]:
                recs.append(
                    f"🚨 ESCALATION: {comp['diagnostic_type'].upper()} worsening. Medical necessity is High."
                )
    return recs if recs else ["Routine monitoring."]


def _generate_next_steps(results: Dict) -> List[str]:
    steps = ["Discuss findings with patient."]
    if any("🚨" in r for r in results["recommendations"]):
        steps.append("Generate Prior Auth (Tool 11) for urgent care.")
    return steps


def _generate_clinical_summary(results: Dict) -> str:
    """
    Generate human-readable clinical summary for A2A chat completions.

    This is the text that will be returned to the calling agent/user.
    """
    patient_name = results.get("patient_name", "Patient")
    patient_id = results.get("patient_id", "Unknown")
    chief_complaint = results.get("chief_complaint", "screening")
    workflow_name = results.get("workflow", "Unknown")

    summary_lines = [
        f"📋 Clinical Summary for {patient_name} (ID: {patient_id})",
        f"Chief Complaint: {chief_complaint}",
        f"Workflow: {workflow_name}",
        f"Timestamp: {results.get('timestamp', 'Unknown')}",
        "",
        "🔬 Diagnostic Results:",
    ]

    # Add diagnostic findings
    for diag in results.get("diagnostic_results", []):
        tool_name = diag.get("tool", "Unknown").replace("_", " ").title()
        if "error" in diag:
            summary_lines.append(f"  ❌ {tool_name}: Error - {diag['error']}")
        elif "result" in diag:
            result_data = diag["result"]
            if isinstance(result_data, dict):
                severity = result_data.get("result", {}).get("severity", "Unknown")
                confidence = result_data.get("result", {}).get("confidence", 0)
                summary_lines.append(f"  ✅ {tool_name}: {severity} (Confidence: {confidence:.1%})")
            else:
                summary_lines.append(f"  ✅ {tool_name}: Completed")

    # Add comparison trends if available
    if results.get("comparison_results"):
        summary_lines.append("")
        summary_lines.append("📊 Historical Trends:")
        for comp in results["comparison_results"]:
            diag_type = comp.get("diagnostic_type", "Unknown").upper()
            trend = comp.get("comparison", {}).get("trend", "Unknown")
            summary_lines.append(f"  📈 {diag_type}: {trend}")

    # Add recommendations
    if results.get("recommendations"):
        summary_lines.append("")
        summary_lines.append("💡 Recommendations:")
        for rec in results["recommendations"]:
            summary_lines.append(f"  • {rec}")

    # Add next steps
    if results.get("next_steps"):
        summary_lines.append("")
        summary_lines.append("🎯 Next Steps:")
        for step in results["next_steps"]:
            summary_lines.append(f"  • {step}")

    # Add FHIR context indicator
    if results.get("fhir_context_used"):
        summary_lines.append("")
        summary_lines.append("✅ SHARP-on-MCP: External FHIR context successfully integrated")

    return "\n".join(summary_lines)
