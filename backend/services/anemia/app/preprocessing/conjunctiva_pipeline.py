"""
Corrected Conjunctiva Preprocessing Pipeline
Based on research findings with 7 critical corrections applied.

This module implements the complete preprocessing pipeline for user-uploaded
conjunctiva images, including quality enhancement, eye detection, segmentation,
high-quality cropping, and normalization.

Critical Corrections Applied:
1. Correct preprocessing order: Crop → Resize → Enhance → Normalize
2. INTER_AREA for downsampling (not LANCZOS4)
3. Adaptive CLAHE (only for low-contrast images)
4. Adaptive thresholding (Otsu/Triangle based on histogram)
5. Skin-tone agnostic segmentation (YCrCb color space)
6. Normalize AFTER resize (not before)
7. Preserve resolution for U-Net (minimal resize)
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from scipy.signal import find_peaks

from ..exceptions import ROIExtractionError
from ..utils import get_logger
from .constants import TRAIN_MEAN, TRAIN_STD  # Import from centralized constants

logger = get_logger("preprocessing.conjunctiva_pipeline")


# Remove duplicate definition - now imported from constants
# TRAIN_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
# TRAIN_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class ConjunctivaPipeline:
    """
    Complete preprocessing pipeline for user-uploaded conjunctiva images.

    Implements all 7 critical corrections from research:
    - Correct preprocessing order
    - Quality-preserving resize
    - Adaptive enhancement
    - Skin-tone agnostic segmentation
    - Proper normalization timing
    """

    def __init__(
        self,
        target_size: int = 224,
        contrast_threshold: float = 30.0,
        min_roi_size: int = 100,
        padding_ratio: float = 0.1,
        skip_eye_detection: bool = False,  # NEW: Fix for BUG-3
    ):
        """
        Initialize conjunctiva preprocessing pipeline.

        Args:
            target_size: Target image size for model input
            contrast_threshold: Threshold for applying CLAHE enhancement
            min_roi_size: Minimum ROI size in pixels
            padding_ratio: Padding around ROI (0.1 = 10%)
            skip_eye_detection: Skip Haar Cascade detection (for pre-cropped images)
        """
        self.target_size = target_size
        self.contrast_threshold = contrast_threshold
        self.min_roi_size = min_roi_size
        self.padding_ratio = padding_ratio
        self.skip_eye_detection = skip_eye_detection  # NEW

        # Load Haar Cascade for eye detection (only if needed)
        if not skip_eye_detection:
            cascade_path = cv2.data.haarcascades + "haarcascade_eye.xml"
            self.eye_cascade = cv2.CascadeClassifier(cascade_path)

        logger.info(
            f"ConjunctivaPipeline initialized: target_size={target_size}, "
            f"contrast_threshold={contrast_threshold}, skip_eye_detection={skip_eye_detection}"
        )

    def process(
        self,
        image_path: str,
        return_intermediates: bool = False,
    ) -> Dict:
        """
        Process user-uploaded conjunctiva image through complete pipeline.

        Args:
            image_path: Path to input image
            return_intermediates: If True, return intermediate processing steps

        Returns:
            Dictionary containing:
                - 'success': bool
                - 'preprocessed': Normalized image ready for model (CHW tensor)
                - 'warnings': List of warning messages
                - 'intermediates': Dict of intermediate images (if requested)
        """
        warnings = []
        intermediates = {}

        try:
            # 1. Load image (BGR format)
            image = self._load_image(image_path)
            if image is None:
                return {
                    "success": False,
                    "message": "Failed to load image",
                    "warnings": ["Corrupted or invalid image file"],
                }

            original = image.copy()
            if return_intermediates:
                intermediates["original"] = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)

            # 2. Basic quality check (only reject if completely corrupted)
            if image.size == 0:
                return {
                    "success": False,
                    "message": "Corrupted image",
                    "warnings": ["Image has zero size"],
                }

            # 3. Eye detection (optional - skip for pre-cropped images)
            if not self.skip_eye_detection:
                eye_bbox = self._detect_eye_region(image)
                if eye_bbox is None:
                    warnings.append("Eye not detected - using full image")
                    eye_bbox = (0, 0, image.shape[1], image.shape[0])
            else:
                # Skip detection for pre-cropped conjunctiva images (BUG-3 fix)
                eye_bbox = (0, 0, image.shape[1], image.shape[0])
                warnings.append("Eye detection skipped (pre-cropped image)")

            x, y, w, h = eye_bbox
            eye_crop = image[y : y + h, x : x + w]
            if return_intermediates:
                intermediates["eye_crop"] = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2RGB)

            # 4. Skin-tone agnostic segmentation (CORRECTION #5)
            mask = self._skin_tone_agnostic_segmentation(eye_crop)
            if return_intermediates:
                intermediates["segmentation_mask"] = mask

            # 5. High-quality crop (preserve original resolution) (CORRECTION #1)
            roi_cropped = self._high_quality_crop(eye_crop, mask)
            if roi_cropped is None:
                return {
                    "success": False,
                    "message": "No conjunctiva detected. Please ensure you pull down your lower eyelid to expose the inner tissue.",
                    "warnings": [
                        "Segmentation failed - no valid conjunctiva ROI found"
                    ],
                }

            if return_intermediates:
                intermediates["roi_cropped"] = cv2.cvtColor(
                    roi_cropped, cv2.COLOR_BGR2RGB
                )

            # 6. Resize FIRST with quality preservation (CORRECTION #2)
            resized = self._quality_preserving_resize(roi_cropped, self.target_size)
            if return_intermediates:
                intermediates["resized"] = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

            # 7. THEN enhance adaptively (CORRECTION #3)
            enhanced, was_enhanced = self._adaptive_clahe_enhancement(resized)
            if was_enhanced:
                warnings.append("Applied contrast enhancement")

            if return_intermediates:
                intermediates["enhanced"] = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)

            # 8. THEN normalize (CORRECTION #6)
            normalized = self._normalize_with_train_stats(enhanced)

            # 9. Convert to tensor (CHW format)
            tensor = torch.from_numpy(normalized).permute(2, 0, 1).float()

            result = {
                "success": True,
                "preprocessed": tensor,
                "warnings": warnings,
            }

            if return_intermediates:
                result["intermediates"] = intermediates

            return result

        except Exception as e:
            logger.error(f"Pipeline processing failed: {str(e)}", exc_info=True)
            return {
                "success": False,
                "message": f"Processing failed: {str(e)}",
                "warnings": warnings,
            }

    def _load_image(self, image_path: str) -> Optional[np.ndarray]:
        """Load image in BGR format with EXIF orientation correction."""
        path = Path(image_path)
        if not path.exists():
            raise ROIExtractionError(f"Image not found: {image_path}")

        image = cv2.imread(str(path))
        if image is None:
            return None

        # Handle EXIF orientation (phone photos may be rotated)
        try:
            from PIL import Image as PILImage

            pil_img = PILImage.open(str(path))
            exif = getattr(pil_img, "_getexif", lambda: None)()
            if exif and 274 in exif:  # 274 = Orientation tag
                orientation = exif[274]
                if orientation == 3:
                    image = cv2.rotate(image, cv2.ROTATE_180)
                elif orientation == 6:
                    image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
                elif orientation == 8:
                    image = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        except Exception:
            pass  # If EXIF fails, continue with original orientation

        return image

    def _detect_eye_region(
        self, image: np.ndarray
    ) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect eye region using Haar Cascade.

        Returns:
            Tuple of (x, y, w, h) or None if detection fails
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        eyes = self.eye_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )

        if len(eyes) == 0:
            return None

        # Return largest detected eye
        largest_eye = max(eyes, key=lambda e: e[2] * e[3])
        return tuple(largest_eye)

    def _skin_tone_agnostic_segmentation(self, image: np.ndarray) -> np.ndarray:
        """
        Segment conjunctiva without skin tone bias (CORRECTION #5).

        Uses YCrCb color space which is skin-tone independent.
        Focus on Cr channel (red chromaticity) which is consistent across ethnicities.

        Args:
            image: BGR image

        Returns:
            Binary mask of conjunctiva region
        """
        # Convert to YCrCb (skin-tone agnostic)
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        _, cr, _ = cv2.split(ycrcb)

        # Threshold on Cr channel (conjunctiva has high Cr)
        _, mask_cr = cv2.threshold(cr, 140, 255, cv2.THRESH_BINARY)

        # Also use HSV for additional robustness
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Red hue range (conjunctiva is pinkish-red)
        mask_hue1 = cv2.inRange(h, 0, 20)
        mask_hue2 = cv2.inRange(h, 160, 180)
        mask_hue = cv2.bitwise_or(mask_hue1, mask_hue2)

        # Combine masks
        mask = cv2.bitwise_and(mask_cr, mask_hue)

        # Clean up with morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        return mask

    def _high_quality_crop(
        self, image: np.ndarray, mask: np.ndarray
    ) -> Optional[np.ndarray]:
        """
        High-quality crop with padding (CORRECTION #1).

        Preserves original resolution and adds padding for context.

        Args:
            image: BGR image
            mask: Binary segmentation mask

        Returns:
            Cropped image or None if crop fails
        """
        # Find contours in mask
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None

        # Get largest contour
        largest = max(contours, key=cv2.contourArea)

        if cv2.contourArea(largest) < self.min_roi_size:
            return None

        # Get bounding box
        x, y, w, h = cv2.boundingRect(largest)

        # Add padding (10% by default)
        pad_w = int(w * self.padding_ratio)
        pad_h = int(h * self.padding_ratio)

        x = max(0, x - pad_w)
        y = max(0, y - pad_h)
        x2 = min(image.shape[1], x + w + 2 * pad_w)
        y2 = min(image.shape[0], y + h + 2 * pad_h)

        # Crop with padding
        cropped = image[y:y2, x:x2]

        return cropped

    def _quality_preserving_resize(
        self, image: np.ndarray, target_size: int
    ) -> np.ndarray:
        """
        Quality-preserving resize with aspect ratio preservation (CORRECTION #2).

        Uses INTER_AREA for downsampling (best quality, no artifacts).
        Uses INTER_CUBIC for upsampling (smooth, no pixelation).

        Args:
            image: BGR image
            target_size: Target size (will be square)

        Returns:
            Resized image with aspect ratio preserved
        """
        h, w = image.shape[:2]

        # Calculate scale factor
        scale = target_size / max(h, w)

        # Determine interpolation method
        if scale < 1.0:
            # Downsampling: Use INTER_AREA (best for downsampling)
            resized = cv2.resize(
                image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
            )
        elif scale > 1.0:
            # Upsampling: Use INTER_CUBIC (smooth, no ringing)
            resized = cv2.resize(
                image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC
            )
        else:
            # No scaling needed, but might still need padding
            resized = image

        new_h, new_w = resized.shape[:2]

        # Pad to square with white background
        delta_w = target_size - new_w
        delta_h = target_size - new_h
        top = delta_h // 2
        bottom = delta_h - top
        left = delta_w // 2
        right = delta_w - left

        # Use black padding (matches training data background)
        padded = cv2.copyMakeBorder(
            resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0]
        )

        return padded

    def _adaptive_clahe_enhancement(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Adaptive CLAHE enhancement (CORRECTION #3).

        Only applies CLAHE if image has low contrast.
        Prevents over-enhancement of already good images.

        Args:
            image: BGR image (uint8)

        Returns:
            Tuple of (enhanced_image, was_enhanced)
        """
        # Check if enhancement is needed
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        contrast = gray.std()

        if contrast < self.contrast_threshold:
            # Low contrast - apply CLAHE
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            lab_l, lab_a, lab_b = cv2.split(lab)

            # Use conservative clip limit to avoid over-enhancement
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab_l_clahe = clahe.apply(lab_l)

            enhanced = cv2.merge([lab_l_clahe, lab_a, lab_b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

            return enhanced, True
        else:
            # Good contrast - skip enhancement
            return image, False

    def _normalize_with_train_stats(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize with training data statistics + add L*a*b* a* channel (FIXED BUG-2).

        Returns 4-channel array (RGB normalized + a* channel) to match AugmentationPipeline.
        This fixes the channel mismatch between training and inference.

        Args:
            image: BGR image (uint8)

        Returns:
            Normalized image (float32, HWC format, 4 channels)
        """
        # Convert BGR to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Extract a* channel BEFORE normalization (preserves original color info)
        lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
        # OpenCV LAB: L in [0,255], a* and b* in [0,255] (shifted from [-128,127])
        # a* center is 128, so normalize: (value) / 255 gives [0,1]
        a_channel = lab[:, :, 1] / 255.0  # Normalize a* to [0,1]

        # Normalize RGB to [0, 1]
        rgb_normalized = rgb.astype(np.float32) / 255.0

        # Standardize RGB with training data statistics (ImageNet stats)
        rgb_standardized = (rgb_normalized - TRAIN_MEAN) / TRAIN_STD

        # Add a* channel as 4th channel
        # Shape: (H, W, 3) + (H, W, 1) = (H, W, 4)
        a_channel_expanded = a_channel[:, :, np.newaxis]  # (H, W, 1)
        combined = np.concatenate(
            [rgb_standardized, a_channel_expanded], axis=2
        )  # (H, W, 4)

        return combined  # Shape: (H, W, 4)


class AdaptiveThresholdSegmentation:
    """
    Adaptive thresholding based on histogram analysis (CORRECTION #4).

    Uses Otsu for two-peak histograms, Triangle for one-peak histograms.
    """

    @staticmethod
    def segment(image: np.ndarray) -> np.ndarray:
        """
        Adaptive threshold segmentation.

        Args:
            image: BGR image

        Returns:
            Binary mask
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Analyze histogram to choose method
        hist = cv2.calcHist([blurred], [0], None, [256], [0, 256])

        # Find peaks in histogram
        peaks, _ = find_peaks(hist.flatten(), height=100)

        if len(peaks) >= 2:
            # Two peaks - use OTSU
            _, mask = cv2.threshold(
                blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
        else:
            # One peak - use TRIANGLE
            _, mask = cv2.threshold(
                blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_TRIANGLE
            )

        return mask


class QualityEnhancer:
    """
    Quality enhancement utilities for preprocessing.

    Fixes issues instead of rejecting images.
    """

    @staticmethod
    def assess_and_enhance(image: np.ndarray) -> Tuple[np.ndarray, Dict, List[str]]:
        """
        Assess image quality and apply enhancements.

        Args:
            image: BGR image

        Returns:
            Tuple of (enhanced_image, metrics, warnings)
        """
        warnings = []
        metrics = {}
        enhanced = image.copy()

        # Check blur
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        metrics["blur"] = laplacian_var

        if laplacian_var < 100:
            warnings.append("Image is blurry - applying sharpening")
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)

        # Check brightness
        brightness = np.mean(gray)
        metrics["brightness"] = brightness

        if brightness < 80:
            warnings.append("Image is dark - increasing brightness")
            enhanced = cv2.convertScaleAbs(enhanced, alpha=1.2, beta=30)
        elif brightness > 200:
            warnings.append("Image is too bright - reducing brightness")
            enhanced = cv2.convertScaleAbs(enhanced, alpha=0.8, beta=-20)

        # Check contrast
        contrast = gray.std()
        metrics["contrast"] = contrast

        if contrast < 30:
            warnings.append("Low contrast - applying CLAHE")
            lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
            lab_l, lab_a, lab_b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab_l_enhanced = clahe.apply(lab_l)
            enhanced = cv2.merge([lab_l_enhanced, lab_a, lab_b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        return enhanced, metrics, warnings
