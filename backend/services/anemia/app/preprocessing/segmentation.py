"""
Advanced segmentation methods for conjunctiva ROI extraction.

Implements multiple segmentation approaches:
1. U-Net with ResNet-34 backbone (85.7% IoU)
2. YOLOv8 segmentation (96% mAP, faster)
3. Traditional methods (Triangle thresholding, color-based)

Fallback chain: U-Net → YOLOv8 → Traditional
"""

from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np

from ..utils import get_logger

logger = get_logger("preprocessing.segmentation")


class UNetSegmentation:
    """
    U-Net based segmentation for conjunctiva (CORRECTION #7).

    Preserves resolution and uses minimal resizing before segmentation.
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize U-Net segmentation.

        Args:
            model_path: Path to trained U-Net model (optional)
        """
        self.model_path = model_path
        self.model = None

        if model_path and Path(model_path).exists():
            self._load_model()
        else:
            logger.warning("U-Net model not found - will use fallback methods")

    def _load_model(self):
        """Load trained U-Net model."""
        try:
            import torch

            self.model = torch.load(self.model_path)
            self.model.eval()
            logger.info(f"U-Net model loaded from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load U-Net model: {e}")
            self.model = None

    def segment(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Segment conjunctiva using U-Net.

        Args:
            image: BGR image

        Returns:
            Binary mask or None if segmentation fails
        """
        if self.model is None:
            return None

        try:
            # Prepare image for U-Net (CORRECTION #7)
            prepared = self._prepare_for_unet(image)

            # Run inference
            import torch

            with torch.no_grad():
                input_tensor = (
                    torch.from_numpy(prepared).permute(2, 0, 1).unsqueeze(0).float()
                )
                output = self.model(input_tensor)
                mask = output.squeeze().cpu().numpy()

            # Threshold to binary
            mask = (mask > 0.5).astype(np.uint8) * 255

            # Resize back to original size
            mask = cv2.resize(mask, (image.shape[1], image.shape[0]))

            return mask

        except Exception as e:
            logger.error(f"U-Net segmentation failed: {e}")
            return None

    def _prepare_for_unet(self, image: np.ndarray) -> np.ndarray:
        """
        Prepare image for U-Net segmentation (CORRECTION #7).

        U-Net works best with original or minimally downsampled images.
        Avoid aggressive resizing before segmentation.

        Args:
            image: BGR image

        Returns:
            Prepared image
        """
        h, w = image.shape[:2]

        # Only resize if image is VERY large (>2000px)
        if max(h, w) > 2000:
            # Downsample conservatively
            scale = 2000 / max(h, w)
            new_h, new_w = int(h * scale), int(w * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Pad to make dimensions divisible by 32 (U-Net requirement)
        h, w = image.shape[:2]
        pad_h = (32 - h % 32) % 32
        pad_w = (32 - w % 32) % 32

        if pad_h > 0 or pad_w > 0:
            image = cv2.copyMakeBorder(image, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT)

        # Normalize
        image = image.astype(np.float32) / 255.0

        return image


class YOLOv8Segmentation:
    """
    YOLOv8 based segmentation for conjunctiva.

    Faster than U-Net, good accuracy (96% mAP).
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize YOLOv8 segmentation.

        Args:
            model_path: Path to trained YOLOv8 model (optional)
        """
        self.model_path = model_path
        self.model = None

        if model_path and Path(model_path).exists():
            self._load_model()
        else:
            logger.warning("YOLOv8 model not found - will use fallback methods")

    def _load_model(self):
        """Load trained YOLOv8 model."""
        try:
            from ultralytics import YOLO

            self.model = YOLO(self.model_path)
            logger.info(f"YOLOv8 model loaded from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            self.model = None

    def segment(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Segment conjunctiva using YOLOv8.

        Args:
            image: BGR image

        Returns:
            Binary mask or None if segmentation fails
        """
        if self.model is None:
            return None

        try:
            # Run inference
            results = self.model(image)

            if len(results) == 0 or results[0].masks is None:
                return None

            # Get first mask (highest confidence)
            mask = results[0].masks.data[0].cpu().numpy()
            mask = (mask * 255).astype(np.uint8)

            # Resize to original size
            mask = cv2.resize(mask, (image.shape[1], image.shape[0]))

            return mask

        except Exception as e:
            logger.error(f"YOLOv8 segmentation failed: {e}")
            return None


class TraditionalSegmentation:
    """
    Traditional segmentation methods (fallback).

    Implements:
    1. Triangle thresholding (CP-AnemiC method)
    2. Color-based segmentation (HSV/YCrCb)
    """

    @staticmethod
    def triangle_threshold(image: np.ndarray) -> np.ndarray:
        """
        Triangle thresholding (CP-AnemiC dataset method).

        Args:
            image: BGR image

        Returns:
            Binary mask
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Triangle thresholding
        _, mask = cv2.threshold(
            blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_TRIANGLE
        )

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        return mask

    @staticmethod
    def color_based_segmentation(image: np.ndarray) -> np.ndarray:
        """
        Color-based segmentation using HSV and YCrCb.

        Args:
            image: BGR image

        Returns:
            Binary mask
        """
        # Convert to YCrCb (skin-tone agnostic)
        ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        _, cr, _ = cv2.split(ycrcb)

        # Threshold on Cr channel
        _, mask_cr = cv2.threshold(cr, 140, 255, cv2.THRESH_BINARY)

        # Also use HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Red hue range
        mask_hue1 = cv2.inRange(h, 0, 20)
        mask_hue2 = cv2.inRange(h, 160, 180)
        mask_hue = cv2.bitwise_or(mask_hue1, mask_hue2)

        # Combine masks
        mask = cv2.bitwise_and(mask_cr, mask_hue)

        # Clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        return mask


class SegmentationPipeline:
    """
    Complete segmentation pipeline with fallback chain.

    Tries methods in order: U-Net → YOLOv8 → Traditional
    """

    def __init__(
        self,
        unet_model_path: Optional[str] = None,
        yolo_model_path: Optional[str] = None,
    ):
        """
        Initialize segmentation pipeline.

        Args:
            unet_model_path: Path to U-Net model (optional)
            yolo_model_path: Path to YOLOv8 model (optional)
        """
        self.unet = UNetSegmentation(unet_model_path)
        self.yolo = YOLOv8Segmentation(yolo_model_path)
        self.traditional = TraditionalSegmentation()

        logger.info("SegmentationPipeline initialized with fallback chain")

    def segment(self, image: np.ndarray) -> Tuple[np.ndarray, str]:
        """
        Segment conjunctiva using fallback chain.

        Args:
            image: BGR image

        Returns:
            Tuple of (mask, method_used)
        """
        # Try U-Net first
        mask = self.unet.segment(image)
        if mask is not None:
            logger.debug("Segmentation successful: U-Net")
            return mask, "unet"

        # Try YOLOv8
        mask = self.yolo.segment(image)
        if mask is not None:
            logger.debug("Segmentation successful: YOLOv8")
            return mask, "yolov8"

        # Fallback to traditional methods
        try:
            mask = self.traditional.color_based_segmentation(image)
            logger.debug("Segmentation successful: Color-based")
            return mask, "color_based"
        except Exception as e:
            logger.warning(f"Color-based segmentation failed: {e}")
            # Last resort: triangle thresholding
            mask = self.traditional.triangle_threshold(image)
            logger.debug("Segmentation successful: Triangle threshold")
            return mask, "triangle"
