"""
Test script for Cataract Detection Service
Run this to verify the implementation works correctly
"""

import requests
import sys
from pathlib import Path

# Service URL
BASE_URL = "http://localhost:8005"


def test_health_check():
    """Test health check endpoint"""
    print("\n1. Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Health check passed")
            print(f"   Status: {data.get('status')}")
            print(f"   Model loaded: {data.get('model_loaded')}")
            print(f"   Pipeline ready: {data.get('pipeline_ready')}")
            return True
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_model_info():
    """Test model info endpoint"""
    print("\n2. Testing Model Info...")
    try:
        response = requests.get(f"{BASE_URL}/model-info")
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Model info retrieved")
            print(f"   Architecture: {data.get('architecture')}")
            print(
                f"   Sensitivity: {data.get('expected_performance', {}).get('sensitivity'):.1%}"
            )
            print(
                f"   Specificity: {data.get('expected_performance', {}).get('specificity'):.1%}"
            )
            print(f"   Threshold: {data.get('threshold')}")
            return True
        else:
            print(f"   ❌ Model info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_root_endpoint():
    """Test root endpoint"""
    print("\n3. Testing Root Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Root endpoint working")
            print(f"   Service: {data.get('service')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Model: {data.get('model')}")
            return True
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_prediction(image_path=None):
    """Test prediction endpoint"""
    print("\n4. Testing Prediction Endpoint...")

    if image_path and Path(image_path).exists():
        try:
            with open(image_path, "rb") as f:
                files = {"file": f}
                response = requests.post(f"{BASE_URL}/predict", files=files)

            if response.status_code == 200:
                data = response.json()
                print("   ✅ Prediction successful")
                print(f"   Status: {data.get('status')}")
                print(f"   Confidence: {data.get('confidence'):.2%}")
                print(f"   Prediction: {data.get('prediction')}")
                print(f"   Processing time: {data.get('processing_time_ms'):.1f}ms")
                return True
            else:
                print(f"   ❌ Prediction failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    else:
        print("   ⚠️  Skipped (no test image provided)")
        print("   To test prediction, run: python test_service.py <image_path>")
        return None


def main():
    """Run all tests"""
    print("=" * 60)
    print("Cataract Detection Service - Test Suite")
    print("=" * 60)

    # Check if service is running
    try:
        requests.get(f"{BASE_URL}/health", timeout=2)
    except requests.exceptions.ConnectionError:
        print("\n❌ Service is not running!")
        print("   Start the service first:")
        print("   docker-compose up cataract")
        print("   OR")
        print("   cd services/cataract && python -m uvicorn app.main:app --port 8005")
        sys.exit(1)

    # Run tests
    results = []
    results.append(("Health Check", test_health_check()))
    results.append(("Model Info", test_model_info()))
    results.append(("Root Endpoint", test_root_endpoint()))

    # Test prediction if image provided
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    pred_result = test_prediction(image_path)
    if pred_result is not None:
        results.append(("Prediction", pred_result))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result is True)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20s}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Service is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the logs above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
