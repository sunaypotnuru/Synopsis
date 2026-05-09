#!/usr/bin/env python3
"""
NetraAI A2A Agent Test Client
============================

Test client to verify the A2A agent functionality for prior authorization automation.

Usage:
    python test_client.py

Author: NetraAI Team
Date: May 6, 2026
"""

import asyncio
import json
import httpx
from datetime import datetime

class A2ATestClient:
    """Simple A2A test client for NetraAI Prior Auth Agent"""
    
    def __init__(self, agent_url: str = "http://localhost:8081"):
        self.agent_url = agent_url
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_agent_card(self):
        """Get the agent card to verify agent is running"""
        try:
            response = await self.client.get(f"{self.agent_url}/.well-known/agent-card.json")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get agent card: {e}")
            return None
    
    async def test_prior_auth_automation(self):
        """Test the prior authorization automation skill"""
        print("\n🔬 Testing Prior Authorization Automation...")
        
        task_data = {
            "skill_id": "prior_authorization_automation",
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "application/json",
                            "data": {
                                "patient_id": "synthetic-patient-001",
                                "service_requested": "diabetic_retinopathy_screening",
                                "payer": "Medicare"
                            }
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ Prior Authorization Automation Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            if 'prior_authorization' in result:
                pa = result['prior_authorization']
                print(f"   Patient ID: {pa.get('patient_id')}")
                print(f"   Service: {pa.get('service_requested')}")
                print(f"   Time Reduction: {pa.get('estimated_processing_time_reduction')}")
                print(f"   Cost Savings: {pa.get('estimated_cost_savings')}")
            
            return result
            
        except Exception as e:
            print(f"❌ Prior Authorization Test Failed: {e}")
            return None
    
    async def test_clinical_evidence_extraction(self):
        """Test clinical evidence extraction skill"""
        print("\n🧪 Testing Clinical Evidence Extraction...")
        
        task_data = {
            "skill_id": "clinical_evidence_extraction",
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "application/json",
                            "data": {
                                "patient_id": "synthetic-patient-002",
                                "diagnostic_type": "anemia",
                                "image_url": "https://example.com/sample-conjunctiva.jpg"
                            }
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ Clinical Evidence Extraction Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            if 'clinical_evidence' in result:
                evidence = result['clinical_evidence']
                print(f"   Diagnostic Type: {evidence.get('diagnostic_type')}")
                print(f"   Finding: {evidence.get('finding')}")
                print(f"   Severity: {evidence.get('severity')}")
            
            return result
            
        except Exception as e:
            print(f"❌ Clinical Evidence Extraction Test Failed: {e}")
            return None
    
    async def test_payer_requirements_matching(self):
        """Test payer requirements matching skill"""
        print("\n💰 Testing Payer Requirements Matching...")
        
        task_data = {
            "skill_id": "payer_requirements_matching",
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "application/json",
                            "data": {
                                "payer": "Medicare",
                                "service": "diabetic_retinopathy_screening",
                                "clinical_data": {
                                    "diabetes_diagnosis_required": True,
                                    "last_screening_interval_months": 18
                                }
                            }
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ Payer Requirements Matching Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Payer: {result.get('payer')}")
            print(f"   Service: {result.get('service')}")
            print(f"   Approval Likelihood: {result.get('approval_likelihood', 0):.1%}")
            
            return result
            
        except Exception as e:
            print(f"❌ Payer Requirements Matching Test Failed: {e}")
            return None
    
    async def test_multi_diagnostic_coordination(self):
        """Test multi-diagnostic coordination skill"""
        print("\n🔄 Testing Multi-Diagnostic Coordination...")
        
        task_data = {
            "skill_id": "multi_diagnostic_coordination",
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "application/json",
                            "data": {
                                "patient_id": "synthetic-patient-003",
                                "chief_complaint": "comprehensive_screening",
                                "input_data": {
                                    "age": 65,
                                    "diabetes": True,
                                    "family_history_eye_disease": True
                                }
                            }
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ Multi-Diagnostic Coordination Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            if 'coordination_result' in result:
                coord = result['coordination_result']
                print(f"   Workflow: {coord.get('workflow_type', 'unknown')}")
                print(f"   Tools Used: {len(coord.get('diagnostic_results', []))}")
            
            return result
            
        except Exception as e:
            print(f"❌ Multi-Diagnostic Coordination Test Failed: {e}")
            return None
    
    async def test_fhir_integration(self):
        """Test FHIR integration skill"""
        print("\n🏥 Testing FHIR Integration...")
        
        task_data = {
            "skill_id": "fhir_integration",
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "application/json",
                            "data": {
                                "operation": "get_patient",
                                "patient_id": "synthetic-patient-004"
                            }
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ FHIR Integration Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            if 'fhir_result' in result:
                fhir = result['fhir_result']
                print(f"   Resource Type: {fhir.get('resourceType', 'unknown')}")
                print(f"   Patient ID: {fhir.get('id', 'unknown')}")
            
            return result
            
        except Exception as e:
            print(f"❌ FHIR Integration Test Failed: {e}")
            return None
    
    async def test_general_query(self):
        """Test general query handling"""
        print("\n❓ Testing General Query...")
        
        task_data = {
            "messages": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": "What can you do to help with prior authorization?"
                        }
                    ]
                }
            ]
        }
        
        try:
            response = await self.client.post(
                f"{self.agent_url}/api/v1/tasks",
                json=task_data
            )
            response.raise_for_status()
            result = response.json()
            
            print("✅ General Query Test Passed")
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Message: {result.get('message', 'No message')}")
            if 'capabilities' in result:
                print(f"   Capabilities: {len(result['capabilities'])} listed")
            
            return result
            
        except Exception as e:
            print(f"❌ General Query Test Failed: {e}")
            return None
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting NetraAI A2A Agent Tests")
        print("=" * 50)
        
        # Check if agent is running
        print("\n🔍 Checking Agent Status...")
        agent_card = await self.get_agent_card()
        if not agent_card:
            print("❌ Agent is not running or not accessible")
            return False
        
        print("✅ Agent is running")
        print(f"   Name: {agent_card.get('name', 'Unknown')}")
        print(f"   Version: {agent_card.get('version', 'Unknown')}")
        print(f"   Skills: {len(agent_card.get('skills', []))}")
        
        # Run all skill tests
        tests = [
            self.test_prior_auth_automation,
            self.test_clinical_evidence_extraction,
            self.test_payer_requirements_matching,
            self.test_multi_diagnostic_coordination,
            self.test_fhir_integration,
            self.test_general_query
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            result = await test()
            if result and result.get('status') == 'success':
                passed += 1
        
        print("\n" + "=" * 50)
        print(f"🎯 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! A2A Agent is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the logs above.")
        
        return passed == total
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()


async def main():
    """Main test runner"""
    client = A2ATestClient()
    
    try:
        success = await client.run_all_tests()
        exit_code = 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        exit_code = 130
    except Exception as e:
        print(f"\n💥 Test runner failed: {e}")
        exit_code = 1
    finally:
        await client.cleanup()
    
    exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())