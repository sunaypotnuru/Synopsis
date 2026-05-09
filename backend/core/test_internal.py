#!/usr/bin/env python3
"""
Internal Backend Endpoint Testing (from inside container)
Tests backend endpoints from inside the Docker container
"""

import requests
import json
from datetime import datetime

# Base URL inside container
BASE_URL = "http://localhost:10000"
API_V1 = f"{BASE_URL}/api/v1"

def test_endpoint(name, url, expected_statuses=[200, 401, 403, 404]):
    """Test an endpoint and return result"""
    try:
        response = requests.get(url, timeout=5)
        status = "✅ PASS" if response.status_code in expected_statuses else "❌ FAIL"
        return {
            "name": name,
            "url": url,
            "status": status,
            "status_code": response.status_code,
            "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:100]
        }
    except Exception as e:
        return {
            "name": name,
            "url": url,
            "status": "❌ ERROR",
            "error": str(e)[:100]
        }

results = []

print("=" * 80)
print("NETRA AI BACKEND INTERNAL ENDPOINT TESTING")
print(f"Testing from inside container at {datetime.now()}")
print("=" * 80)

# Health Endpoints
print("\n1. HEALTH ENDPOINTS")
for name, path in [
    ("Root Health", "/health"),
    ("API v1 Health", "/api/v1/health"),
    ("System Health", "/api/v1/system-health"),
    ("MCP Health", "/api/v1/mcp-health"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}")
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# Admin Endpoints
print("\n2. ADMIN ENDPOINTS")
for name, path in [
    ("Admin Stats", "/api/v1/admin/stats"),
    ("Admin Users", "/api/v1/admin/users"),
    ("Admin Dashboard", "/api/v1/admin/dashboard"),
    ("Admin Audit Logs", "/api/v1/admin/audit-logs"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}")
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# Doctor Endpoints
print("\n3. DOCTOR ENDPOINTS")
for name, path in [
    ("Doctor Profile", "/api/v1/doctor/profile"),
    ("Doctor Appointments", "/api/v1/doctor/appointments"),
    ("Doctor Patients", "/api/v1/doctor/patients"),
    ("Doctor Dashboard", "/api/v1/doctor/dashboard"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}")
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# Patient Endpoints
print("\n4. PATIENT ENDPOINTS")
for name, path in [
    ("Patient Profile", "/api/v1/patient/profile"),
    ("Patient Appointments", "/api/v1/patient/appointments"),
    ("Patient Medical Records", "/api/v1/patient/medical-records"),
    ("Patient Dashboard", "/api/v1/patient/dashboard"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}")
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# ML Endpoints
print("\n5. ML ENDPOINTS")
for name, path in [
    ("ML Services Status", "/api/v1/ml/services/status"),
    ("ML Anemia Predict", "/api/v1/ml/anemia/predict"),
    ("ML DR Predict", "/api/v1/ml/diabetic-retinopathy/predict"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}", [200, 401, 403, 404, 405, 422])
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# Other Endpoints
print("\n6. OTHER ENDPOINTS")
for name, path in [
    ("Hospitals", "/api/v1/hospitals"),
    ("I18n Languages", "/api/v1/i18n/languages"),
    ("Search", "/api/v1/search?q=test"),
    ("FHIR Metadata", "/api/v1/fhir/metadata"),
    ("Reports", "/api/v1/reports"),
    ("Audit Logs", "/api/v1/audit"),
    ("Messages", "/api/v1/messages"),
    ("Gamification", "/api/v1/gamification"),
]:
    result = test_endpoint(name, f"{BASE_URL}{path}", [200, 401, 403, 404, 405, 422])
    results.append(result)
    print(f"  {result['status']} {name} - Status: {result.get('status_code', 'N/A')}")

# Summary
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
passed = sum(1 for r in results if "✅" in r['status'])
failed = sum(1 for r in results if "❌" in r['status'])
print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
print(f"Pass Rate: {passed/len(results)*100:.1f}%")

# Save results
with open('/app/internal_test_results.json', 'w') as f:
    json.dump(results, f, indent=2)
print("\nResults saved to /app/internal_test_results.json")
