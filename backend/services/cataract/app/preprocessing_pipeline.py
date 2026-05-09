"""
Production-Ready Preprocessing Pipeline for Cataract Detection
Ensures consistent image preprocessing for deployment

Based on research:
- Medical imaging requires standardized preprocessing
- Normalization, resizing, and quality checks are critical
- Pipeline must match training preprocessing exactly
"""

import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from typing import Union, Tuple
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CataractPreprocessingPipeline:
    """
    Production preprocessing pipeline for cataract detection

    Features:
    - Image quality validation
    - Standardized resizing
    - ImageNet normalization (matches training)
    - Format conversion
    - Error handling
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (224, 224),
        normalize_mean: list = [0.485, 0.456, 0.406],
        normalize_std: list = [0.229, 0.224, 0.225],
        min_image_size: int = 50,
        max_image_size: int = 10000,
    ):
        """
        Initialize preprocessing pipeline

        Args:
            target_size: Target image size (height, width)
            normalize_mean: ImageNet mean for normalization
            normalize_std: ImageNet std for normalization
            min_image_size: Minimum acceptable image dimension
            max_image_size: Maximum acceptable image dimension
        """
        self.target_size = target_size
        self.normalize_mean = normalize_mean
        self.normalize_std = normalize_std
        self.min_image_size = min_image_size
        self.max_image_size = max_image_size

        # Define preprocessing transforms (matches training)
        self.transform = transforms.Compose(
            [
                transforms.Resize(target_size),
                transforms.ToTensor(),
                transforms.Normalize(mean=normalize_mean, std=normalize_std),
            ]
        )

        logger.info("Preprocessing pipeline initialized")
        logger.info(f"Target size: {target_size}")
        logger.info(f"Normalization: mean={normalize_mean}, std={normalize_std}")

    def preprocess(
        self, image: Union[str, Path, Image.Image, np.ndarray]
    ) -> torch.Tensor:
        """
        Preprocess image for model inference

        Args:
            image: Input image (path, PIL Image, or numpy array)

        Returns:
            Preprocessed tensor
        """
        try:
            # Load image if path provided
            if isinstance(image, (str, Path)):
                image_path = str(image)
                image = Image.open(image_path)
                logger.info(f"Loaded image from: {image_path}")

            # Convert numpy array to PIL Image
            if isinstance(image, np.ndarray):
                # Handle different numpy array formats
                if image.dtype == np.uint8:
                    image = Image.fromarray(image)
                else:
                    # Normalize to 0-255 range
                    image = (
                        (image - image.min()) / (image.max() - image.min()) * 255
                    ).astype(np.uint8)
                    image = Image.fromarray(image)

            # Ensure RGB format
            if image.mode != "RGB":
                logger.info(f"Converting from {image.mode} to RGB")
                image = image.convert("RGB")

            # Store original size
            original_size = image.size
            logger.info(f"Original image size: {original_size}")

            # Apply preprocessing transforms
            image_tensor = self.transform(image)

            logger.info(f"Preprocessed tensor shape: {image_tensor.shape}")
            logger.info(
                f"Tensor range: [{image_tensor.min():.3f}, {image_tensor.max():.3f}]"
            )

            return image_tensor

        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            raise

    def quality_check(self, image: Union[str, Path, Image.Image]) -> dict:
        """
        Perform comprehensive quality check on image

        Args:
            image: Input image

        Returns:
            Dictionary with quality metrics
        """
        try:
            # Load image if path provided
            if isinstance(image, (str, Path)):
                image = Image.open(image)

            # Convert to numpy for analysis
            img_array = np.array(image)

            # Calculate quality metrics
            quality = {
                "size": image.size,
                "mode": image.mode,
                "mean_intensity": float(img_array.mean()),
                "std_intensity": float(img_array.std()),
                "min_intensity": int(img_array.min()),
                "max_intensity": int(img_array.max()),
                "is_grayscale": len(img_array.shape) == 2
                or (len(img_array.shape) == 3 and img_array.shape[2] == 1),
                "is_valid": True,
            }

            # Check for common issues
            if quality["std_intensity"] < 5:
                quality["warning"] = "Very low contrast"

            if quality["mean_intensity"] < 20 or quality["mean_intensity"] > 235:
                quality["warning"] = "Extreme brightness"

            return quality

        except Exception as e:
            logger.error(f"Quality check error: {e}")
            return {"is_valid": False, "error": str(e)}
