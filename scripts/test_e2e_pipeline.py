"""
End-to-end integration test for the NetraAI FHIR pipeline.
Exercises: patient lookup -> observation timeline -> audit log verification.
"""
import httpx
import asyncio
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8080")
API_KEY    = os.getenv("MCP_API_KEY", "netra-ai-industrial-secret-2026")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PASS = "PASS"
FAIL = "FAIL"
results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((status, label, detail))
    icon = "[OK]" if condition else "[FAIL]"
    print(f"  {icon} {label}" + (f" — {detail}" if detail else ""))
    return condition


async def call(tool_name, arguments):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{SERVER_URL}/tools/call",
            json={"name": tool_name, "arguments": arguments},
            headers={"X-API-Key": API_KEY},
        )
    return r.json()


async def main():
    print("=" * 60)
    print("NetraAI FHIR Pipeline — End-to-End Integration Test")
    print("=" * 60)

    # ── 1. Health check ───────────────────────────────────────────
    print("\n[1] Server health")
    r = (await call("health_check_tool", {}))
    check("Server responds healthy", r.get("status") == "healthy")

    # ── 2. Patient lookup ─────────────────────────────────────────
    print("\n[2] Patient FHIR lookup (patient-1)")
    patient = await call("get_patient_fhir_tool", {"patient_id": "patient-1"})
    check("resourceType is Patient",   patient.get("resourceType") == "Patient")
    check("Patient has name array",    isinstance(patient.get("name"), list))
    check("Patient has gender",        bool(patient.get("gender")))
    check("Patient has birthDate",     bool(patient.get("birthDate")))
    check("No OperationOutcome error", patient.get("resourceType") != "OperationOutcome",
          patient.get("issue", [{}])[0].get("diagnostics", "") if patient.get("resourceType") == "OperationOutcome" else "")

    # ── 3. Observation timeline ───────────────────────────────────
    print("\n[3] Patient observation timeline")
    timeline = await call("query_patient_timeline_tool", {
        "patient_id": "patient-1",
        "resource_type": "Observation",
    })
    check("resourceType is Bundle",     timeline.get("resourceType") == "Bundle")
    check("Bundle has entries",         timeline.get("total", 0) > 0,
          f"{timeline.get('total', 0)} observations found")
    if timeline.get("entry"):
        first_obs = timeline["entry"][0].get("resource", {})
        check("Entry resource has LOINC code", bool(first_obs.get("code")))
        check("Entry resource has valueQuantity", bool(first_obs.get("valueQuantity")))

    # ── 4. Audit log verification ─────────────────────────────────
    print("\n[4] Audit log persistence")
    import time; time.sleep(2)  # allow async write to settle
    logs = supabase.table("audit_logs") \
        .select("tool_name, output_data, timestamp") \
        .in_("tool_name", ["get_patient_fhir", "query_patient_timeline"]) \
        .order("timestamp", desc=True) \
        .limit(5) \
        .execute().data
    check("Audit logs written to Supabase", len(logs) >= 2,
          f"{len(logs)} records found")
    if logs:
        # Verify PHI scrubbing on the output_data blob
        for log in logs:
            od = log.get("output_data", {})
            phi_leak = any(
                isinstance(od.get(k), str) and "[REDACTED]" not in od.get(k, "")
                for k in ("name", "email", "phone", "address")
                if k in od
            )
            check(f"No PHI leak in {log['tool_name']} output", not phi_leak)

    # ── 5. DB record counts ───────────────────────────────────────
    print("\n[5] Database record counts")
    patients_count  = supabase.table("fhir_patients").select("id", count="exact").execute().count
    obs_count       = supabase.table("fhir_observations").select("id", count="exact").execute().count
    audit_count     = supabase.table("audit_logs").select("id", count="exact").execute().count
    check("fhir_patients populated",    (patients_count or 0) >= 100,
          f"{patients_count} rows")
    check("fhir_observations populated",(obs_count or 0) >= 500,
          f"{obs_count} rows")
    check("audit_logs has entries",     (audit_count or 0) >= 1,
          f"{audit_count} rows")

    # ── Summary ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    passed = sum(1 for s, *_ in results if s == PASS)
    failed = sum(1 for s, *_ in results if s == FAIL)
    total  = len(results)
    print(f"RESULT: {passed}/{total} checks passed  |  {failed} failed")
    if failed == 0:
        print("STATUS: ALL CHECKS PASSED — Phase 2 pipeline fully operational.")
    else:
        print("STATUS: FAILURES DETECTED — review output above.")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    ok = asyncio.run(main())
    raise SystemExit(0 if ok else 1)
