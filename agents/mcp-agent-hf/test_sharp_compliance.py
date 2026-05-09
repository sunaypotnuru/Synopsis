#!/usr/bin/env python3
"""
SHARP-on-MCP Compliance Test Suite
Tests all SHARP-on-MCP requirements for Agents Assemble Hackathon
"""

import os
import sys
import json
import httpx
from typing import Dict, Any
from datetime import datetime

# Configuration
BASE_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
API_KEY = os.getenv("MCP_API_KEY", "test-api-key-12345")
FHIR_SERVER = "https://hapi.fhir.org/baseR4"
PATIENT_ID = "example"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(text: str):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{text}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_test(name: str):
    print(f"\n{Colors.YELLOW}Test: {name}{Colors.RESET}")
    print("-" * 60)

def print_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

async def test_agent_card_discovery() -> bool:
    """Test 1: Agent Card Discovery"""
    print_test("Agent Card Discovery")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BASE_URL}/.well-known/agent-card.json")
            response.raise_for_status()
            card = response.json()
            
            if "name" in card and "version" in card:
                print_success(f"Agent card accessible at /.well-known/agent-card.json")
                print(f"   Name: {card['name']}")
                print(f"   Version: {card['version']}")
                print(f"   Publisher: {card.get('publisher', 'N/A')}")
                return True
            else:
                print_error("Agent card missing required fields")
                return False
    except Exception as e:
        print_error(f"Failed to fetch agent card: {e}")
        return False

async def test_skills_array(card: Dict[str, Any]) -> bool:
    """Test 2: Skills Array with Keywords"""
    print_test("Skills Array with Keywords")
    
    skills = card.get("skills", [])
    if len(skills) >= 5:
        print_success(f"Agent card has {len(skills)} skills")
        for skill in skills:
            keywords = ", ".join(skill.get("keywords", [])[:5])
            print(f"   - {skill['name']}: {keywords}...")
        return True
    else:
        print_error(f"Insufficient skills (found: {len(skills)}, expected: ≥5)")
        return False

async def test_fhir_capabilities(card: Dict[str, Any]) -> bool:
    """Test 3: FHIR Capabilities Declaration"""
    print_test("FHIR Capabilities Declaration")
    
    capabilities = card.get("capabilities", {})
    supports_fhir = capabilities.get("supportsFHIRContext", False)
    supports_sharp = capabilities.get("supportsSHARP", False)
    
    if supports_fhir and supports_sharp:
        print_success("FHIR context support declared")
        print(f"   supportsFHIRContext: {supports_fhir}")
        print(f"   supportsSHARP: {supports_sharp}")
        
        # Check FHIR versions
        fhir_versions = capabilities.get("supportedFHIRVersions", [])
        print(f"   FHIR Versions: {', '.join(fhir_versions)}")
        
        # Check FHIR resources
        fhir_resources = capabilities.get("supportedFHIRResources", [])
        print(f"   FHIR Resources: {', '.join(fhir_resources[:5])}...")
        
        return True
    else:
        print_error("FHIR capabilities not properly declared")
        return False

async def test_fhir_scopes(card: Dict[str, Any]) -> bool:
    """Test 4: FHIR Scopes Declaration"""
    print_test("FHIR Scopes Declaration")
    
    capabilities = card.get("capabilities", {})
    scopes = capabilities.get("fhirScopes", [])
    
    if len(scopes) >= 3:
        print_success(f"FHIR scopes declared ({len(scopes)} scopes)")
        for scope in scopes:
            print(f"   - {scope}")
        return True
    else:
        print_error(f"Insufficient FHIR scopes (found: {len(scopes)}, expected: ≥3)")
        return False

async def test_experimental_capabilities(card: Dict[str, Any]) -> bool:
    """Test 5: Experimental SHARP Capability"""
    print_test("Experimental SHARP Capability")
    
    capabilities = card.get("capabilities", {})
    experimental = capabilities.get("experimental", {})
    sharp_capability = experimental.get("ai.promptopinion/fhir-context", {})
    
    if sharp_capability.get("value") == True:
        print_success("SHARP-on-MCP capability advertised")
        print(f"   ai.promptopinion/fhir-context: {sharp_capability.get('value')}")
        print(f"   Description: {sharp_capability.get('description', 'N/A')}")
        return True
    else:
        print_warning("SHARP capability not in experimental section (may need POFastMCP)")
        return False

async def test_supported_interfaces(card: Dict[str, Any]) -> bool:
    """Test 6: Supported Interfaces"""
    print_test("Supported Interfaces")
    
    interfaces = card.get("supportedInterfaces", [])
    
    if len(interfaces) >= 3:
        print_success(f"Multiple interfaces supported ({len(interfaces)})")
        for interface in interfaces:
            print(f"   - {interface['type']}: {interface['url']}")
        return True
    else:
        print_error(f"Insufficient interfaces (found: {len(interfaces)}, expected: ≥3)")
        return False

async def test_health_check() -> bool:
    """Test 7: Health Check Endpoint"""
    print_test("Health Check Endpoint")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BASE_URL}/health")
            response.raise_for_status()
            health = response.json()
            
            if "status" in health:
                print_success("Health check endpoint working")
                print(f"   Status: {health['status']}")
                print(f"   Service: {health.get('service', 'N/A')}")
                print(f"   Timestamp: {health.get('timestamp', 'N/A')}")
                return True
            else:
                print_error("Health check missing status field")
                return False
    except Exception as e:
        print_error(f"Health check failed: {e}")
        return False

async def test_sharp_chat_completions() -> bool:
    """Test 8: SHARP Context in Chat Completions"""
    print_test("SHARP Context in Chat Completions")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BASE_URL}/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                    "X-FHIR-Server-URL": FHIR_SERVER,
                    "X-Patient-ID": PATIENT_ID
                },
                json={
                    "messages": [
                        {"role": "user", "content": "Check for fatigue"}
                    ]
                }
            )
            response.raise_for_status()
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                print_success("Chat completions endpoint accepts SHARP headers")
                print("   Response preview:")
                preview = content.split('\n')[:5]
                for line in preview:
                    print(f"   {line}")
                return True
            else:
                print_error("Chat completions response invalid")
                return False
    except Exception as e:
        print_error(f"Chat completions failed: {e}")
        return False

async def test_sharp_json_rpc() -> bool:
    """Test 9: SHARP Context in JSON-RPC"""
    print_test("SHARP Context in JSON-RPC")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{BASE_URL}/rpc",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": API_KEY,
                    "X-FHIR-Server-URL": FHIR_SERVER,
                    "X-Patient-ID": PATIENT_ID
                },
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "agent.interact",
                    "params": {
                        "message": "Screen for vision problems",
                        "metadata": {
                            "https://app.promptopinion.ai/schemas/a2a/v1/fhir-context": {
                                "fhirUrl": FHIR_SERVER,
                                "patientId": PATIENT_ID
                            }
                        }
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            
            if "result" in result and "message" in result["result"]:
                print_success("JSON-RPC endpoint accepts SHARP context")
                metadata = result["result"].get("metadata", {})
                print(f"   FHIR context used: {metadata.get('fhir_context_used', False)}")
                print(f"   Workflow: {metadata.get('workflow', 'N/A')}")
                print("   Response preview:")
                message = result["result"]["message"]
                preview = message.split('\n')[:5]
                for line in preview:
                    print(f"   {line}")
                return True
            else:
                print_error("JSON-RPC response invalid")
                return False
    except Exception as e:
        print_error(f"JSON-RPC failed: {e}")
        return False

async def test_alternative_card_endpoint() -> bool:
    """Test 10: Alternative Agent Card Endpoint"""
    print_test("Alternative Agent Card Endpoint")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BASE_URL}/v1/card")
            response.raise_for_status()
            card = response.json()
            
            if "name" in card:
                print_success("Agent card also accessible at /v1/card")
                return True
            else:
                print_warning("/v1/card endpoint not working (optional)")
                return False
    except Exception as e:
        print_warning(f"/v1/card endpoint not working (optional): {e}")
        return False

async def main():
    print_header("🧪 SHARP-on-MCP Compliance Test Suite")
    
    print(f"📋 Test Configuration:")
    print(f"  Base URL: {BASE_URL}")
    print(f"  FHIR Server: {FHIR_SERVER}")
    print(f"  Patient ID: {PATIENT_ID}")
    
    results = []
    
    # Test 1: Agent Card Discovery
    card = None
    result = await test_agent_card_discovery()
    results.append(("Agent Card Discovery", result, True))
    
    if result:
        # Fetch card for subsequent tests
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BASE_URL}/.well-known/agent-card.json")
            card = response.json()
        
        # Test 2-6: Card validation tests
        results.append(("Skills Array", await test_skills_array(card), True))
        results.append(("FHIR Capabilities", await test_fhir_capabilities(card), True))
        results.append(("FHIR Scopes", await test_fhir_scopes(card), True))
        results.append(("Experimental Capabilities", await test_experimental_capabilities(card), False))
        results.append(("Supported Interfaces", await test_supported_interfaces(card), True))
    
    # Test 7-10: Runtime tests
    results.append(("Health Check", await test_health_check(), True))
    results.append(("SHARP Chat Completions", await test_sharp_chat_completions(), True))
    results.append(("SHARP JSON-RPC", await test_sharp_json_rpc(), True))
    results.append(("Alternative Card Endpoint", await test_alternative_card_endpoint(), False))
    
    # Summary
    print_header("📊 Test Summary")
    
    critical_passed = sum(1 for name, passed, critical in results if passed and critical)
    critical_total = sum(1 for name, passed, critical in results if critical)
    optional_passed = sum(1 for name, passed, critical in results if passed and not critical)
    optional_total = sum(1 for name, passed, critical in results if not critical)
    
    print(f"Critical Tests: {critical_passed}/{critical_total} passed")
    print(f"Optional Tests: {optional_passed}/{optional_total} passed")
    print(f"Total: {critical_passed + optional_passed}/{len(results)} passed")
    print()
    
    for name, passed, critical in results:
        status = "✅" if passed else ("❌" if critical else "⚠️ ")
        test_type = "CRITICAL" if critical else "OPTIONAL"
        print(f"{status} {name} ({test_type})")
    
    print()
    
    if critical_passed == critical_total:
        print_success("🎉 All critical tests passed!")
        print()
        print("Next Steps:")
        print("1. Test with Docker: cd docker && docker-compose up mcp-server")
        print("2. Deploy to Render for public URL")
        print("3. Register on Prompt Opinion marketplace")
        print("4. Create demo video")
        print("5. Submit to Devpost")
        return 0
    else:
        print_error(f"❌ {critical_total - critical_passed} critical test(s) failed")
        return 1

if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))
