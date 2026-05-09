import json
from pathlib import Path
import os

def calculate_synthea_size():
    """Calculate total size of Synthea data to ensure it fits in Supabase free tier."""
    # Try different possible paths for Synthea data
    possible_paths = [
        Path("data/synthea/output/fhir"),
        Path("data/synthea/fhir"),
        Path("Netra-Ai/data/synthea/output/fhir"),
        Path("backend/mcp-server/data/synthea/fhir")
    ]
    
    synthea_dir = None
    for path in possible_paths:
        if path.exists() and path.is_dir():
            synthea_dir = path
            break
            
    if not synthea_dir:
        print("❌ Synthea data directory not found in common locations.")
        print(f"Current working directory: {os.getcwd()}")
        return
    
    total_size = 0
    patient_count = 0
    
    # Synthea FHIR files are usually .json
    for file in synthea_dir.glob("*.json"):
        size = file.stat().st_size
        total_size += size
        patient_count += 1
    
    if patient_count == 0:
        print(f"❌ No JSON files found in {synthea_dir}")
        return
    
    avg_size_per_patient = total_size / patient_count
    # Estimate size for 150 patients
    estimated_150 = (avg_size_per_patient * 150) / 1024 / 1024
    
    print(f"\n📊 Synthea Data Analysis ({synthea_dir})")
    print(f"{'='*60}")
    print(f"Total Patients Found: {patient_count}")
    print(f"Total Size: {total_size / 1024 / 1024:.2f} MB")
    print(f"Avg Size per Patient: {avg_size_per_patient / 1024:.2f} KB")
    print(f"Estimated 150 Patients: {estimated_150:.2f} MB")
    print(f"{'='*60}")
    
    # Supabase free tier is 500 MB
    LIMIT_MB = 500
    SAFE_LIMIT_MB = 400 # Leave 100 MB for audit logs and other tables
    
    if estimated_150 < SAFE_LIMIT_MB:
        print(f"✅ SAFE: Well within {LIMIT_MB} MB Supabase limit.")
        print(f"   Remaining space: {LIMIT_MB - estimated_150:.2f} MB for audit logs.")
    else:
        print(f"⚠️ WARNING: Estimated size ({estimated_150:.2f} MB) is close to the {LIMIT_MB} MB limit.")
        print("   Action: Consider reducing patient count or stripping non-essential FHIR fields.")

if __name__ == "__main__":
    calculate_synthea_size()
