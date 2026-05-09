"""
Quick test script for DR detection service
Run this to verify the service is working correctly
"""

import requests
import sys
from pathlib import Path


def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get("http://localhost:8002/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   Device: {data['device']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_root():
    """Test root endpoint"""
    print("\nTesting root endpoint...")
    try:
        response = requests.get("http://localhost:8002/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Root endpoint passed")
            print(f"   Service: {data['service']}")
            print(f"   Model: {data['model']}")
            print(f"   Status: {data['status']}")
            return True
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_predict(image_path):
    """Test prediction endpoint"""
    print(f"\nTesting prediction with image: {image_path}")

    if not Path(image_path).exists():
        print(f"❌ Image not found: {image_path}")
        return False

    try:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = requests.post("http://localhost:8002/predict", files=files)

        if response.status_code == 200:
            data = response.json()
            print("✅ Prediction successful")
            print(f"   Grade: {data['grade']} - {data['grade_name']}")
            print(f"   Confidence: {data['confidence']:.2%}")
            print(f"   Referable: {data['referable']}")
            print(f"   Recommendation: {data['recommendation']}")
            return True
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_uncertainty(image_path):
    """Test uncertainty prediction endpoint"""
    print(f"\nTesting uncertainty prediction with image: {image_path}")

    if not Path(image_path).exists():
        print(f"❌ Image not found: {image_path}")
        return False

    try:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = requests.post(
                "http://localhost:8002/predict/uncertainty?num_samples=5", files=files
            )

        if response.status_code == 200:
            data = response.json()
            print("✅ Uncertainty prediction successful")
            print(f"   Grade: {data['grade']} - {data['grade_name']}")
            print(f"   Confidence: {data['confidence']:.2%}")
            print(f"   Uncertainty: {data['uncertainty']:.4f}")
            print(f"   Needs review: {data['needs_review']}")
            return True
        else:
            print(f"❌ Uncertainty prediction failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("DR Detection Service Test Suite")
    print("=" * 60)

    # Test basic endpoints
    health_ok = test_health()
    root_ok = test_root()

    # Test prediction if image provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        predict_ok = test_predict(image_path)
        uncertainty_ok = test_uncertainty(image_path)
    else:
        print("\n⚠️  No image provided - skipping prediction tests")
        print("   Usage: python test_service.py <path_to_retina_image.jpg>")
        predict_ok = None
        uncertainty_ok = None

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Health endpoint:      {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Root endpoint:        {'✅ PASS' if root_ok else '❌ FAIL'}")
    if predict_ok is not None:
        print(f"Prediction endpoint:  {'✅ PASS' if predict_ok else '❌ FAIL'}")
        print(f"Uncertainty endpoint: {'✅ PASS' if uncertainty_ok else '❌ FAIL'}")
    print("=" * 60)

    # Exit code
    if health_ok and root_ok:
        if predict_ok is None or (predict_ok and uncertainty_ok):
            print("\n✅ All tests passed!")
            sys.exit(0)

    print("\n❌ Some tests failed")
    sys.exit(1)


if __name__ == "__main__":
    main()
