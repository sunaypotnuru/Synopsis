import httpx
import os
import json
from supabase import create_client
from dotenv import load_dotenv

# 💎 DIAMOND-GRADE: PHI Scrubbing Verifier

load_dotenv()

SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8080")
API_KEY = os.getenv("MCP_API_KEY", "netra-ai-industrial-secret-2026")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

async def verify_scrubbing():
    print("--- Starting PHI Scrubbing Verification ---")
    
    # 1. Trigger a tool call with sensitive-looking data in a result
    # We'll use get_patient_fhir_tool which returns a Patient resource with names/addresses
    print("Calling get_patient_fhir_tool for patient-1...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SERVER_URL}/tools/call",
            json={
                "name": "get_patient_fhir_tool",
                "arguments": {"patient_id": "patient-1"}
            },
            headers={"X-API-Key": API_KEY}
        )
        
        if response.status_code != 200:
            print(f"FAILED: Tool call failed with {response.status_code}")
            return
            
        print(f"Tool Result: {response.text[:200]}...")
            
    print("Tool call successful. Checking audit logs...")
    
    # 2. Query the latest audit log entry for this tool call
    import time
    time.sleep(2) # Wait for async background logging to finish
    
    logs = supabase.table("audit_logs")\
        .select("*")\
        .eq("table_name", "get_patient_fhir_tool")\
        .order("timestamp", desc=True)\
        .limit(1)\
        .execute().data
        
    if not logs:
        print("FAILED: No audit log found for get_patient_fhir")
        return
        
    log = logs[0]
    output_data = log.get("output_data", {})
    
    # 3. Assert PHI fields are redacted
    # The output of get_patient_fhir contains a Patient resource
    # Check for 'name' and 'address' in the data
    
    # In our AuditLogger, 'name' and 'address' are in phi_keywords
    issues = []
    
    # Check if 'name' is redacted
    if "name" in output_data:
        if output_data["name"] != "[REDACTED]":
            issues.append(f"Name not redacted: {output_data['name']}")
    
    # Check if 'address' is redacted
    if "address" in output_data:
        if output_data["address"] != "[REDACTED]":
            issues.append(f"Address not redacted")
            
    if issues:
        for issue in issues:
            print(f"FAILED: {issue}")
    else:
        print("SUCCESS: PHI fields correctly redacted in audit logs!")
        # print(json.dumps(output_data, indent=2))

if __name__ == "__main__":
    import asyncio
    asyncio.run(verify_scrubbing())
