"""
PyTorch-based pipeline for anemia detection using the new 99.63% accuracy model.
Integrates with existing API structure while using the new multi-modal architecture.
"""

import torch
import numpy as np
import cv2
from pathlib import Path
import logging
from datetime import datetime
import uuid

# Import the new PyTorch components
from .multi_modal_model import MultiModalModel
from ..preprocessing.roi_extractor import ROIExtractor
from ..preprocessing.constants import IMAGENET_MEAN, IMAGENET_STD
from .integrate_trained_models import IntegratedConjunctivaPipeline
from .exceptions import InferenceError

# Import existing components for compatibility
from .config import (
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

MEDICAL_DISCLAIMER = (
    "DISCLAIMER: This software is for research purposes only and has not "
    "received FDA/ICMR/CE validation. Do not use for definitive clinical diagnosis."
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NetraAIPyTorchPipeline:
    """
    PyTorch-based pipeline using the new 99.63% accuracy multi-modal model.
    Maintains compatibility with existing API while using advanced architecture.
    """

    def __init__(self):
        logger.info("=" * 60)
        logger.info("NETRA AI - INITIALIZING PYTORCH PIPELINE")
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

        # Initialize preprocessing components
        self.roi_extractor = ROIExtractor()
        self.conjunctiva_pipeline = IntegratedConjunctivaPipeline(
            device=str(self.device)
        )

        # Rate limiting
        self.last_request_time = None
        self.min_interval = 0.5  # 500ms between requests

        logger.info(f"Originals will be saved to: {ORIGINALS_DIR}")
        logger.info(f"Cropped images will be saved to: {CROPPED_DIR}")
        logger.info(f"Heatmaps will be saved to: {HEATMAPS_DIR}")
        logger.info("PyTorch Pipeline initialized successfully!")
        logger.info("=" * 60)

    def _generate_filename(self, prefix: str, extension: str = ".jpg") -> str:
        """Generate a unique filename with timestamp and UUID."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}_{timestamp}_{unique_id}{extension}"

    def _save_image(self, image: np.ndarray, directory: Path, prefix: str) -> Path:
        """Save an image to the given directory with a generated filename."""
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

        # Default to conjunctiva for backward compatibility
        return "conjunctiva"

    def _preprocess_image(self, image_bgr: np.ndarray, modality: str) -> torch.Tensor:
        """
        Preprocess image for PyTorch model inference.
        Returns 4-channel tensor (RGB + L*a*b* a*).
        """
        try:
            if modality == "conjunctiva":
                # Use advanced conjunctiva pipeline
                # Convert BGR to RGB for the pipeline
                image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

                # Save temporarily for pipeline processing
                temp_path = f"/tmp/temp_conjunctiva_{uuid.uuid4().hex[:8]}.jpg"
                cv2.imwrite(temp_path, image_bgr)

                try:
                    result = self.conjunctiva_pipeline.process(
                        temp_path, return_intermediates=False
                    )

                    if result["success"]:
                        return result["preprocessed"].unsqueeze(0).to(self.device)
                    else:
                        logger.warning(
                            f"Conjunctiva pipeline failed: {result.get('message', 'Unknown error')}"
                        )
                        # Fall back to basic ROI extraction
                        raise Exception(
                            "Pipeline failed, falling back to ROI extraction"
                        )

                finally:
                    # Clean up temp file
                    try:
                        Path(temp_path).unlink()
                    except (OSError, FileNotFoundError):
                        pass

            # Use basic ROI extraction for fingernail/palm or conjunctiva fallback
            roi_dict = self.roi_extractor.extract_from_array(
                image_bgr, modality=modality
            )
            image_rgb = roi_dict["rgb"]  # uint8 HWC

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
        extraction_method = "pytorch_pipeline"

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

            # Save cropped image if requested (extract from tensor for visualization)
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

            # Generate heatmap (placeholder - would need GradCAM implementation for PyTorch)
            heatmap_path = None
            if save_heatmap:
                # TODO: Implement PyTorch GradCAM
                logger.info("Heatmap generation not yet implemented for PyTorch model")

            # Result
            result = {
                "success": True,
                "version": "v2.0.0-pytorch",
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
                "heatmap_path": str(heatmap_path) if heatmap_path else None,
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }

            # Audit logging
            audit_logger.log_inference(
                image_bgr=image_bgr,
                probability=float(prob),
                classification=final_diagnosis,
                is_low_confidence=bool(is_low_confidence),
                extraction_method=extraction_method,
                version="v2.0.0-pytorch",
                env=ENV,
                metadata=metadata,
            )

            return result

        except Exception as e:
            logger.error(f"PyTorch prediction failed: {e}", exc_info=True)

            # Log failure
            audit_logger.log_inference(
                image_bgr=image_bgr,
                probability=float(prob),
                classification=final_diagnosis,
                is_low_confidence=bool(is_low_confidence),
                extraction_method=extraction_method,
                version="v2.0.0-pytorch",
                env=ENV,
                metadata=metadata,
            )

            return {
                "success": False,
                "error": str(e),
                "diagnosis": "INCONCLUSIVE",
                "is_low_confidence": True,
                "version": "v2.0.0-pytorch",
                "probability": 0.0,
                "confidence": 0.0,
                "original_image_path": None,
                "cropped_image_path": None,
                "heatmap_path": None,
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }

    def predict_from_file(
        self,
        image_path,
        eye="left",
        save_heatmap=SAVE_HEATMAP,
        save_original=SAVE_ORIGINAL,
        save_cropped=SAVE_CROPPED,
        session_id=None,
        metadata=None,
        debug=False,
    ):
        """Run pipeline from an image file."""
        image_path = Path(image_path)
        if not image_path.exists():
            return {
                "success": False,
                "error": f"File not found: {image_path}",
                "original_image_path": None,
                "cropped_image_path": None,
                "heatmap_path": None,
            }

        image_bgr = cv2.imread(str(image_path))
        if image_bgr is None:
            return {
                "success": False,
                "error": f"Cannot read image: {image_path}",
                "original_image_path": None,
                "cropped_image_path": None,
                "heatmap_path": None,
            }

        result = self.predict(
            image_bgr,
            eye=eye,
            save_heatmap=save_heatmap,
            save_original=save_original,
            save_cropped=save_cropped,
            image_source=image_path.name,
            session_id=session_id,
            metadata=metadata,
            debug=debug,
        )
        result["input_image_path"] = str(image_path)
        return result


# Global instance for PyTorch pipeline
_pytorch_pipeline = None


def get_pytorch_pipeline():
    """Get global PyTorch pipeline instance."""
    global _pytorch_pipeline
    if _pytorch_pipeline is None:
        _pytorch_pipeline = NetraAIPyTorchPipeline()
    return _pytorch_pipeline
