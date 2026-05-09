"""
Cataract Detection AI - Production Deployment Code
Model: Swin-Base Transformer
Performance: 96% Sensitivity, 90.2% Specificity
Status: Production Ready with XAI Support (Phase 2)
"""

import torch
import torch.nn.functional as F
import timm
import logging
from typing import Dict, Optional, Union
import time
import os
import numpy as np


class CataractDetector:
    """
    Production-ready cataract detection system with XAI support

    Features:
    - 96% sensitivity (industrial level)
    - 90.2% specificity
    - Optimized threshold (0.20)
    - Production error handling
    - Performance monitoring
    - Grad-CAM explainability (Phase 2)
    """

    def __init__(
        self, model_path: str, device: Optional[str] = None, enable_xai: bool = True
    ):
        """
        Initialize the cataract detector

        Args:
            model_path: Path to the trained model file
            device: Device to run inference on ('cuda', 'cpu', or None for auto)
            enable_xai: Whether to enable XAI (Grad-CAM) support
        """
        self.model_path = model_path
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.threshold = 0.20  # Optimized threshold for 96% sensitivity
        self.enable_xai = enable_xai

        # Model specifications
        self.model_name = "swin_base_patch4_window7_224"
        self.input_size = (224, 224)
        self.num_classes = 2

        # Performance metrics
        self.expected_sensitivity = 0.96
        self.expected_specificity = 0.902
        self.expected_accuracy = 0.908

        # Initialize model
        self.model = None
        self.gradcam_generator = None
        self._setup_logging()
        self._load_model()

        # Initialize Grad-CAM if enabled
        if self.enable_xai:
            self._initialize_gradcam()

        # Performance tracking
        self.prediction_count = 0
        self.total_inference_time = 0.0

    def _setup_logging(self):
        """Setup logging for the detector"""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger("CataractDetector")

    def _load_model(self):
        """Load the trained model"""
        try:
            self.logger.info(f"Loading model from {self.model_path}")

            # Verify model file exists
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model file not found: {self.model_path}")

            # Create model architecture
            self.model = timm.create_model(
                self.model_name, pretrained=False, num_classes=self.num_classes
            )

            # Load trained weights
            state_dict = torch.load(self.model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)

            # Move to device and set to evaluation mode
            self.model = self.model.to(self.device)
            self.model.eval()

            self.logger.info(f"Model loaded successfully on {self.device}")

        except Exception as e:
            self.logger.error(f"Failed to load model: {e}")
            raise

    def _initialize_gradcam(self):
        """Initialize Grad-CAM generator for XAI"""
        try:
            from app.gradcam_generator import GradCAMGenerator

            self.gradcam_generator = GradCAMGenerator(
                model=self.model, target_layers=None  # Auto-detect
            )

            self.logger.info("Grad-CAM initialized successfully")

        except Exception as e:
            self.logger.warning(f"Failed to initialize Grad-CAM: {e}")
            self.enable_xai = False
            self.gradcam_generator = None

    def predict(self, image_tensor: torch.Tensor) -> Dict[str, Union[str, float]]:
        """
        Predict cataract from preprocessed image tensor

        Args:
            image_tensor: Preprocessed image tensor

        Returns:
            Dictionary containing prediction results
        """
        start_time = time.time()

        try:
            # Add batch dimension if needed
            if image_tensor.dim() == 3:
                image_tensor = image_tensor.unsqueeze(0)

            # Move to device
            image_tensor = image_tensor.to(self.device)

            # Run inference
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = F.softmax(outputs, dim=1)
                cataract_probability = probabilities[0, 1].item()

            # Make prediction based on optimized threshold
            prediction = (
                "CATARACT DETECTED"
                if cataract_probability >= self.threshold
                else "NORMAL"
            )
            confidence = (
                cataract_probability
                if prediction == "CATARACT DETECTED"
                else (1 - cataract_probability)
            )

            # Calculate processing time
            processing_time = time.time() - start_time

            # Update performance tracking
            self.prediction_count += 1
            self.total_inference_time += processing_time

            # Prepare result
            result = {
                "prediction": prediction,
                "cataract_probability": cataract_probability,
                "confidence": confidence,
                "threshold": self.threshold,
                "processing_time_ms": processing_time * 1000,
                "model_info": {
                    "architecture": "Swin-Base Transformer",
                    "sensitivity": self.expected_sensitivity,
                    "specificity": self.expected_specificity,
                    "version": "1.0",
                },
            }

            # Log prediction
            self.logger.info(
                f"Prediction: {prediction}, "
                f"Probability: {cataract_probability:.3f}, "
                f"Time: {processing_time*1000:.1f}ms"
            )

            return result

        except Exception as e:
            self.logger.error(f"Prediction failed: {e}")
            raise

    def get_model_info(self) -> Dict[str, Union[str, float, int]]:
        """
        Get detailed model information

        Returns:
            Dictionary with model specifications
        """
        return {
            "model_name": self.model_name,
            "architecture": "Swin-Base Transformer",
            "input_size": self.input_size,
            "num_classes": self.num_classes,
            "threshold": self.threshold,
            "device": self.device,
            "model_path": self.model_path,
            "expected_performance": {
                "sensitivity": self.expected_sensitivity,
                "specificity": self.expected_specificity,
                "accuracy": self.expected_accuracy,
            },
            "clinical_interpretation": {
                "sensitivity_meaning": f"Detects {self.expected_sensitivity:.1%} of cataract cases",
                "specificity_meaning": f"Correctly identifies {self.expected_specificity:.1%} of normal cases",
                "npv_meaning": "98.3% reliable when predicting 'normal'",
                "ppv_meaning": "54.1% accurate when predicting 'cataract' (needs confirmation)",
            },
        }

    def predict_with_xai(
        self, image_tensor: torch.Tensor, original_image: np.ndarray
    ) -> Dict[str, Union[str, float, Dict]]:
        """
        Predict cataract with XAI (Grad-CAM) visualization

        Args:
            image_tensor: Preprocessed image tensor
            original_image: Original image as numpy array (H, W, 3) in [0, 1]

        Returns:
            Dictionary containing prediction results + XAI data
        """
        if not self.enable_xai or self.gradcam_generator is None:
            self.logger.warning("XAI not enabled, falling back to standard prediction")
            return self.predict(image_tensor)

        start_time = time.time()

        try:
            # Add batch dimension if needed
            if image_tensor.dim() == 3:
                image_tensor = image_tensor.unsqueeze(0)

            # Move to device
            image_tensor = image_tensor.to(self.device)

            # Run inference
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = F.softmax(outputs, dim=1)
                cataract_probability = probabilities[0, 1].item()

            # Make prediction based on optimized threshold
            prediction = (
                "CATARACT DETECTED"
                if cataract_probability >= self.threshold
                else "NORMAL"
            )
            confidence = (
                cataract_probability
                if prediction == "CATARACT DETECTED"
                else (1 - cataract_probability)
            )
            predicted_class = 1 if prediction == "CATARACT DETECTED" else 0

            # Generate XAI visualization
            xai_start = time.time()
            xai_output = self.gradcam_generator.generate_xai_output(
                input_tensor=image_tensor,
                original_image=original_image,
                prediction_class=predicted_class,
                threshold=0.5,
            )
            xai_time = time.time() - xai_start

            # Calculate total processing time
            processing_time = time.time() - start_time

            # Update performance tracking
            self.prediction_count += 1
            self.total_inference_time += processing_time

            # Prepare result with XAI data
            result = {
                "prediction": prediction,
                "cataract_probability": cataract_probability,
                "confidence": confidence,
                "threshold": self.threshold,
                "processing_time_ms": processing_time * 1000,
                "xai_processing_time_ms": xai_time * 1000,
                "model_info": {
                    "architecture": "Swin-Base Transformer",
                    "sensitivity": self.expected_sensitivity,
                    "specificity": self.expected_specificity,
                    "version": "1.0",
                },
                # XAI data
                "heatmap_base64": xai_output["heatmap_base64"],
                "attention_regions": xai_output["attention_regions"],
                "xai_metadata": xai_output["xai_metadata"],
                "xai_enabled": True,
            }

            # Log prediction with XAI
            self.logger.info(
                f"Prediction with XAI: {prediction}, "
                f"Probability: {cataract_probability:.3f}, "
                f"Time: {processing_time*1000:.1f}ms "
                f"(XAI: {xai_time*1000:.1f}ms), "
                f"Regions: {len(xai_output['attention_regions'])}"
            )

            return result

        except Exception as e:
            self.logger.error(f"Prediction with XAI failed: {e}")
            # Fallback to standard prediction
            self.logger.info("Falling back to standard prediction")
            return self.predict(image_tensor)
