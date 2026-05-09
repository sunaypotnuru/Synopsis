"""
Inference module for anemia detection.

Provides standalone prediction functionality for trained models.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple
import sys

import cv2
import numpy as np
import torch

# Handle imports with fallbacks
try:
    from exceptions import InferenceError, ModelError
    from multi_modal_model import MultiModalModel
    from utils import get_logger
except ImportError:
    # Fallback for direct execution
    sys.path.append(str(Path(__file__).parent))
    from exceptions import InferenceError, ModelError
    from multi_modal_model import MultiModalModel
    from utils import get_logger

try:
    from integrate_trained_models import IntegratedConjunctivaPipeline

    INTEGRATED_PIPELINE_AVAILABLE = True
except ImportError:
    IntegratedConjunctivaPipeline = None
    INTEGRATED_PIPELINE_AVAILABLE = False

# Try to import preprocessing components
try:
    sys.path.append(str(Path(__file__).parent.parent))
    from preprocessing.roi_extractor import ROIExtractor
    from preprocessing.constants import IMAGENET_MEAN, IMAGENET_STD
except ImportError:
    ROIExtractor = None
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]

logger = get_logger("inference")


@dataclass
class PredictionResult:
    """Result of anemia prediction."""

    is_anemic: bool
    anemic_probability: float
    hemoglobin_level: Optional[float]
    modality: str
    confidence_interval: Optional[Tuple[float, float]] = None

    def __str__(self) -> str:
        """String representation."""
        result = (
            f"Prediction Result ({self.modality}):\n"
            f"  Anemic: {'Yes' if self.is_anemic else 'No'}\n"
            f"  Probability: {self.anemic_probability:.4f}\n"
        )

        if self.hemoglobin_level is not None:
            result += f"  Hemoglobin Level: {self.hemoglobin_level:.2f} g/dL\n"

        if self.confidence_interval is not None:
            result += f"  95% CI: [{self.confidence_interval[0]:.2f}, {self.confidence_interval[1]:.2f}] g/dL\n"

        return result


def predict(
    model_path: str,
    image_path: str,
    modality: Optional[str] = None,
    device: str = "cuda" if torch.cuda.is_available() else "cpu",
    use_corrected_pipeline: bool = True,
) -> PredictionResult:
    """
    Predict anemia status and hemoglobin level for single image.

    Args:
        model_path: Path to trained model file (.pt)
        image_path: Path to input image
        modality: Image modality ("conjunctiva" or "fingernail"), auto-detected if None
        device: Device to run inference on
        use_corrected_pipeline: Use corrected pipeline for conjunctiva images (recommended)

    Returns:
        PredictionResult with predictions

    Raises:
        ModelError: If model file invalid
        InferenceError: If prediction fails
    """
    try:
        logger.info(f"Loading model from {model_path}")

        # Load model
        device = torch.device(device)
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)

        # Initialize model
        model = MultiModalModel()
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(device)
        model.eval()

        logger.info(f"Model loaded successfully on {device}")

        # Initialize preprocessing
        roi_extractor = ROIExtractor() if ROIExtractor is not None else None
        conjunctiva_pipeline = None

        if use_corrected_pipeline and INTEGRATED_PIPELINE_AVAILABLE:
            conjunctiva_pipeline = IntegratedConjunctivaPipeline(device=str(device))

        # Detect modality if not provided
        if modality is None:
            modality = roi_extractor.detect_modality(image_path)
            logger.info(f"Auto-detected modality: {modality}")

        # Preprocess image
        logger.info(f"Processing image: {image_path}")

        if use_corrected_pipeline and modality == "conjunctiva":
            # Use corrected pipeline for conjunctiva
            result = conjunctiva_pipeline.process(
                image_path, return_intermediates=False
            )

            if not result["success"]:
                raise InferenceError(
                    f"Failed to process image: {result.get('message', 'Unknown error')}",
                    details={"image_path": image_path},
                )

            image_tensor = result["preprocessed"].unsqueeze(0).to(device)

            # Log warnings
            if result.get("warnings"):
                for warning in result["warnings"]:
                    logger.info(f"  {warning}")
        else:
            # Use original ROI extractor
            roi_dict = roi_extractor.extract(image_path, modality=modality)
            image = roi_dict["rgb"]  # uint8 HWC

            # Normalize to match training preprocessing
            image_f = image.astype(np.float32) / 255.0
            image_f = (image_f - IMAGENET_MEAN) / IMAGENET_STD

            # Add L*a*b* a* channel to match 4-channel model input
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB).astype(np.float32)
            a_channel = lab[:, :, 1] / 255.0  # [0, 1]
            a_expanded = a_channel[:, :, np.newaxis]  # (H, W, 1)
            combined = np.concatenate([image_f, a_expanded], axis=2)  # (H, W, 4)

            # Convert to tensor
            image_tensor = (
                torch.from_numpy(combined).permute(2, 0, 1).unsqueeze(0).float()
            )
            image_tensor = image_tensor.to(device)

        # Run inference
        with torch.no_grad():
            class_pred, reg_pred = model(image_tensor, modality)

        # Extract predictions — apply sigmoid since model outputs raw logits
        anemic_prob = torch.sigmoid(class_pred).squeeze().item()
        is_anemic = anemic_prob > 0.5

        # Hemoglobin prediction (only meaningful for fingernail)
        hb_level = None
        if modality == "fingernail":
            hb_level = reg_pred.squeeze().item()
            # Clip to reasonable range
            hb_level = np.clip(hb_level, 5.0, 18.0)

        result = PredictionResult(
            is_anemic=is_anemic,
            anemic_probability=anemic_prob,
            hemoglobin_level=hb_level,
            modality=modality,
        )

        logger.info(f"Prediction complete:\n{result}")

        return result

    except Exception as e:
        if isinstance(e, (InferenceError, ModelError)):
            raise
        logger.error(f"Prediction failed for {image_path}: {str(e)}", exc_info=True)
        raise InferenceError(
            f"Prediction failed: {str(e)}",
            details={"image_path": image_path, "model_path": model_path},
        ) from e


class InferenceScript:
    """
    Inference script for batch predictions.
    """

    def __init__(
        self,
        model_path: str,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        use_corrected_pipeline: bool = True,
    ):
        """
        Initialize inference script.

        Args:
            model_path: Path to trained model
            device: Device to run inference on
            use_corrected_pipeline: Use corrected pipeline for conjunctiva images (recommended)
        """
        self.device = torch.device(device)
        self.roi_extractor = ROIExtractor()
        self.use_corrected_pipeline = use_corrected_pipeline

        if use_corrected_pipeline:
            # Use the model-based integrated pipeline with MediaPipe validator
            self.conjunctiva_pipeline = IntegratedConjunctivaPipeline(
                device=str(self.device)
            )
        else:
            self.conjunctiva_pipeline = None

        # Load model
        logger.info(f"Loading model from {model_path}")
        checkpoint = torch.load(
            model_path, map_location=self.device, weights_only=False
        )

        self.model = MultiModalModel()
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()

        logger.info(
            f"InferenceScript initialized on {self.device} (corrected_pipeline={use_corrected_pipeline})"
        )

    def predict_single(
        self,
        image_path: str,
        modality: Optional[str] = None,
    ) -> PredictionResult:
        """
        Predict for single image.

        Args:
            image_path: Path to image
            modality: Image modality (auto-detected if None)

        Returns:
            PredictionResult
        """
        # Detect modality if needed
        if modality is None:
            modality = self.roi_extractor.detect_modality(image_path)

        # Preprocess image
        if self.use_corrected_pipeline and modality == "conjunctiva":
            # Use corrected pipeline
            result = self.conjunctiva_pipeline.process(
                image_path, return_intermediates=False
            )

            if not result["success"]:
                raise InferenceError(
                    f"Failed to process image: {result.get('message', 'Unknown error')}",
                    details={"image_path": image_path},
                )

            image_tensor = result["preprocessed"].unsqueeze(0).to(self.device)
        else:
            # Use original ROI extractor
            roi_dict = self.roi_extractor.extract(image_path, modality=modality)
            image = roi_dict["rgb"]  # uint8 HWC

            # Normalize to match training preprocessing
            image_f = image.astype(np.float32) / 255.0
            image_f = (image_f - IMAGENET_MEAN) / IMAGENET_STD

            # Add L*a*b* a* channel to match 4-channel model input
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB).astype(np.float32)
            a_channel = lab[:, :, 1] / 255.0
            a_expanded = a_channel[:, :, np.newaxis]
            combined = np.concatenate([image_f, a_expanded], axis=2)

            # Convert to tensor
            image_tensor = (
                torch.from_numpy(combined).permute(2, 0, 1).unsqueeze(0).float()
            )
            image_tensor = image_tensor.to(self.device)

        # Inference
        with torch.no_grad():
            class_pred, reg_pred = self.model(image_tensor, modality)

        # Extract results — apply sigmoid since model outputs raw logits
        anemic_prob = torch.sigmoid(class_pred).squeeze().item()
        is_anemic = anemic_prob > 0.5

        hb_level = None
        if modality == "fingernail":
            hb_level = reg_pred.squeeze().item()
            hb_level = np.clip(hb_level, 5.0, 18.0)

        return PredictionResult(
            is_anemic=is_anemic,
            anemic_probability=anemic_prob,
            hemoglobin_level=hb_level,
            modality=modality,
        )

    def predict_batch(
        self,
        image_paths: list,
        modalities: Optional[list] = None,
    ) -> list:
        """
        Predict for batch of images.

        Args:
            image_paths: List of image paths
            modalities: List of modalities (auto-detected if None)

        Returns:
            List of PredictionResult objects
        """
        if modalities is None:
            modalities = [None] * len(image_paths)

        results = []
        for img_path, modality in zip(image_paths, modalities):
            try:
                result = self.predict_single(img_path, modality)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to predict for {img_path}: {str(e)}")
                results.append(None)

        return results
