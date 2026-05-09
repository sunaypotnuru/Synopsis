import json
import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path

# Clinical Constants
ANEMIA_CODE = "5902-2"
CATARACT_CODE = "79893-4"
DR_CODE = "79888-4"
MENTAL_HEALTH_CODE = "89204-2"
PARKINSONS_CODE = "49551-5"

def generate_patient(i):
    patient_id = f"patient-{i}"
    gender = random.choice(["male", "female"])
    birth_date = (datetime.now() - timedelta(days=random.randint(18*365, 80*365))).strftime("%Y-%m-%d")
    
    return {
        "resourceType": "Patient",
        "id": patient_id,
        "name": [{"given": [f"Patient_{i}"], "family": "Synthea"}],
        "gender": gender,
        "birthDate": birth_date,
        "address": [{"city": "Boston", "state": "MA", "country": "US"}]
    }

def generate_observation(patient_id, code, value_type="quantity"):
    obs_id = str(uuid.uuid4())
    date = (datetime.now() - timedelta(days=random.randint(0, 365))).isoformat()
    
    obs = {
        "resourceType": "Observation",
        "id": obs_id,
        "status": "final",
        "code": {"coding": [{"system": "http://loinc.org", "code": code}]},
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": date
    }
    
    if value_type == "quantity":
        obs["valueQuantity"] = {
            "value": round(random.uniform(8.0, 16.0), 1),
            "unit": "g/dL",
            "system": "http://unitsofmeasure.org",
            "code": "g/dL"
        }
    
    return obs

def generate_bundle(i):
    patient = generate_patient(i)
    pid = patient["id"]
    
    entries = [{"resource": patient}]
    
    # Generate 5-10 observations per patient
    for _ in range(random.randint(5, 10)):
        code = random.choice([ANEMIA_CODE, CATARACT_CODE, DR_CODE, MENTAL_HEALTH_CODE, PARKINSONS_CODE])
        entries.append({"resource": generate_observation(pid, code)})
        
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": entries
    }

def main():
    output_dir = Path("data/synthea/output/fhir")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating 150 mock FHIR bundles in {output_dir}...")
    
    for i in range(1, 151):
        bundle = generate_bundle(i)
        file_path = output_dir / f"patient_{i}.json"
        file_path.write_text(json.dumps(bundle, indent=2))
        
        if i % 50 == 0:
            print(f"Generated {i} patients...")

    print(f"Done! 150 patients ready for industrial testing.")

if __name__ == "__main__":
    main()
