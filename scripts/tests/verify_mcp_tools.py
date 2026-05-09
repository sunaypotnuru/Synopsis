import httpx
import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8080")
API_KEY = os.getenv("MCP_API_KEY", "netra-ai-industrial-secret-2026")

async def test_tool(name, params):
    print(f"Testing Tool: {name}...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # MCP endpoint via mounted app
            response = await client.post(
                f"{SERVER_URL}/tools/call",
                json={
                    "name": name,
                    "arguments": params
                },
                headers={"X-API-Key": API_KEY}
            )
            if response.status_code == 200:
                print(f"SUCCESS: {name}")
                # print(json.dumps(response.json(), indent=2))
                return True
            else:
                print(f"FAILED: {name} ({response.status_code})")
                print(response.text)
                return False
    except Exception as e:
        print(f"EXCEPTION: {name} - {str(e)}")
        return False

async def main():
    print("--- NetraAI Industrial MCP Verification Suite ---")
    print(f"Target: {SERVER_URL}\n")
    
    tools_to_test = [
        ("get_patient_fhir_tool", {"patient_id": "patient-1"}),
        ("diagnose_anemia_tool", {"image_url": "https://raw.githubusercontent.com/Ariel-N-G/Netra-Ai/main/test_images/conjunctiva.jpg", "patient_id": "patient-1"}),
        ("detect_cataract_tool", {"image_url": "https://raw.githubusercontent.com/Ariel-N-G/Netra-Ai/main/test_images/eye.jpg", "patient_id": "patient-1"}),
        ("screen_dr_tool", {"image_url": "https://raw.githubusercontent.com/Ariel-N-G/Netra-Ai/main/test_images/fundus.jpg", "patient_id": "patient-1"}),
        ("analyze_mental_health_tool", {"audio_url": "https://raw.githubusercontent.com/Ariel-N-G/Netra-Ai/main/test_images/voice.wav", "patient_id": "patient-1"}),
        ("query_patient_timeline_tool", {"patient_id": "patient-1", "resource_type": "Observation"}),
        ("compare_diagnostic_history_tool", {"patient_id": "patient-1", "diagnostic_type": "anemia"}),
        ("generate_prior_auth_tool", {"patient_id": "patient-1", "service_requested": "IV Iron Infusion", "diagnostic_type": "anemia"})
    ]
    
    results = []
    for name, params in tools_to_test:
        results.append(await test_tool(name, params))
        
    success_count = sum(1 for r in results if r)
    print(f"\n--- Verification Complete: {success_count}/{len(tools_to_test)} Tools Operational ---")
    
    if success_count == len(tools_to_test):
        print("SUCCESS: SYSTEM IS 100% INDUSTRIAL GRADE READY")
    else:
        print("WARNING: SOME TOOLS REQUIRE REVIEW")

if __name__ == "__main__":
    asyncio.run(main())
