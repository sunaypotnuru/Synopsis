#!/usr/bin/env python3
"""
Test script for PyTorch anemia model integration.
"""

import sys
from pathlib import Path
import numpy as np
import cv2

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))


def test_model_loading():
    """Test if the PyTorch model can be loaded."""
    print("=" * 60)
    print("TESTING PYTORCH MODEL INTEGRATION")
    print("=" * 60)

    try:
        from src.simple_pytorch_pipeline import get_simple_pytorch_pipeline

        print("✅ Imports successful")

        # Initialize pipeline
        pipeline = get_simple_pytorch_pipeline()
        print("✅ Pipeline initialized successfully")

        # Create a dummy image for testing
        dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        dummy_bgr = cv2.cvtColor(dummy_image, cv2.COLOR_RGB2BGR)

        print("🧪 Testing prediction with dummy image...")

        # Test prediction
        result = pipeline.predict(
            dummy_bgr,
            save_original=False,
            save_cropped=False,
            save_heatmap=False,
            image_source="test_image.jpg",
        )

        if result["success"]:
            print("✅ Prediction successful!")
            print(f"   Version: {result.get('version', 'unknown')}")
            print(f"   Model Accuracy: {result.get('model_accuracy', 'unknown')}")
            print(f"   Modality: {result.get('modality', 'unknown')}")
            print(f"   Probability: {result.get('probability', 0):.4f}")
            print(f"   Diagnosis: {result.get('diagnosis', 'unknown')}")
            print(f"   Confidence: {result.get('confidence', 0):.4f}")
        else:
            print(f"❌ Prediction failed: {result.get('error', 'unknown error')}")
            return False

        print("\n" + "=" * 60)
        print("🎉 PYTORCH INTEGRATION TEST PASSED!")
        print("=" * 60)
        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure PyTorch dependencies are installed:")
        print("   pip install torch torchvision timm mediapipe opencv-python")
        return False
    except FileNotFoundError as e:
        print(f"❌ Model file not found: {e}")
        print("   Make sure best_model.pt is in the models/ directory")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_api_compatibility():
    """Test if the new pipeline is compatible with existing API."""
    print("\n" + "=" * 60)
    print("TESTING API COMPATIBILITY")
    print("=" * 60)

    try:
        # Test the main pipeline import (should use PyTorch by default)
        from src.pipeline import get_pipeline

        pipeline = get_pipeline()
        print("✅ Main pipeline import successful")

        # Create dummy image
        dummy_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        dummy_bgr = cv2.cvtColor(dummy_image, cv2.COLOR_RGB2BGR)

        # Add small delay to avoid rate limiting
        import time

        time.sleep(1)

        # Test with existing API format
        result = pipeline.predict(dummy_bgr, image_source="api_test.jpg")

        print(f"📋 API Result keys: {list(result.keys())}")
        if not result.get("success", False):
            print(f"⚠️  Pipeline returned error: {result.get('error', 'unknown')}")

        # Check required fields for API compatibility
        required_fields = ["success", "probability", "diagnosis", "confidence"]
        missing_fields = [field for field in required_fields if field not in result]

        if missing_fields:
            print(f"❌ Missing required API fields: {missing_fields}")
            print(f"📋 Available fields: {list(result.keys())}")
            return False

        print("✅ API compatibility test passed!")
        print(f"   All required fields present: {required_fields}")
        return True

    except Exception as e:
        print(f"❌ API compatibility test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Starting PyTorch integration tests...\n")

    # Test model loading
    model_test = test_model_loading()

    # Test API compatibility
    api_test = test_api_compatibility()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Model Loading: {'✅ PASS' if model_test else '❌ FAIL'}")
    print(f"API Compatibility: {'✅ PASS' if api_test else '❌ FAIL'}")

    if model_test and api_test:
        print("\n🎉 ALL TESTS PASSED! PyTorch integration is ready.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)
