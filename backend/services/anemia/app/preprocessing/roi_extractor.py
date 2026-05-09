"""
ROI Extraction module for multi-modal anemia detection.

For augmented/pre-cropped datasets (Kaggle), ROI extraction is skipped
and the full image is returned directly. This avoids discarding valid
image content that was already prepared by the dataset authors.
"""

from pathlib import Path
from typing import Dict, Optional, Tuple

import cv2
import numpy as np

from ..exceptions import ROIExtractionError
from ..utils import get_logger

logger = get_logger("preprocessing.roi_extractor")


class ROIExtractor:
    """
    Extract regions of interest from conjunctiva and fingernail images.

    For pre-cropped/augmented datasets, set skip_extraction=True to
    return the full resized image without any segmentation.
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        skip_extraction: bool = True,  # True = safe default for augmented datasets
        min_roi_size: int = 100,
        expand_ratio: float = 0.2,  # expand bounding box by 20% on each side
    ):
        self.target_size = target_size
        self.skip_extraction = skip_extraction
        self.min_roi_size = min_roi_size
        self.expand_ratio = expand_ratio

        logger.info(
            f"ROIExtractor initialized: target_size={target_size}, "
            f"skip_extraction={skip_extraction}, min_roi_size={min_roi_size}"
        )

    def extract(
        self,
        image_path: str,
        modality: Optional[str] = None,
    ) -> Dict[str, np.ndarray]:
        """
        Load image and optionally extract ROI.

        Returns dict with key 'rgb' containing a uint8 HWC numpy array
        resized to target_size.
        """
        image = self._load_image(image_path)

        if self.skip_extraction:
            # Just resize - no segmentation
            roi = cv2.resize(
                image,
                (self.target_size[1], self.target_size[0]),
                interpolation=cv2.INTER_LINEAR,
            )
        else:
            if modality == "conjunctiva":
                roi = self._extract_conjunctiva_roi(image)
            elif modality == "fingernail":
                roi = self._extract_fingernail_roi(image)
            else:
                # Unknown modality - just resize
                roi = cv2.resize(
                    image,
                    (self.target_size[1], self.target_size[0]),
                    interpolation=cv2.INTER_LINEAR,
                )

            roi = cv2.resize(
                roi,
                (self.target_size[1], self.target_size[0]),
                interpolation=cv2.INTER_LINEAR,
            )

        logger.debug(
            f"ROI extraction successful: modality={modality}, output_shape={roi.shape}"
        )
        return {"rgb": roi}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_image(self, image_path: str) -> np.ndarray:
        path = Path(image_path)
        if not path.exists():
            raise ROIExtractionError(f"Image not found: {image_path}")
        image = cv2.imread(str(path))
        if image is None:
            raise ROIExtractionError(f"Failed to load image: {image_path}")
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def _expand_bbox(self, x, y, w, h, img_w, img_h) -> Tuple[int, int, int, int]:
        """Expand bounding box by expand_ratio on each side."""
        dw = int(w * self.expand_ratio)
        dh = int(h * self.expand_ratio)
        x = max(0, x - dw)
        y = max(0, y - dh)
        x2 = min(img_w, x + w + 2 * dw)
        y2 = min(img_h, y + h + 2 * dh)
        return x, y, x2 - x, y2 - y

    def _extract_conjunctiva_roi(self, image: np.ndarray) -> np.ndarray:
        """Color-based conjunctiva segmentation with expanded bounding box."""
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        mask1 = cv2.inRange(hsv, np.array([0, 30, 30]), np.array([15, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([155, 30, 30]), np.array([180, 255, 255]))
        mask = cv2.bitwise_or(mask1, mask2)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            # Fallback: return full image
            logger.warning("No conjunctiva contour found, using full image")
            return image

        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < self.min_roi_size:
            logger.warning("Conjunctiva ROI too small, using full image")
            return image

        x, y, w, h = cv2.boundingRect(largest)
        x, y, w, h = self._expand_bbox(x, y, w, h, image.shape[1], image.shape[0])
        return image[y : y + h, x : x + w]

    def _extract_fingernail_roi(self, image: np.ndarray) -> np.ndarray:
        """Threshold-based fingernail segmentation with expanded bounding box."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            logger.warning("No fingernail contour found, using full image")
            return image

        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < self.min_roi_size:
            logger.warning("Fingernail ROI too small, using full image")
            return image

        x, y, w, h = cv2.boundingRect(largest)
        x, y, w, h = self._expand_bbox(x, y, w, h, image.shape[1], image.shape[0])
        return image[y : y + h, x : x + w]

    def extract_from_array(
        self,
        image_bgr: np.ndarray,
        modality: Optional[str] = None,
    ) -> Dict[str, np.ndarray]:
        """
        Extract ROI from numpy array (BGR format).

        Args:
            image_bgr: Input image in BGR format
            modality: Image modality ("conjunctiva", "fingernail", "palm")

        Returns:
            Dict with 'rgb' key containing processed image
        """
        # Convert BGR to RGB
        image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

        if self.skip_extraction:
            # Just resize - no segmentation
            roi = cv2.resize(
                image,
                (self.target_size[1], self.target_size[0]),
                interpolation=cv2.INTER_LINEAR,
            )
        else:
            if modality == "conjunctiva":
                roi = self._extract_conjunctiva_roi(image)
            elif modality == "fingernail":
                roi = self._extract_fingernail_roi(image)
            elif modality == "palm":
                roi = self._extract_palm_roi(image)
            else:
                # Unknown modality - just resize
                roi = cv2.resize(
                    image,
                    (self.target_size[1], self.target_size[0]),
                    interpolation=cv2.INTER_LINEAR,
                )

            roi = cv2.resize(
                roi,
                (self.target_size[1], self.target_size[0]),
                interpolation=cv2.INTER_LINEAR,
            )

        logger.debug(
            f"ROI extraction from array successful: modality={modality}, output_shape={roi.shape}"
        )
        return {"rgb": roi}

    def _extract_palm_roi(self, image: np.ndarray) -> np.ndarray:
        """Skin detection for palm images."""
        # Convert to HSV for skin detection
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

        # Skin color range in HSV
        lower_skin = np.array([0, 20, 70])
        upper_skin = np.array([20, 255, 255])
        mask = cv2.inRange(hsv, lower_skin, upper_skin)

        # Morphological operations to clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            logger.warning("No palm contour found, using full image")
            return image

        # Get largest contour
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < self.min_roi_size:
            logger.warning("Palm ROI too small, using full image")
            return image

        # Extract bounding box with expansion
        x, y, w, h = cv2.boundingRect(largest)
        x, y, w, h = self._expand_bbox(x, y, w, h, image.shape[1], image.shape[0])
        return image[y : y + h, x : x + w]

    def detect_modality(self, image_path: str) -> str:
        """Simple heuristic modality detection."""
        image = self._load_image(image_path)
        r_mean = np.mean(image[:, :, 0])
        g_mean = np.mean(image[:, :, 1])
        return "conjunctiva" if r_mean / (g_mean + 1e-6) > 1.1 else "fingernail"
