"""
Simplified PyTorch pipeline for anemia detection.
This version focuses on core functionality without complex dependencies.
"""

import torch
import numpy as np
import cv2
from pathlib import Path
from datetime import datetime
import uuid
import sys

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from multi_modal_model import MultiModalModel
from exceptions import InferenceError
from utils import get_logger

# Import existing components for compatibility
try:
    from config import (
        MODELS_DIR,
        ORIGINALS_DIR,
        CROPPED_DIR,
        HEATMAPS_DIR,
        SEVERITY_THRESHOLDS,
        HB_ESTIMATES,
        SAVE_ORIGINAL,
        SAVE_CROPPED,
        SAVE_HEATMAP,
        ENV,
    )
    import audit_logger
except ImportError:
    # Fallback values if config not available
    MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
    ORIGINALS_DIR = Path("outputs/originals")
    CROPPED_DIR = Path("outputs/cropped")
    HEATMAPS_DIR = Path("outputs/heatmaps")
    SEVERITY_THRESHOLDS = {"mild": 0.6, "moderate": 0.8}
    HB_ESTIMATES = {"normal": 13.5, "mild": 11.0, "moderate": 9.0, "severe": 7.0}
    SAVE_ORIGINAL = False
    SAVE_CROPPED = False
    SAVE_HEATMAP = False
    ENV = "development"
    audit_logger = None

MEDICAL_DISCLAIMER = (
    "DISCLAIMER: This software is for research purposes only and has not "
    "received FDA/ICMR/CE validation. Do not use for definitive clinical diagnosis."
)

# ImageNet normalization constants
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

logger = get_logger("simple_pytorch_pipeline")


class SimpleNetraAIPyTorchPipeline:
    """
    Simplified PyTorch-based pipeline using the new 99.63% accuracy multi-modal model.
    """

    def __init__(self):
        logger.info("=" * 60)
        logger.info("NETRA AI - INITIALIZING SIMPLE PYTORCH PIPELINE")
        logger.info("=" * 60)

        # Device selection
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")

        # Load PyTorch model
        model_path = MODELS_DIR / "best_model.pt"
        if not model_path.exists():
            raise FileNotFoundError(f"PyTorch model not found at {model_path}")

        logger.info(f"Loading PyTorch model: {model_path}")
        checkpoint = torch.load(
            model_path, map_location=self.device, weights_only=False
        )

        self.model = MultiModalModel()
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()

        # Log model info
        if "epoch" in checkpoint:
            logger.info(f"Model trained for {checkpoint['epoch']} epochs")
        if "best_val_acc" in checkpoint:
            logger.info(f"Best validation accuracy: {checkpoint['best_val_acc']:.4f}")

        # Rate limiting
        self.last_request_time = None
        self.min_interval = 0.5  # 500ms between requests

        logger.info("Simple PyTorch Pipeline initialized successfully!")
        logger.info("=" * 60)

    def _generate_filename(self, prefix: str, extension: str = ".jpg") -> str:
        """Generate a unique filename with timestamp and UUID."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}_{timestamp}_{unique_id}{extension}"

    def _save_image(self, image: np.ndarray, directory: Path, prefix: str) -> Path:
        """Save an image to the given directory with a generated filename."""
        directory.mkdir(parents=True, exist_ok=True)
        filename = self._generate_filename(prefix, ".jpg")
        save_path = directory / filename
        cv2.imwrite(str(save_path), image)
        logger.debug(f"Saved: {save_path}")
        return save_path

    def _detect_modality(self, image_bgr: np.ndarray, image_source: str = None) -> str:
        """
        Detect image modality based on filename or image characteristics.
        Defaults to conjunctiva for compatibility with existing API.
        """
        if image_source:
            filename = str(image_source).lower()
            if "fingernail" in filename or "nail" in filename:
                return "fingernail"
            elif "palm" in filename:
                return "palm"
            elif "conjunctiva" in filename or "eye" in filename:
                return "conjunctiva"

        # Simple heuristic: if image is more red than green, likely conjunctiva
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        r_mean = np.mean(image_rgb[:, :, 0])
        g_mean = np.mean(image_rgb[:, :, 1])

        if r_mean / (g_mean + 1e-6) > 1.1:
            return "conjunctiva"
        else:
            return "fingernail"  # Default fallback

    def _preprocess_image(self, image_bgr: np.ndarray, modality: str) -> torch.Tensor:
        """
        Preprocess image for PyTorch model inference.
        Returns 4-channel tensor (RGB + L*a*b* a*).
        """
        try:
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

            # Resize to model input size
            image_rgb = cv2.resize(image_rgb, (224, 224))

            # Normalize to match training preprocessing
            image_f = image_rgb.astype(np.float32) / 255.0
            image_f = (image_f - np.array(IMAGENET_MEAN)) / np.array(IMAGENET_STD)

            # Add L*a*b* a* channel to match 4-channel model input
            lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
            a_channel = lab[:, :, 1] / 255.0  # [0, 1]
            a_expanded = a_channel[:, :, np.newaxis]  # (H, W, 1)
            combined = np.concatenate([image_f, a_expanded], axis=2)  # (H, W, 4)

            # Convert to tensor
            image_tensor = (
                torch.from_numpy(combined).permute(2, 0, 1).unsqueeze(0).float()
            )
            return image_tensor.to(self.device)

        except Exception as e:
            logger.error(f"Preprocessing failed for modality {modality}: {e}")
            raise InferenceError(f"Image preprocessing failed: {str(e)}")

    def predict(
        self,
        image_bgr,
        eye="left",
        save_heatmap=SAVE_HEATMAP,
        save_original=SAVE_ORIGINAL,
        save_cropped=SAVE_CROPPED,
        image_source=None,
        session_id=None,
        metadata=None,
        **kwargs,
    ):
        """
        Run full pipeline using PyTorch model.
        Maintains compatibility with existing API structure.
        """
        # Rate limiting
        import time

        now = time.time()
        if (
            self.last_request_time
            and (now - self.last_request_time) < self.min_interval
        ):
            return {
                "success": False,
                "error": "Rate limit exceeded. Please wait.",
                "diagnosis": "INCONCLUSIVE",
            }
        self.last_request_time = now

        # Initialize defaults for logging
        prob = 0.0
        is_low_confidence = True
        final_diagnosis = "INCONCLUSIVE"
        extraction_method = "simple_pytorch_pipeline"

        try:
            # Save original if requested
            original_path = None
            if save_original:
                if image_source:
                    source_stem = Path(image_source).stem
                    prefix = f"{source_stem}_original"
                else:
                    prefix = f"original_{eye}"
                if session_id:
                    prefix = f"{session_id}_{prefix}"
                original_path = self._save_image(image_bgr, ORIGINALS_DIR, prefix)

            # Detect modality
            modality = self._detect_modality(image_bgr, image_source)
            logger.info(f"Detected modality: {modality}")

            # Preprocess image
            image_tensor = self._preprocess_image(image_bgr, modality)

            # Save cropped image if requested
            cropped_path = None
            if save_cropped:
                # Convert tensor back to image for saving
                tensor_cpu = image_tensor.squeeze(0).cpu()
                # Take only RGB channels for visualization
                rgb_tensor = tensor_cpu[:3]
                # Denormalize
                rgb_denorm = rgb_tensor * torch.tensor(IMAGENET_STD).view(
                    3, 1, 1
                ) + torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
                rgb_denorm = torch.clamp(rgb_denorm, 0, 1)
                # Convert to numpy and save
                rgb_np = (rgb_denorm.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
                rgb_bgr = cv2.cvtColor(rgb_np, cv2.COLOR_RGB2BGR)

                if image_source:
                    source_stem = Path(image_source).stem
                    prefix = f"{source_stem}_cropped_{modality}"
                else:
                    prefix = f"cropped_{modality}"
                if session_id:
                    prefix = f"{session_id}_{prefix}"
                cropped_path = self._save_image(rgb_bgr, CROPPED_DIR, prefix)

            # Model inference
            with torch.no_grad():
                class_logits, hb_pred = self.model(image_tensor, modality)

            # Extract predictions - apply sigmoid since model outputs raw logits
            prob = torch.sigmoid(class_logits).squeeze().item()
            is_anemic = prob > 0.5
            confidence = prob if is_anemic else 1 - prob

            # Hemoglobin prediction (only meaningful for fingernail)
            hb_level = None
            if modality == "fingernail":
                hb_level = hb_pred.squeeze().item()
                hb_level = np.clip(hb_level, 5.0, 18.0)  # Clip to reasonable range

            # Severity estimation
            if not is_anemic:
                severity = "Normal"
                if hb_level is None:
                    hb_level = HB_ESTIMATES["normal"]
            elif confidence < SEVERITY_THRESHOLDS["mild"]:
                severity = "Mild"
                if hb_level is None:
                    hb_level = HB_ESTIMATES["mild"]
            elif confidence < SEVERITY_THRESHOLDS["moderate"]:
                severity = "Moderate"
                if hb_level is None:
                    hb_level = HB_ESTIMATES["moderate"]
            else:
                severity = "Severe"
                if hb_level is None:
                    hb_level = HB_ESTIMATES["severe"]

            # Confidence guardrail (clinical requirement)
            is_low_confidence = 0.45 <= prob <= 0.55

            # Final diagnosis
            final_diagnosis = (
                "INCONCLUSIVE"
                if is_low_confidence
                else ("ANEMIC" if is_anemic else "NORMAL")
            )

            # Result
            result = {
                "success": True,
                "version": "v2.0.0-pytorch-simple",
                "model_accuracy": "99.63%",
                "modality": modality,
                "probability": prob,
                "is_anemic": is_anemic if not is_low_confidence else None,
                "diagnosis": final_diagnosis,
                "is_low_confidence": is_low_confidence,
                "confidence": confidence,
                "severity": severity if not is_low_confidence else "Unknown",
                "hemoglobin_estimate": hb_level if not is_low_confidence else None,
                "extraction_method": extraction_method,
                "original_image_path": str(original_path) if original_path else None,
                "cropped_image_path": str(cropped_path) if cropped_path else None,
                "heatmap_path": None,  # Not implemented in simple version
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }

            # Audit logging (if available)
            if audit_logger:
                audit_logger.log_inference(
                    image_bgr=image_bgr,
                    probability=float(prob),
                    classification=final_diagnosis,
                    is_low_confidence=bool(is_low_confidence),
                    extraction_method=extraction_method,
                    version="v2.0.0-pytorch-simple",
                    env=ENV,
                    metadata=metadata,
                )

            return result

        except Exception as e:
            logger.error(f"Simple PyTorch prediction failed: {e}", exc_info=True)

            # Log failure (if available)
            if audit_logger:
                audit_logger.log_inference(
                    image_bgr=image_bgr,
                    probability=float(prob),
                    classification=final_diagnosis,
                    is_low_confidence=bool(is_low_confidence),
                    extraction_method=extraction_method,
                    version="v2.0.0-pytorch-simple",
                    env=ENV,
                    metadata=metadata,
                )

            return {
                "success": False,
                "error": str(e),
                "diagnosis": "INCONCLUSIVE",
                "is_low_confidence": True,
                "version": "v2.0.0-pytorch-simple",
                "probability": 0.0,
                "confidence": 0.0,
                "original_image_path": None,
                "cropped_image_path": None,
                "heatmap_path": None,
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }


# Global instance for simple PyTorch pipeline
_simple_pytorch_pipeline = None


def get_simple_pytorch_pipeline():
    """Get global simple PyTorch pipeline instance."""
    global _simple_pytorch_pipeline
    if _simple_pytorch_pipeline is None:
        _simple_pytorch_pipeline = SimpleNetraAIPyTorchPipeline()
    return _simple_pytorch_pipeline
