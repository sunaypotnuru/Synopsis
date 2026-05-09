"""
Facial Emotion Recognition using DeepFace
100% FREE - Pre-trained models
Based on: https://github.com/serengil/deepface
"""

import logging
import cv2
from typing import Dict, Optional
import tempfile
import os

logger = logging.getLogger(__name__)

# Global model cache
_deepface_loaded = False


def load_deepface():
    """
    Load DeepFace emotion model (pre-trained, FREE)
    Downloads model on first use (~100MB)
    """
    global _deepface_loaded

    if _deepface_loaded:
        return True

    try:
        from deepface import DeepFace
        import numpy as np

        # Test load the emotion model (forces weight download and instantiation)
        logger.info("Loading DeepFace emotion model via lazy-init...")
        dummy_img = np.zeros((224, 224, 3), dtype=np.uint8)
        DeepFace.analyze(
            img_path=dummy_img, actions=["emotion"], enforce_detection=False
        )

        _deepface_loaded = True
        logger.info("✅ DeepFace emotion model loaded successfully")
        return True

    except Exception as e:
        logger.warning(f"⚠️ Could not load DeepFace: {e}")
        logger.warning("Facial emotion analysis will be skipped")
        return False


def analyze_facial_emotions(
    video_path: Optional[str] = None, image_path: Optional[str] = None
) -> Dict:
    """
    Analyze facial emotions from video or image

    Uses DeepFace pre-trained model (FREE)
    Detects 7 emotions: angry, disgust, fear, happy, sad, surprise, neutral

    Args:
        video_path: Path to video file (optional)
        image_path: Path to image file (optional)

    Returns:
        dict: {
            'emotions': dict of emotion scores,
            'dominant_emotion': str,
            'confidence': float,
            'face_detected': bool
        }
    """
    try:
        from deepface import DeepFace

        # Default response
        result = {
            "emotions": {
                "angry": 0.0,
                "disgust": 0.0,
                "fear": 0.0,
                "happy": 0.0,
                "sad": 0.0,
                "surprise": 0.0,
                "neutral": 0.0,
            },
            "dominant_emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
        }

        # If video, extract first frame
        if video_path:
            logger.info(f"Extracting frame from video: {video_path}")
            cap = cv2.VideoCapture(video_path)
            ret, frame = cap.read()
            cap.release()

            if not ret:
                logger.warning("Could not extract frame from video")
                return result

            # Save frame as temp image
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                cv2.imwrite(tmp.name, frame)
                image_path = tmp.name

        if not image_path or not os.path.exists(image_path):
            logger.warning("No valid image path provided")
            return result

        # Analyze emotions
        logger.info(f"Analyzing facial emotions from: {image_path}")

        analysis = DeepFace.analyze(
            img_path=image_path,
            actions=["emotion"],
            enforce_detection=False,  # Don't fail if no face detected
            detector_backend="opencv",  # Fastest detector
        )

        # Handle both single face and multiple faces
        if isinstance(analysis, list):
            analysis = analysis[0]  # Take first face

        # Extract emotions
        emotions = analysis.get("emotion", {})
        dominant_emotion = analysis.get("dominant_emotion", "neutral")

        # Calculate confidence (max emotion score)
        confidence = max(emotions.values()) / 100.0 if emotions else 0.0

        # Normalize emotions to 0-1 range
        normalized_emotions = {k: v / 100.0 for k, v in emotions.items()}

        result = {
            "emotions": normalized_emotions,
            "dominant_emotion": dominant_emotion,
            "confidence": confidence,
            "face_detected": True,
        }

        logger.info(
            f"Facial emotion analysis complete: {dominant_emotion} ({confidence:.2f})"
        )

        # Clean up temp file if created
        if video_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp image {image_path}: {e}")

        return result

    except Exception as e:
        logger.error(f"Error analyzing facial emotions: {e}")
        return {
            "emotions": {
                "angry": 0.0,
                "disgust": 0.0,
                "fear": 0.0,
                "happy": 0.0,
                "sad": 0.0,
                "surprise": 0.0,
                "neutral": 0.0,
            },
            "dominant_emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
        }


def get_mental_health_indicators_from_emotions(emotions: Dict) -> Dict:
    """
    Map facial emotions to mental health indicators

    Based on research:
    - Depression: sad, neutral (flat affect)
    - Anxiety: fear, surprise
    - Stress: angry, disgust

    Args:
        emotions: Dict of emotion scores (0-1)

    Returns:
        dict: {
            'depression_indicator': float,
            'anxiety_indicator': float,
            'stress_indicator': float
        }
    """
    # Depression indicators (sad + neutral/flat affect)
    depression_indicator = (
        emotions.get("sad", 0.0) * 0.7 + emotions.get("neutral", 0.0) * 0.3
    )

    # Anxiety indicators (fear + surprise)
    anxiety_indicator = (
        emotions.get("fear", 0.0) * 0.6 + emotions.get("surprise", 0.0) * 0.4
    )

    # Stress indicators (angry + disgust)
    stress_indicator = (
        emotions.get("angry", 0.0) * 0.6 + emotions.get("disgust", 0.0) * 0.4
    )

    return {
        "depression_indicator": depression_indicator,
        "anxiety_indicator": anxiety_indicator,
        "stress_indicator": stress_indicator,
    }


if __name__ == "__main__":
    # Test facial emotion analysis
    print("Testing DeepFace facial emotion analysis...")

    # Load model
    if load_deepface():
        print("✅ DeepFace loaded successfully")
        print("\nTo test with real images:")
        print("  from app.facial_emotions import analyze_facial_emotions")
        print("  result = analyze_facial_emotions(image_path='path/to/image.jpg')")
        print("  print(result)")
    else:
        print("❌ DeepFace failed to load")
