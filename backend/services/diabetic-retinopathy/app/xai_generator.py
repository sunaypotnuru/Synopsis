"""
Explainable AI (XAI) Generator for Diabetic Retinopathy (DR)
Model: EfficientNet-B5

Features:
- Real Grad-CAM heatmap generation for CNNs
- Attention region extraction and clinical mapping
- Base64 encoding for external transmission
"""

import torch
import numpy as np
import cv2
from PIL import Image
import base64
from io import BytesIO
from typing import Dict, List, Tuple
import logging
from pytorch_grad_cam import GradCAMPlusPlus, GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget


# Target the specific grade branch in our DRModelIndustrial
class DRGradeOutputTarget(ClassifierOutputTarget):
    def __init__(self, category):
        super().__init__(category)

    def __call__(self, model_output):
        # Our model returns a dict: {'grade': logits, 'binary': logits}
        # We target the grade logits
        if isinstance(model_output, dict):
            grade_output = model_output["grade"]
            # Ensure it's a tensor
            if hasattr(grade_output, "shape"):
                return grade_output[:, self.category]
            else:
                # If it's not a tensor, log and raise error
                raise ValueError(
                    f"Expected tensor for 'grade', got {type(grade_output)}"
                )
        # Fallback to parent implementation
        return super().__call__(model_output)


class DRXAIGenerator:
    """
    Generates Grad-CAM visualizations for EfficientNet-B5 DR Model.
    """

    def __init__(self, model):
        self.model = model
        self.device = next(model.parameters()).device.type
        self.logger = logging.getLogger("DRXAIGenerator")

        # Create a wrapper that returns only the grade logits for Grad-CAM
        class ModelWrapper(torch.nn.Module):
            def __init__(self, base_model):
                super().__init__()
                self.base_model = base_model

            def forward(self, x):
                # Get the model output
                output = self.base_model(x)
                # Return only the grade logits (not the dict)
                if isinstance(output, dict):
                    return output["grade"]
                return output

        self.wrapped_model = ModelWrapper(model)

        # Target the final Convolutional Head of EfficientNet-B5
        # The structure is: model.backbone.conv_head
        target_layers = [self.model.backbone.conv_head]

        # Initialize Grad-CAM with the wrapped model
        try:
            self.grad_cam = GradCAMPlusPlus(
                model=self.wrapped_model, target_layers=target_layers
            )
            self.logger.info(
                f"Grad-CAM++ initialized successfully for DR on {self.device}"
            )
        except Exception as e:
            self.logger.warning(f"Grad-CAM++ failed, falling back to Grad-CAM: {e}")
            self.grad_cam = GradCAM(
                model=self.wrapped_model, target_layers=target_layers
            )
            self.logger.info(
                f"Grad-CAM initialized successfully for DR on {self.device}"
            )

    def generate_heatmap(
        self, input_tensor: torch.Tensor, original_image: np.ndarray, target_class: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        try:
            input_tensor = input_tensor.to(self.device)

            # Use standard ClassifierOutputTarget since wrapper returns tensor
            targets = [ClassifierOutputTarget(target_class)]

            grayscale_cam = self.grad_cam(input_tensor=input_tensor, targets=targets)

            grayscale_cam = grayscale_cam[0, :]

            if original_image.shape[:2] != grayscale_cam.shape:
                original_image = cv2.resize(
                    original_image, (grayscale_cam.shape[1], grayscale_cam.shape[0])
                )

            if original_image.max() > 1.0:
                original_image = original_image / 255.0

            visualization = show_cam_on_image(
                original_image, grayscale_cam, use_rgb=True, colormap=cv2.COLORMAP_JET
            )
            return grayscale_cam, visualization

        except Exception as e:
            self.logger.error(f"Failed to generate Grad-CAM for DR: {e}")
            raise

    def encode_heatmap_base64(self, visualization: np.ndarray) -> str:
        try:
            image = Image.fromarray(visualization.astype(np.uint8))
            buffer = BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            buffer.seek(0)
            base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{base64_str}"
        except Exception as e:
            self.logger.error(f"Failed to encode heatmap: {e}")
            raise

    def extract_attention_regions(
        self, heatmap: np.ndarray, threshold: float = 0.5
    ) -> List[Dict]:
        try:
            binary_mask = (heatmap > threshold).astype(np.uint8) * 255
            contours, _ = cv2.findContours(
                binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            regions = []
            height, width = heatmap.shape

            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if area < 100:
                    continue

                x, y, w, h = cv2.boundingRect(contour)
                center_x = x + w // 2
                center_y = y + h // 2

                mask = np.zeros_like(heatmap, dtype=np.uint8)
                cv2.drawContours(mask, [contour], -1, 1, -1)
                avg_attention = float(np.mean(heatmap[mask == 1]))

                # Basic positional logic specific to retinal fundus images
                if center_x < width / 3:
                    h_pos = "Temporal"
                elif center_x > 2 * width / 3:
                    h_pos = "Nasal"
                else:
                    h_pos = "Central Macular"

                if center_y < height / 3:
                    v_pos = "Superior"
                elif center_y > 2 * height / 3:
                    v_pos = "Inferior"
                else:
                    v_pos = "Mid"

                location = f"{v_pos} {h_pos} Region"
                feature = (
                    "Retinal Hemorrhage / Exudate"
                    if avg_attention > 0.7
                    else "Microaneurysm Activity"
                )

                regions.append(
                    {
                        "region_id": i + 1,
                        "location": location,
                        "feature": feature,
                        "confidence": avg_attention,
                        "area_pixels": int(area),
                        "bounding_box": {
                            "x": int(x),
                            "y": int(y),
                            "width": int(w),
                            "height": int(h),
                        },
                    }
                )

            regions.sort(key=lambda r: r["confidence"], reverse=True)
            return regions
        except Exception as e:
            self.logger.error(f"Failed to extract regions: {e}")
            return []

    def generate_xai_output(
        self,
        input_tensor: torch.Tensor,
        original_image: np.ndarray,
        prediction_class: int,
        threshold: float = 0.5,
    ) -> Dict:
        try:
            heatmap, visualization = self.generate_heatmap(
                input_tensor, original_image, prediction_class
            )
            attention_regions = self.extract_attention_regions(heatmap, threshold)
            heatmap_base64 = self.encode_heatmap_base64(visualization)

            return {
                "heatmap_base64": heatmap_base64,
                "attention_regions": attention_regions,
                "xai_metadata": {
                    "method": "Grad-CAM++",
                    "target_class": int(prediction_class),
                    "num_regions": len(attention_regions),
                },
            }
        except Exception as e:
            self.logger.error(f"Failed generating complete XAI payload: {e}")
            raise
