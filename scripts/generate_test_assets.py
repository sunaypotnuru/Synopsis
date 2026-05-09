import json
import os
import base64

def generate_test_assets():
    """Generates sample datasets and dummy images for NetraAI platform verification."""
    
    base_dir = "backend/test_data"
    os.makedirs(base_dir, exist_ok=True)
    os.makedirs(os.path.join(base_dir, "images"), exist_ok=True)
    
    # 1. Generate Sample Patient Data (JSON)
    patient_data = {
        "id": "test-patient-001",
        "name": "Jane Doe",
        "age": 28,
        "vitals": {
            "heart_rate": 72,
            "blood_pressure": "120/80",
            "temperature": 98.6
        },
        "history": [
            {"date": "2024-01-15", "condition": "Mild Anemia", "status": "Recovered"}
        ]
    }
    
    with open(os.path.join(base_dir, "sample_patient.json"), "w") as f:
        json.dump(patient_data, f, indent=4)
    
    # 2. Generate Dummy Eye Image (1x1 transparent PNG as base64)
    # This is useful for testing upload routes without requiring a real image.
    dummy_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    dummy_png_data = base64.b64decode(dummy_png_b64)
    
    with open(os.path.join(base_dir, "images", "dummy_eye.png"), "wb") as f:
        f.write(dummy_png_data)
        
    # 3. Generate ML Inference Mock Request
    inference_request = {
        "model": "anemia-v1",
        "image_path": "images/dummy_eye.png",
        "metadata": {
            "device": "iPhone 13",
            "lighting": "Natural"
        }
    }
    
    with open(os.path.join(base_dir, "test_inference_request.json"), "w") as f:
        json.dump(inference_request, f, indent=4)

    print(f"DONE: Test assets generated successfully in {base_dir}")

if __name__ == "__main__":
    generate_test_assets()
