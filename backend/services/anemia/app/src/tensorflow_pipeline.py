"""
pipeline.py - Complete pipeline with organized image saving
"""

import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path
import logging
from datetime import datetime
import uuid

from eye_extractor import EyeExtractor
from enhancer import MedicalEnhancer
from gradcam import GradCAM
import audit_logger
from config import (
    MODELS_DIR,
    ORIGINALS_DIR,
    CROPPED_DIR,
    HEATMAPS_DIR,
    SEVERITY_THRESHOLDS,
    HB_ESTIMATES,
    USE_DIP,
    SAVE_ORIGINAL,
    SAVE_CROPPED,
    SAVE_HEATMAP,
    ENV,
)

MEDICAL_DISCLAIMER = (
    "DISCLAIMER: This software is for research purposes only and has not "
    "received FDA/ICMR/CE validation. Do not use for definitive clinical diagnosis."
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NetraAIPipeline:
    def __init__(self):
        logger.info("=" * 60)
        logger.info("NETRA AI - INITIALIZING PIPELINE")
        logger.info("=" * 60)

        # Load model
        model_path = MODELS_DIR / "best_enhanced.h5"
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
        self.model = tf.keras.models.load_model(str(model_path))
        logger.info(f"Model loaded: {model_path}")

        # Initialize components
        self.extractor = EyeExtractor()
        self.enhancer = MedicalEnhancer() if USE_DIP else None
        self.gradcam = GradCAM(self.model)

        # Rate Limiting (Simple implementation)
        self.last_request_time = None
        self.min_interval = 0.5  # 500ms between requests

        # Log output directories
        logger.info(f"Originals will be saved to: {ORIGINALS_DIR}")
        logger.info(f"Cropped images will be saved to: {CROPPED_DIR}")
        logger.info(f"Heatmaps will be saved to: {HEATMAPS_DIR}")
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
        Run full pipeline and save images to organized folders.

        Args:
            image_bgr: Input image (BGR format)
            eye: 'left' or 'right'
            save_cropped: Whether to save the 64x64 cropped conjunctiva
            image_source: Original filename or identifier (for naming)
            session_id: Optional session/user ID to include in folder structure
            metadata: Optional dictionary with clinical metadata (age, sex, hb, etc.)
            debug: Whether to save intermediate raw ROI before resizing

        Returns:
            Dictionary with results and saved file paths
        """
        # ---- Rate Limiting ----
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

        # ---- Defaults for logging ----
        prob = 0.0
        is_low_confidence = True
        final_diagnosis = "INCONCLUSIVE"
        extraction_method = "failed_or_unknown"

        try:
            # ---- Save original if requested ----
            original_path = None
            if save_original:
                # Determine prefix
                if image_source:
                    source_stem = Path(image_source).stem
                    prefix = f"{source_stem}_original"
                else:
                    prefix = f"original_{eye}"
                if session_id:
                    prefix = f"{session_id}_{prefix}"
                original_path = self._save_image(image_bgr, ORIGINALS_DIR, prefix)

            # ---- Extract LOWER CONJUNCTIVA only ----
            is_cropped = self.extractor.is_already_cropped(image_bgr)
            if is_cropped:
                tissue_bgr = cv2.resize(image_bgr, (64, 64))
                extraction_method = "pre-cropped"
            else:
                # Use debug param if passed in via session_id or another way, here we can just pass debug=False for now since we'll add it to predict_from_file
                debug = kwargs.get("debug", False)
                tissue_bgr = self.extractor.extract_lower_conjunctiva(
                    image_bgr, eye=eye, debug=debug, session_id=session_id
                )
                extraction_method = "lower_conjunctiva_extraction"

            if tissue_bgr is None:
                extraction_method = "extraction_failed"
                raise ValueError("Extraction failed, tissue is None")

            if tissue_bgr.shape != (64, 64, 3):
                tissue_bgr = cv2.resize(tissue_bgr, (64, 64))

            # ---- Save cropped image if requested ----
            cropped_path = None
            if save_cropped:
                if image_source:
                    source_stem = Path(image_source).stem
                    prefix = f"{source_stem}_cropped_{eye}"
                else:
                    prefix = f"cropped_{eye}"
                if session_id:
                    prefix = f"{session_id}_{prefix}"
                cropped_path = self._save_image(tissue_bgr, CROPPED_DIR, prefix)

            # ---- Preprocess for model ----
            model_input = self._preprocess_tissue(tissue_bgr, is_cropped=is_cropped)

            # ---- Model inference ----
            prob = float(self.model.predict(model_input, verbose=0)[0][0])
            threshold = 0.5
            is_anemic = prob > threshold
            confidence = prob if is_anemic else 1 - prob

            # ---- Severity estimation ----
            if not is_anemic:
                severity = "Normal"
                hb = HB_ESTIMATES["normal"]
            elif confidence < SEVERITY_THRESHOLDS["mild"]:
                severity = "Mild"
                hb = HB_ESTIMATES["mild"]
            elif confidence < SEVERITY_THRESHOLDS["moderate"]:
                severity = "Moderate"
                hb = HB_ESTIMATES["moderate"]
            else:
                severity = "Severe"
                hb = HB_ESTIMATES["severe"]
            # ---- Confidence Guardrail (Clinical Requirement) ----
            is_low_confidence = 0.45 <= prob <= 0.55

            # ---- Fail-Safe: Default to Inconclusive on low confidence ----
            final_diagnosis = (
                "INCONCLUSIVE"
                if is_low_confidence
                else ("ANEMIC" if is_anemic else "NORMAL")
            )

            # ---- GradCAM ----
            heatmap_path = None
            if save_heatmap:
                heatmap_path = self._generate_heatmap(
                    model_input,
                    tissue_bgr,
                    image_source=image_source,
                    eye=eye,
                    prob=prob,
                    diagnosis=final_diagnosis.lower(),
                    session_id=session_id,
                )

            # ---- Result ----
            result = {
                "success": True,
                "version": "v1.0.0",
                "probability": prob,
                "is_anemic": is_anemic if not is_low_confidence else None,
                "diagnosis": final_diagnosis,
                "is_low_confidence": is_low_confidence,
                "confidence": confidence,
                "severity": severity if not is_low_confidence else "Unknown",
                "hemoglobin_estimate": hb if not is_low_confidence else None,
                "extraction_method": extraction_method,
                "original_image_path": str(original_path) if original_path else None,
                "cropped_image_path": str(cropped_path) if cropped_path else None,
                "heatmap_path": str(heatmap_path) if heatmap_path else None,
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }

            # ---- Audit Logging (Secure Immutable Append-Only) ----
            audit_logger.log_inference(
                image_bgr=image_bgr,
                probability=float(prob),
                classification=final_diagnosis,
                is_low_confidence=bool(is_low_confidence),
                extraction_method=extraction_method,
                version="v1.0.0",
                env=ENV,
                metadata=metadata,
            )

            return result

        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            # Log failure even if exception occurred (using defaults for diagnostic result)
            audit_logger.log_inference(
                image_bgr=image_bgr,
                probability=float(prob),
                classification=final_diagnosis,
                is_low_confidence=bool(is_low_confidence),
                extraction_method=extraction_method,
                version="v1.0.0",
                env=ENV,
                metadata=metadata,
            )
            return {
                "success": False,
                "error": str(e),
                "diagnosis": "INCONCLUSIVE",
                "is_low_confidence": True,
                "version": "v1.0.0",
                "probability": 0.0,
                "confidence": 0.0,
                "original_image_path": None,
                "cropped_image_path": None,
                "heatmap_path": None,
                "medical_disclaimer": MEDICAL_DISCLAIMER,
            }

    def _preprocess_tissue(self, tissue_bgr, is_cropped=False):
        """Convert tissue to model input tensor (Finalized: Raw only)."""
        # Strictly preserve original color distribution
        tissue_rgb = cv2.cvtColor(tissue_bgr, cv2.COLOR_BGR2RGB)
        tissue_norm = tissue_rgb.astype(np.float32) / 255.0
        return np.expand_dims(tissue_norm, axis=0)

    def _generate_heatmap(
        self,
        model_input,
        tissue_bgr,
        image_source=None,
        eye="left",
        prob=None,
        diagnosis=None,
        session_id=None,
    ):
        """Generate and save GradCAM heatmap."""
        try:
            # Build prefix
            if image_source:
                source_stem = Path(image_source).stem
                prefix = f"{source_stem}_heatmap_{eye}"
            else:
                prefix = f"heatmap_{eye}"
            if prob is not None and diagnosis is not None:
                prob_str = f"{prob:.3f}".replace(".", "_")
                prefix = f"{prefix}_{diagnosis}_{prob_str}"
            if session_id:
                prefix = f"{session_id}_{prefix}"

            filename = self._generate_filename(prefix, ".png")
            save_path = HEATMAPS_DIR / filename

            # Convert BGR to RGB for overlay
            original_rgb = cv2.cvtColor(tissue_bgr, cv2.COLOR_BGR2RGB)
            self.gradcam.generate_overlay(
                model_input, original_rgb, save=True, save_path=save_path
            )
            logger.info(f"Heatmap saved: {save_path}")
            return save_path
        except Exception as e:
            logger.warning(f"GradCAM failed: {e}")
            return None

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


# Global instance
_tensorflow_pipeline = None


def get_tensorflow_pipeline():
    global _tensorflow_pipeline
    if _tensorflow_pipeline is None:
        _tensorflow_pipeline = NetraAIPipeline()
    return _tensorflow_pipeline
