import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2
import numpy as np
import os
from typing import Optional, Dict, Any


class MediaPipeValidator:
    def __init__(
        self,
        model_path: Optional[str] = None,
        min_ear: float = 0.15,
        target_size: int = 224,
    ):
        """
        Initialize MediaPipe face validator.

        Args:
            model_path: Path to face_landmarker.task model
            min_ear: Minimum Eye Aspect Ratio threshold
            target_size: Target size for output images
        """
        self.min_ear = min_ear
        self.target_size = target_size
        self.margin = 0.2  # Margin for bounding box expansion

        # Determine model path
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__), "..", "models", "face_landmarker.task"
            )

        if not os.path.exists(model_path):
            # Try alternative paths
            alt_paths = [
                "models/face_landmarker.task",
                "../models/face_landmarker.task",
                "src/anemia_detection/models/face_landmarker.task",
            ]

            for alt_path in alt_paths:
                if os.path.exists(alt_path):
                    model_path = alt_path
                    break
            else:
                raise FileNotFoundError(
                    f"face_landmarker.task not found. Tried: {model_path}, {alt_paths}"
                )

        # Initialize MediaPipe
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)

        # Eye landmark indices for EAR calculation
        self.right_eye_indices = [145, 153, 159, 173, 157, 158]  # lower eyelid region
        self.left_eye_indices = [374, 380, 385, 386, 387, 388]

    def eye_aspect_ratio(self, landmarks, indices, img_shape):
        """Calculate Eye Aspect Ratio (EAR) for given landmarks."""
        h, w = img_shape[:2]
        pts = np.array(
            [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        )

        # EAR formula: (vertical distances) / (horizontal distance)
        vert1 = np.linalg.norm(pts[1] - pts[5])
        vert2 = np.linalg.norm(pts[2] - pts[4])
        horiz = np.linalg.norm(pts[0] - pts[3])
        return (vert1 + vert2) / (2.0 * horiz + 1e-6)

    def get_conjunctiva_bbox(self, landmarks, indices, img_shape):
        """Get bounding box for conjunctiva region with margin."""
        h, w = img_shape[:2]
        pts = np.array(
            [
                (int(landmarks.landmark[i].x * w), int(landmarks.landmark[i].y * h))
                for i in indices
            ]
        )
        x, y, w_box, h_box = cv2.boundingRect(pts)

        # Add margin
        margin = self.margin
        x = max(0, int(x - margin * w_box))
        y = max(0, int(y - margin * h_box))
        w_box = min(w - x, int(w_box * (1 + 2 * margin)))
        h_box = min(h - y, int(h_box * (1 + 2 * margin)))
        return (x, y, w_box, h_box)

    def validate_and_crop(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        Validate face and crop eye region.

        Args:
            image: Input RGB image

        Returns:
            Dictionary with validation results or None if validation fails
        """
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                # Assume input is RGB
                rgb = image
            else:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            results = self.detector.detect(mp_image)

            if not results.face_landmarks:
                # No face detected - might be macro shot
                # Return the full image resized
                resized = cv2.resize(image, (self.target_size, self.target_size))
                return {"roi": resized, "ear": 0.0, "is_macro": True, "landmarks": None}

            landmarks = results.face_landmarks[0]

            # Calculate EAR for both eyes
            left_ear = self.eye_aspect_ratio(
                landmarks, self.left_eye_indices, image.shape
            )
            right_ear = self.eye_aspect_ratio(
                landmarks, self.right_eye_indices, image.shape
            )

            # Use the eye with higher EAR (more open/stretched)
            if left_ear > right_ear:
                indices = self.left_eye_indices
                ear = left_ear
                eye_side = "left"
            else:
                indices = self.right_eye_indices
                ear = right_ear
                eye_side = "right"

            # Get bounding box and crop
            bbox = self.get_conjunctiva_bbox(landmarks, indices, image.shape)
            x, y, w, h = bbox
            roi = image[y : y + h, x : x + w]

            # Resize to target size
            if roi.shape[0] > 0 and roi.shape[1] > 0:
                roi_resized = cv2.resize(roi, (self.target_size, self.target_size))
            else:
                # Fallback to full image if ROI is invalid
                roi_resized = cv2.resize(image, (self.target_size, self.target_size))

            return {
                "roi": roi_resized,
                "ear": ear,
                "is_macro": False,
                "landmarks": landmarks,
                "eye_side": eye_side,
                "bbox": bbox,
            }

        except Exception as e:
            # If MediaPipe fails, return full image as fallback
            resized = cv2.resize(image, (self.target_size, self.target_size))
            return {
                "roi": resized,
                "ear": 0.0,
                "is_macro": True,
                "landmarks": None,
                "error": str(e),
            }
