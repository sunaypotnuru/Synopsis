"""
Integrated preprocessing pipeline for conjunctiva images.

This module provides an enhanced preprocessing pipeline that uses MediaPipe
for face validation and traditional CV methods for segmentation.
"""

import cv2
import numpy as np
import torch
from pathlib import Path
from typing import Dict, Any, Optional

from ..preprocessing.mediapipe_utils import MediaPipeValidator
from ..preprocessing.constants import IMAGENET_MEAN, IMAGENET_STD
from .utils import get_logger

logger = get_logger("integrate_trained_models")


class IntegratedConjunctivaPipeline:
    """
    Enhanced conjunctiva pipeline with MediaPipe validation and traditional CV segmentation.

    This provides better preprocessing for conjunctiva images by:
    1. Face detection and validation (MediaPipe)
    2. Eye region extraction
    3. Conjunctiva segmentation (traditional CV)
    4. Quality validation
    """

    def __init__(
        self,
        unet_path: Optional[str] = None,
        yolo_path: Optional[str] = None,
        target_size: int = 224,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
    ):
        """
        Initialize integrated pipeline.

        Args:
            unet_path: Path to trained U-Net model (optional, not used in current version)
            yolo_path: Path to trained YOLOv8 model (optional, not used in current version)
            target_size: Target image size for output
            device: Device for inference
        """
        self.target_size = target_size
        self.device = device

        # Initialize MediaPipe validator
        try:
            self.mediapipe_validator = MediaPipeValidator(
                model_path="../models/face_landmarker.task",
                min_ear=0.15,
                target_size=target_size,
            )
            self.use_mediapipe = True
            logger.info("MediaPipe validator initialized successfully")
        except Exception as e:
            logger.warning(f"MediaPipe initialization failed: {e}")
            self.mediapipe_validator = None
            self.use_mediapipe = False

        # Note: U-Net and YOLOv8 models are not implemented in this version
        # They would be loaded here if available
        self.unet_model = None
        self.yolo_model = None

        logger.info(
            f"IntegratedConjunctivaPipeline initialized (device={device}, target_size={target_size})"
        )

    def process(
        self, image_path: str, return_intermediates: bool = False
    ) -> Dict[str, Any]:
        """
        Process conjunctiva image through the integrated pipeline.

        Args:
            image_path: Path to input image
            return_intermediates: Whether to return intermediate processing results

        Returns:
            Dictionary with processing results
        """
        try:
            # Load image
            image_bgr = cv2.imread(image_path)
            if image_bgr is None:
                return {
                    "success": False,
                    "message": f"Failed to load image: {image_path}",
                    "preprocessed": None,
                }

            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

            # Initialize result dictionary
            result = {
                "success": False,
                "preprocessed": None,
                "warnings": [],
                "detection_method": "unknown",
                "segmentation_method": "unknown",
            }

            if return_intermediates:
                result["intermediates"] = {}

            # Step 1: Face detection and validation
            if self.use_mediapipe:
                try:
                    mp_result = self.mediapipe_validator.validate_and_crop(image_rgb)

                    if mp_result is not None:
                        # MediaPipe successful
                        eye_roi = mp_result["roi"]
                        ear = mp_result["ear"]
                        is_macro = mp_result["is_macro"]

                        result["detection_method"] = (
                            "mediapipe_macro" if is_macro else "mediapipe_face"
                        )

                        if ear < 0.15 and not is_macro:
                            result["warnings"].append(
                                f"Low eye aspect ratio ({ear:.3f}). Eyelid may not be pulled down properly."
                            )

                        if return_intermediates:
                            result["intermediates"]["eye_roi"] = eye_roi
                            result["intermediates"]["ear"] = ear
                            result["intermediates"]["is_macro"] = is_macro
                    else:
                        # MediaPipe failed, use full image
                        eye_roi = image_rgb
                        result["detection_method"] = "fallback_full_image"
                        result["warnings"].append(
                            "Face detection failed, using full image"
                        )

                except Exception as e:
                    logger.warning(f"MediaPipe processing failed: {e}")
                    eye_roi = image_rgb
                    result["detection_method"] = "fallback_full_image"
                    result["warnings"].append(f"MediaPipe error: {str(e)}")
            else:
                # No MediaPipe, use full image
                eye_roi = image_rgb
                result["detection_method"] = "no_mediapipe"
                result["warnings"].append("MediaPipe not available, using full image")

            # Step 2: Conjunctiva segmentation
            try:
                segmented_roi = self._segment_conjunctiva_traditional(eye_roi)
                result["segmentation_method"] = "traditional_cv"

                if return_intermediates:
                    result["intermediates"]["segmented_roi"] = segmented_roi

            except Exception as e:
                logger.warning(f"Segmentation failed: {e}")
                segmented_roi = eye_roi
                result["segmentation_method"] = "no_segmentation"
                result["warnings"].append(f"Segmentation failed: {str(e)}")

            # Step 3: Resize and normalize
            try:
                # Resize to target size
                resized = cv2.resize(
                    segmented_roi, (self.target_size, self.target_size)
                )

                # Normalize for model input
                preprocessed_tensor = self._normalize_for_model(resized)

                result["success"] = True
                result["preprocessed"] = preprocessed_tensor
                result["message"] = "Processing successful"

                if return_intermediates:
                    result["intermediates"]["resized"] = resized

            except Exception as e:
                logger.error(f"Normalization failed: {e}")
                result["message"] = f"Normalization failed: {str(e)}"

            return result

        except Exception as e:
            logger.error(f"Pipeline processing failed: {e}")
            return {
                "success": False,
                "message": f"Pipeline error: {str(e)}",
                "preprocessed": None,
                "warnings": [],
                "detection_method": "error",
                "segmentation_method": "error",
            }

    def _segment_conjunctiva_traditional(self, image_rgb: np.ndarray) -> np.ndarray:
        """
        Traditional CV-based conjunctiva segmentation.

        Args:
            image_rgb: Input RGB image

        Returns:
            Segmented conjunctiva region
        """
        # Convert to different color spaces for segmentation
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        ycrcb = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2YCrCb)

        # Create mask for conjunctiva (reddish regions)
        # HSV mask for red regions
        mask1 = cv2.inRange(hsv, np.array([0, 30, 30]), np.array([15, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([155, 30, 30]), np.array([180, 255, 255]))
        hsv_mask = cv2.bitwise_or(mask1, mask2)

        # YCrCb mask for skin/red regions
        ycrcb_mask = cv2.inRange(
            ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127])
        )

        # Combine masks
        combined_mask = cv2.bitwise_or(hsv_mask, ycrcb_mask)

        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

        # Find contours and get the largest one
        contours, _ = cv2.findContours(
            combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if contours:
            # Get largest contour
            largest_contour = max(contours, key=cv2.contourArea)

            # Create mask from largest contour
            mask = np.zeros(image_rgb.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [largest_contour], 255)

            # Apply mask to image
            result = image_rgb.copy()
            result[mask == 0] = [0, 0, 0]  # Set background to black

            # Get bounding box and crop
            x, y, w, h = cv2.boundingRect(largest_contour)

            # Add some padding
            padding = 10
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(image_rgb.shape[1] - x, w + 2 * padding)
            h = min(image_rgb.shape[0] - y, h + 2 * padding)

            cropped = result[y : y + h, x : x + w]

            # If cropped region is too small, return original
            if cropped.shape[0] < 50 or cropped.shape[1] < 50:
                return image_rgb

            return cropped
        else:
            # No contours found, return original
            return image_rgb

    def _normalize_for_model(self, image_rgb: np.ndarray) -> torch.Tensor:
        """
        Normalize image for model input (4-channel: RGB + L*a*b* a*).

        Args:
            image_rgb: Input RGB image (uint8)

        Returns:
            Normalized 4-channel tensor
        """
        # Convert to float and normalize to [0, 1]
        image_f = image_rgb.astype(np.float32) / 255.0

        # Apply ImageNet normalization to RGB channels
        image_f = (image_f - np.array(IMAGENET_MEAN)) / np.array(IMAGENET_STD)

        # Add L*a*b* a* channel
        lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
        a_channel = lab[:, :, 1] / 255.0  # Normalize a* channel to [0, 1]
        a_expanded = a_channel[:, :, np.newaxis]  # Add channel dimension

        # Combine RGB + a* to get 4 channels
        combined = np.concatenate([image_f, a_expanded], axis=2)  # (H, W, 4)

        # Convert to tensor and rearrange to (C, H, W)
        tensor = torch.from_numpy(combined).permute(2, 0, 1).float()

        return tensor


def test_integrated_pipeline():
    """Test the integrated pipeline."""
    logger.info("=" * 80)
    logger.info("TESTING INTEGRATED PIPELINE")
    logger.info("=" * 80)

    # Initialize pipeline
    pipeline = IntegratedConjunctivaPipeline()

    # Test on sample image
    test_image = "data/raw/cp_anemic_hb/Anemic/Image_001.png"

    if not Path(test_image).exists():
        logger.error(f"Test image not found: {test_image}")
        return

    logger.info(f"Processing: {test_image}")
    result = pipeline.process(test_image, return_intermediates=True)

    if result["success"]:
        logger.info("✅ Processing successful!")
        logger.info(f"Detection method: {result['detection_method']}")
        logger.info(f"Segmentation method: {result['segmentation_method']}")
        logger.info(f"Output shape: {result['preprocessed'].shape}")
        logger.info(f"Warnings: {result['warnings']}")
    else:
        logger.error(f"❌ Processing failed: {result.get('message')}")

    logger.info("=" * 80)


if __name__ == "__main__":
    test_integrated_pipeline()
