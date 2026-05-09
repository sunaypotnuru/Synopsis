import json
from pathlib import Path
from supabase import create_client
import os
from dotenv import load_dotenv
import time

# 💎 DIAMOND-GRADE: Industrial Synthea Data Loader
# Maps FHIR Bundles to document-oriented Supabase tables (JSONB)

load_dotenv()

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    exit(1)

supabase = create_client(supabase_url, supabase_key)

# Load all FHIR bundles
fhir_dir = Path("data/synthea/output/fhir")
if not fhir_dir.exists():
    fhir_dir = Path("data/synthea/fhir")
    if not fhir_dir.exists():
        print(f"Error: Synthea data not found at {fhir_dir}")
        exit(1)

print(f"Loading FHIR bundles from {fhir_dir}...")

patient_batch = []
obs_batch = []
report_batch = []
loaded_count = 0

def flush_batches():
    global patient_batch, obs_batch, report_batch
    try:
        if patient_batch:
            print(f"  - Upserting {len(patient_batch)} Patients...")
            supabase.table("fhir_patients").upsert(patient_batch).execute()
        
        if obs_batch:
            print(f"  - Upserting {len(obs_batch)} Observations...")
            supabase.table("fhir_observations").upsert(obs_batch).execute()
            
        if report_batch:
            print(f"  - Upserting {len(report_batch)} DiagnosticReports...")
            supabase.table("fhir_diagnostic_reports").upsert(report_batch).execute()
            
        patient_batch, obs_batch, report_batch = [], [], []
    except Exception as e:
        print(f"  Flush Error: {e}")

for file in fhir_dir.glob("*.json"):
    try:
        bundle = json.loads(file.read_text())
        
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            rtype = resource.get("resourceType")
            rid = resource.get("id")
            
            if not rid or not rtype:
                continue
                
            # Document-oriented mapping (JSONB)
            payload = {
                "id": rid,
                "resource_type": rtype,
                "data": resource
            }
            
            if rtype == "Patient":
                patient_batch.append(payload)
            elif rtype == "Observation":
                # Link to patient
                patient_ref = resource.get("subject", {}).get("reference", "").split("/")[-1]
                payload["patient_id"] = patient_ref
                payload["code"] = resource.get("code", {}).get("coding", [{}])[0].get("code")
                obs_batch.append(payload)
            elif rtype == "DiagnosticReport":
                patient_ref = resource.get("subject", {}).get("reference", "").split("/")[-1]
                payload["patient_id"] = patient_ref
                payload["code"] = resource.get("code", {}).get("coding", [{}])[0].get("code")
                payload["status"] = resource.get("status")
                payload["conclusion"] = resource.get("conclusion")
                report_batch.append(payload)
        
        loaded_count += 1
        
        # Batch insert every 20 files
        if loaded_count % 20 == 0:
            print(f"Processing... ({loaded_count} bundles handled)")
            flush_batches()
            
    except Exception as e:
        print(f"Warning: Error loading {file.name}: {e}")

# Final flush
flush_batches()

print(f"\nDone! Processed {loaded_count} FHIR bundles into Supabase.")
