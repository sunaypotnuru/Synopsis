"""
Security Hardening Test Suite

Tests all Phase 3 security fixes (S1-S7, O4, S6)
"""

import os
import sys
import httpx
import pytest
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
VALID_API_KEY = os.getenv("MCP_API_KEY", "test-api-key")


def test_s1_no_api_key_returns_401():
    """S1: Verify 401 without API key (no hardcoded fallback)"""
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={"name": "health_check_tool", "arguments": {}},
        timeout=10.0
    )
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    assert "error" in response.json()


def test_s1_wrong_api_key_returns_401():
    """S1: Verify 401 with wrong API key"""
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={"name": "health_check_tool", "arguments": {}},
        headers={"X-API-Key": "wrong-key-12345"},
        timeout=10.0
    )
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"


def test_s1_hardcoded_key_not_accepted():
    """S1: Verify old hardcoded key no longer works"""
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={"name": "health_check_tool", "arguments": {}},
        headers={"X-API-Key": "netra-ai-industrial-secret-2026"},
        timeout=10.0
    )
    # Should fail unless this is actually the configured key
    if VALID_API_KEY != "netra-ai-industrial-secret-2026":
        assert response.status_code == 401


def test_s4_s5_error_no_stack_trace():
    """S4+S5: Verify error responses don't contain stack traces"""
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={"name": "invalid_tool_that_does_not_exist", "arguments": {}},
        headers={"X-API-Key": VALID_API_KEY},
        timeout=10.0
    )
    response_text = response.text.lower()
    
    # Should not contain stack trace indicators
    assert "traceback" not in response_text, "Response contains 'Traceback'"
    assert 'file "' not in response_text, "Response contains file paths"
    assert "line " not in response_text or "line" in response.json().get("error", ""), "Response contains line numbers"
    
    # Should contain generic error message
    assert "error" in response.json()


def test_s2_cors_headers_present():
    """S2: Verify CORS headers in responses"""
    response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
    
    # Check for CORS headers (case-insensitive)
    headers_lower = {k.lower(): v for k, v in response.headers.items()}
    assert "access-control-allow-origin" in headers_lower, "Missing CORS allow-origin header"


def test_s6_security_headers_present():
    """S6: Verify security headers in responses"""
    response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
    
    headers_lower = {k.lower(): v for k, v in response.headers.items()}
    
    # Check required security headers
    assert headers_lower.get("x-content-type-options") == "nosniff", "Missing or incorrect X-Content-Type-Options"
    assert headers_lower.get("x-frame-options") == "DENY", "Missing or incorrect X-Frame-Options"
    assert "strict-transport-security" in headers_lower, "Missing Strict-Transport-Security"


def test_o4_request_id_present():
    """O4: Verify X-Request-ID header in responses"""
    response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
    
    headers_lower = {k.lower(): v for k, v in response.headers.items()}
    assert "x-request-id" in headers_lower, "Missing X-Request-ID header"
    
    # Verify it's a valid UUID format (basic check)
    request_id = headers_lower["x-request-id"]
    assert len(request_id) > 20, "X-Request-ID seems too short"


def test_s3_rate_limiting():
    """S3: Verify rate limiting triggers after threshold"""
    # Note: This test may fail if rate limit is high or if running in parallel
    # Make 31 requests quickly (limit is 30/min by default)
    
    responses = []
    for i in range(31):
        response = httpx.post(
            f"{BASE_URL}/tools/call",
            json={"name": "health_check_tool", "arguments": {}},
            headers={"X-API-Key": VALID_API_KEY},
            timeout=10.0
        )
        responses.append(response.status_code)
    
    # At least one should be rate limited (429)
    assert 429 in responses, f"Rate limiting not triggered. Status codes: {set(responses)}"


def test_s7_invalid_patient_id_rejected():
    """S7: Verify invalid patient_id is rejected"""
    # Test SQL injection attempt
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={
            "name": "get_patient_fhir_tool",
            "arguments": {"patient_id": "'; DROP TABLE patients; --"}
        },
        headers={"X-API-Key": VALID_API_KEY},
        timeout=10.0
    )
    assert response.status_code == 400, f"Expected 400 for invalid patient_id, got {response.status_code}"
    assert "invalid" in response.json().get("error", "").lower()


def test_s7_valid_patient_id_accepted():
    """S7: Verify valid patient_id is accepted"""
    response = httpx.post(
        f"{BASE_URL}/tools/call",
        json={
            "name": "get_patient_fhir_tool",
            "arguments": {"patient_id": "patient-123"}
        },
        headers={"X-API-Key": VALID_API_KEY},
        timeout=10.0
    )
    # Should not be rejected for invalid format (may fail for other reasons like patient not found)
    assert response.status_code != 400 or "invalid" not in response.json().get("error", "").lower()


def test_health_endpoint_exempt_from_rate_limit():
    """S3: Verify /health endpoint is exempt from rate limiting"""
    # Make many requests to /health
    for i in range(50):
        response = httpx.get(f"{BASE_URL}/health", timeout=10.0)
        assert response.status_code == 200, f"Health endpoint failed on request {i+1}"


if __name__ == "__main__":
    print("Running Security Hardening Tests...")
    print(f"Testing server at: {BASE_URL}")
    print(f"Using API key: {VALID_API_KEY[:10]}...")
    print()
    
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
