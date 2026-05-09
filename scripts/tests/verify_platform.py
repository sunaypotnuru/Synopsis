#!/usr/bin/env python3
"""
Comprehensive Service Testing Script
Tests all Netra AI services for hackathon readiness
"""

import requests
import time
from typing import Dict
import sys

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class ServiceTester:
    def __init__(self):
        self.results = []
        self.services = {
            'backend': 'http://localhost:8000',
            'frontend': 'http://localhost:3000',
            'anemia': 'http://localhost:8001',
            'dr': 'http://localhost:8002',
            'mental-health': 'http://localhost:8003',
            'parkinsons': 'http://localhost:8004',
            'cataract': 'http://localhost:8005',
        }
    
    def print_header(self, text: str):
        """Print formatted header"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}{text.center(60)}{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")
    
    def print_success(self, text: str):
        """Print success message"""
        print(f"{GREEN}✓ {text}{RESET}")
    
    def print_error(self, text: str):
        """Print error message"""
        print(f"{RED}✗ {text}{RESET}")
    
    def print_warning(self, text: str):
        """Print warning message"""
        print(f"{YELLOW}⚠ {text}{RESET}")
    
    def test_health_endpoint(self, service_name: str, url: str) -> bool:
        """Test service health endpoint"""
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                self.print_success(f"{service_name}: Health check passed")
                return True
            else:
                self.print_error(f"{service_name}: Health check failed (Status: {response.status_code})")
                return False
        except requests.exceptions.ConnectionError:
            self.print_error(f"{service_name}: Connection refused (Service not running?)")
            return False
        except requests.exceptions.Timeout:
            self.print_error(f"{service_name}: Request timeout")
            return False
        except Exception as e:
            self.print_error(f"{service_name}: {str(e)}")
            return False
    
    def test_root_endpoint(self, service_name: str, url: str) -> bool:
        """Test service root endpoint"""
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                self.print_success(f"{service_name}: Root endpoint accessible")
                return True
            else:
                self.print_warning(f"{service_name}: Root endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"{service_name}: Root endpoint failed - {str(e)}")
            return False
    
    def test_backend_endpoints(self) -> Dict[str, bool]:
        """Test critical backend endpoints"""
        results = {}
        base_url = self.services['backend']
        
        endpoints = [
            '/health',
            '/api/v1/health',
            '/docs',  # FastAPI docs
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    self.print_success(f"Backend{endpoint}: OK")
                    results[endpoint] = True
                else:
                    self.print_warning(f"Backend{endpoint}: Status {response.status_code}")
                    results[endpoint] = False
            except Exception as e:
                self.print_error(f"Backend{endpoint}: {str(e)}")
                results[endpoint] = False
        
        return results
    
    def test_ai_service_prediction(self, service_name: str, url: str, endpoint: str = "/predict") -> bool:
        """Test AI service prediction endpoint (without actual file)"""
        try:
            # Just check if the endpoint exists and returns proper error for missing file
            response = requests.post(f"{url}{endpoint}", timeout=5)
            # We expect 422 (validation error) or 400 (bad request) for missing file
            if response.status_code in [422, 400]:
                self.print_success(f"{service_name}: Prediction endpoint exists and validates input")
                return True
            elif response.status_code == 200:
                self.print_warning(f"{service_name}: Prediction endpoint returned 200 without input (unexpected)")
                return True
            else:
                self.print_warning(f"{service_name}: Prediction endpoint returned {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"{service_name}: Prediction test failed - {str(e)}")
            return False
    
    def test_frontend(self) -> bool:
        """Test frontend accessibility"""
        try:
            response = requests.get(self.services['frontend'], timeout=10)
            if response.status_code == 200:
                self.print_success("Frontend: Accessible")
                # Check if it's actually HTML
                if 'text/html' in response.headers.get('content-type', ''):
                    self.print_success("Frontend: Serving HTML content")
                    return True
                else:
                    self.print_warning("Frontend: Not serving HTML content")
                    return False
            else:
                self.print_error(f"Frontend: Status {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"Frontend: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all service tests"""
        self.print_header("NETRA AI SERVICE TESTING")
        
        print(f"{BLUE}Testing all services for hackathon readiness...{RESET}\n")
        
        # Test 1: Health checks
        self.print_header("1. HEALTH CHECKS")
        health_results = {}
        for service_name, url in self.services.items():
            if service_name == 'frontend':
                continue  # Frontend doesn't have /health
            health_results[service_name] = self.test_health_endpoint(service_name, url)
        
        # Test 2: Root endpoints
        self.print_header("2. ROOT ENDPOINTS")
        root_results = {}
        for service_name, url in self.services.items():
            root_results[service_name] = self.test_root_endpoint(service_name, url)
        
        # Test 3: Backend specific endpoints
        self.print_header("3. BACKEND ENDPOINTS")
        backend_results = self.test_backend_endpoints()
        
        # Test 4: AI service prediction endpoints
        self.print_header("4. AI SERVICE PREDICTION ENDPOINTS")
        prediction_results = {}
        ai_services = {
            'anemia': '/predict',
            'dr': '/predict',
            'mental-health': '/analyze',  # Mental Health uses /analyze
            'parkinsons': '/predict',
            'cataract': '/predict'
        }
        for service, endpoint in ai_services.items():
            prediction_results[service] = self.test_ai_service_prediction(
                service, 
                self.services[service],
                endpoint
            )
        
        # Test 5: Frontend
        self.print_header("5. FRONTEND")
        frontend_result = self.test_frontend()
        
        # Summary
        self.print_header("TEST SUMMARY")
        
        total_tests = (
            len(health_results) + 
            len(root_results) + 
            len(backend_results) + 
            len(prediction_results) + 
            1  # frontend
        )
        
        passed_tests = (
            sum(health_results.values()) + 
            sum(root_results.values()) + 
            sum(backend_results.values()) + 
            sum(prediction_results.values()) + 
            (1 if frontend_result else 0)
        )
        
        pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {GREEN}{passed_tests}{RESET}")
        print(f"Failed: {RED}{total_tests - passed_tests}{RESET}")
        print(f"Pass Rate: {GREEN if pass_rate >= 80 else YELLOW if pass_rate >= 60 else RED}{pass_rate:.1f}%{RESET}\n")
        
        if pass_rate >= 80:
            self.print_success("✓ System is READY for hackathon!")
        elif pass_rate >= 60:
            self.print_warning("⚠ System is PARTIALLY ready - some issues need fixing")
        else:
            self.print_error("✗ System is NOT ready - critical issues need fixing")
        
        return pass_rate >= 80

def main():
    """Main function"""
    print(f"{BLUE}Netra AI - Comprehensive Service Testing{RESET}")
    print(f"{BLUE}Hackathon Readiness Check{RESET}\n")
    
    # Wait a bit for services to be fully ready
    print("Waiting 5 seconds for services to stabilize...")
    time.sleep(5)
    
    tester = ServiceTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
