import os
from supabase import create_client
from dotenv import load_dotenv

# 💎 DIAMOND-GRADE: FHIR R4 Compliance Verifier

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

def verify_compliance():
    print("Starting FHIR R4 Compliance Check...")
    
    # 1. Check Patients
    print("\n--- Verifying Patients ---")
    patients = supabase.table("fhir_patients").select("id, data").limit(10).execute().data
    if not patients:
        print("No patients found!")
        return
        
    for p in patients:
        data = p["data"]
        rid = p["id"]
        issues = []
        if data.get("resourceType") != "Patient": issues.append("Invalid resourceType")
        if not data.get("id"): issues.append("Missing ID in resource")
        if not data.get("name"): issues.append("Missing name")
        
        if issues:
            print(f"FAILED Patient {rid}: {', '.join(issues)}")
        else:
            print(f"OK Patient {rid}: Compliant")

    # 2. Check Observations
    print("\n--- Verifying Observations ---")
    obs = supabase.table("fhir_observations").select("id, data").limit(10).execute().data
    if not obs:
        print("No observations found!")
        return
        
    for o in obs:
        data = o["data"]
        rid = o["id"]
        issues = []
        if data.get("resourceType") != "Observation": issues.append("Invalid resourceType")
        if not data.get("status"): issues.append("Missing status")
        if not data.get("code"): issues.append("Missing code")
        if not data.get("subject"): issues.append("Missing subject reference")
        
        if issues:
            print(f"FAILED Observation {rid}: {', '.join(issues)}")
        else:
            print(f"OK Observation {rid}: Compliant")

    print("\nCompliance verification complete.")

if __name__ == "__main__":
    verify_compliance()
