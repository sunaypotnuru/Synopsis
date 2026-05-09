"""
Grad-CAM Generator for Swin Transformer
Generates explainable AI visualizations for cataract detection

Features:
- Real Grad-CAM heatmap generation with Swin Transformer support
- Reshape transform to convert 3D transformer output to 4D CNN format
- Swin Transformer compatibility (fixes "axis 3 out of bounds" error)
- Base64 encoding for API transmission
- Attention region extraction
- Clinical feature detection

Technical Details:
- Swin-Base with patch4-window7-224 architecture
- Input: 224x224 -> Output: 7x7 feature maps
- Reshape transform: (B, 49, C) -> (B, C, 7, 7)
"""

import torch
import numpy as np
import cv2
from PIL import Image
import base64
from io import BytesIO
from typing import Dict, List, Tuple, Optional
import logging
from pytorch_grad_cam import GradCAM, GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget


class GradCAMGenerator:
    """
    Generates Grad-CAM visualizations for Swin Transformer models

    Features:
    - Real gradient-based attention visualization
    - Multiple Grad-CAM variants (GradCAM, GradCAM++)
    - Attention region extraction
    - Clinical feature detection
    - Base64 encoding for API
    """

    def __init__(
        self, model, target_layers: Optional[List] = None, input_size: int = 224
    ):
        """
        Initialize Grad-CAM generator

        Args:
            model: Swin Transformer model
            target_layers: Layers to target for Grad-CAM (auto-detect if None)
            input_size: Input image size (default: 224)
        """
        self.model = model
        self.device = next(model.parameters()).device.type
        self.logger = logging.getLogger("GradCAMGenerator")
        self.input_size = input_size

        # Calculate output spatial dimensions for Swin Transformer
        # Swin-Base with patch4-window7-224: 224 -> 56 -> 28 -> 14 -> 7
        # Formula: input_size / (patch_size * 2^(num_stages-1))
        # For patch_size=4 and 4 stages: 224 / (4 * 2^3) = 224 / 32 = 7
        self.feature_map_size = input_size // 32  # 7 for 224x224 input

        # Auto-detect target layers if not provided
        if target_layers is None:
            target_layers = self._get_target_layers()

        self.target_layers = target_layers

        # Define reshape transform for Swin Transformer
        # Converts 3D transformer output (B, L, C) to 4D CNN format (B, C, H, W)
        def reshape_transform(
            tensor, height=self.feature_map_size, width=self.feature_map_size
        ):
            """
            Reshape Swin Transformer output from 3D to 4D

            Args:
                tensor: (Batch, L, Channels) where L = H * W
                height: Spatial height (default: 7 for 224x224 input)
                width: Spatial width (default: 7 for 224x224 input)

            Returns:
                (Batch, Channels, Height, Width)
            """
            result = tensor.reshape(tensor.size(0), height, width, tensor.size(2))
            # Permute to (B, C, H, W) format
            result = result.permute(0, 3, 1, 2)
            return result

        # Initialize Grad-CAM with reshape transform
        try:
            self.grad_cam = GradCAMPlusPlus(
                model=model,
                target_layers=target_layers,
                reshape_transform=reshape_transform,
            )
            self.logger.info(f"Grad-CAM++ initialized successfully on {self.device}")
            self.logger.info(
                f"Reshape transform configured for {self.feature_map_size}x{self.feature_map_size} feature maps"
            )
        except Exception as e:
            self.logger.warning(f"Grad-CAM++ failed, falling back to Grad-CAM: {e}")
            self.grad_cam = GradCAM(
                model=model,
                target_layers=target_layers,
                reshape_transform=reshape_transform,
            )
            self.logger.info(f"Grad-CAM initialized successfully on {self.device}")
            self.logger.info(
                f"Reshape transform configured for {self.feature_map_size}x{self.feature_map_size} feature maps"
            )

    def _get_target_layers(self) -> List:
        """
        Auto-detect target layers for Swin Transformer

        Returns:
            List of target layers
        """
        try:
            # For Swin Transformer, target the last attention layer
            # Structure: model.layers[-1].blocks[-1].attn
            if hasattr(self.model, "layers"):
                # Swin Transformer structure
                last_layer = self.model.layers[-1]
                if hasattr(last_layer, "blocks"):
                    last_block = last_layer.blocks[-1]
                    if hasattr(last_block, "attn"):
                        self.logger.info("Using Swin Transformer attention layer")
                        return [last_block.attn]
                    elif hasattr(last_block, "norm1"):
                        self.logger.info("Using Swin Transformer norm1 layer")
                        return [last_block.norm1]

            # Fallback: use the last convolutional or normalization layer
            for name, module in reversed(list(self.model.named_modules())):
                if isinstance(
                    module, (torch.nn.Conv2d, torch.nn.LayerNorm, torch.nn.BatchNorm2d)
                ):
                    self.logger.info(f"Using fallback layer: {name}")
                    return [module]

            # Last resort: use the last module
            last_module = list(self.model.modules())[-1]
            self.logger.warning(f"Using last module as target: {type(last_module)}")
            return [last_module]

        except Exception as e:
            self.logger.error(f"Failed to auto-detect target layers: {e}")
            raise

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        original_image: np.ndarray,
        target_class: int = 1,
        colormap: int = cv2.COLORMAP_JET,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate Grad-CAM heatmap

        Args:
            input_tensor: Preprocessed input tensor (1, 3, 224, 224)
            original_image: Original image as numpy array (H, W, 3) in [0, 1]
            target_class: Target class for Grad-CAM (1 for cataract)
            colormap: OpenCV colormap for visualization

        Returns:
            Tuple of (heatmap, visualization)
            - heatmap: Raw Grad-CAM heatmap (H, W) in [0, 1]
            - visualization: Heatmap overlaid on original image (H, W, 3) in [0, 255]
        """
        try:
            self.logger.info(f"Input tensor shape: {input_tensor.shape}")
            self.logger.info(
                f"Original image shape: {original_image.shape}, dtype: {original_image.dtype}, range: [{original_image.min():.3f}, {original_image.max():.3f}]"
            )

            # Ensure input is on correct device
            input_tensor = input_tensor.to(self.device)

            # Create target for Grad-CAM
            targets = [ClassifierOutputTarget(target_class)]

            # Generate Grad-CAM with reshape transform
            self.logger.info("Generating Grad-CAM with reshape transform...")
            grayscale_cam = self.grad_cam(
                input_tensor=input_tensor,
                targets=targets,
                eigen_smooth=True,  # Add smoothing for better visualization
            )

            self.logger.info(f"Grayscale CAM shape: {grayscale_cam.shape}")

            # Get the heatmap for the first (and only) image
            grayscale_cam = grayscale_cam[0, :]

            self.logger.info(
                f"Grayscale CAM after indexing shape: {grayscale_cam.shape}"
            )

            # Resize original image to match heatmap if needed
            if original_image.shape[:2] != grayscale_cam.shape:
                self.logger.info(
                    f"Resizing original image from {original_image.shape[:2]} to {grayscale_cam.shape}"
                )
                original_image = cv2.resize(
                    original_image, (grayscale_cam.shape[1], grayscale_cam.shape[0])
                )
                self.logger.info(
                    f"Resized original image shape: {original_image.shape}"
                )

            # Ensure original image is in [0, 1] range and has 3 channels
            if original_image.max() > 1.0:
                self.logger.info("Normalizing image to [0, 1]")
                original_image = original_image / 255.0

            # Ensure image has exactly 3 channels (RGB)
            if original_image.ndim == 2:
                # Grayscale - convert to RGB
                self.logger.info("Converting grayscale to RGB")
                original_image = np.stack([original_image] * 3, axis=-1)
            elif len(original_image.shape) == 3 and original_image.shape[2] == 4:
                # RGBA - convert to RGB
                self.logger.info("Converting RGBA to RGB")
                original_image = original_image[:, :, :3]
            elif len(original_image.shape) == 3 and original_image.shape[2] != 3:
                raise ValueError(
                    f"Unexpected number of channels: {original_image.shape[2]}"
                )

            self.logger.info(
                f"Final original image shape before show_cam_on_image: {original_image.shape}"
            )

            # Create visualization
            self.logger.info("Creating visualization with show_cam_on_image...")
            visualization = show_cam_on_image(
                original_image, grayscale_cam, use_rgb=True, colormap=colormap
            )

            self.logger.info(f"Visualization shape: {visualization.shape}")
            self.logger.info("Grad-CAM heatmap generated successfully")

            return grayscale_cam, visualization

        except Exception as e:
            self.logger.error(f"Failed to generate Grad-CAM: {e}")
            import traceback

            self.logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def _generate_intelligent_mock_heatmap(
        self, original_image: np.ndarray, target_class: int
    ) -> np.ndarray:
        """
        Generate intelligent mock heatmap when Grad-CAM fails

        Args:
            original_image: Original image (H, W, 3) in [0, 1]
            target_class: Target class (1 for cataract)

        Returns:
            Mock heatmap (H, W) in [0, 1]
        """
        height, width = original_image.shape[:2]
        heatmap = np.zeros((height, width), dtype=np.float32)

        # Convert to grayscale for analysis
        if original_image.ndim == 3:
            gray = np.mean(original_image, axis=2)
        else:
            gray = original_image

        # For cataract detection, focus on:
        # 1. Central lens region (most important)
        # 2. Areas with opacity (low brightness)
        # 3. Areas with texture changes

        center_y, center_x = height // 2, width // 2

        for y in range(height):
            for x in range(width):
                # Distance from center (normalized)
                dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
                max_dist = np.sqrt(center_x**2 + center_y**2)
                central_weight = 1.0 - (dist / max_dist)

                # Opacity (inverse of brightness)
                opacity = 1.0 - gray[y, x]

                # Combine factors
                if target_class == 1:  # Cataract
                    attention = central_weight * 0.6 + opacity * 0.4
                else:  # Normal
                    attention = central_weight * 0.3

                heatmap[y, x] = attention

        # Apply Gaussian blur for smooth heatmap
        heatmap = cv2.GaussianBlur(heatmap, (21, 21), 0)

        # Normalize to [0, 1]
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        self.logger.info("Generated intelligent mock heatmap")

        return heatmap

    def extract_attention_regions(
        self, heatmap: np.ndarray, threshold: float = 0.5, min_area: int = 100
    ) -> List[Dict]:
        """
        Extract attention regions from heatmap

        Args:
            heatmap: Grad-CAM heatmap (H, W) in [0, 1]
            threshold: Threshold for attention (0-1)
            min_area: Minimum area for a region (pixels)

        Returns:
            List of attention regions with metadata
        """
        try:
            # Threshold the heatmap
            binary_mask = (heatmap > threshold).astype(np.uint8) * 255

            # Find contours
            contours, _ = cv2.findContours(
                binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            regions = []
            height, width = heatmap.shape

            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)

                if area < min_area:
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)

                # Calculate center
                center_x = x + w // 2
                center_y = y + h // 2

                # Calculate average attention in region
                mask = np.zeros_like(heatmap, dtype=np.uint8)
                cv2.drawContours(mask, [contour], -1, 1, -1)
                avg_attention = np.mean(heatmap[mask == 1])

                # Determine region location
                location = self._get_region_location(center_x, center_y, width, height)

                # Determine clinical feature
                feature = self._infer_clinical_feature(location, avg_attention)

                regions.append(
                    {
                        "region_id": i + 1,
                        "location": location,
                        "feature": feature,
                        "confidence": float(avg_attention),
                        "area_pixels": int(area),
                        "bounding_box": {
                            "x": int(x),
                            "y": int(y),
                            "width": int(w),
                            "height": int(h),
                        },
                        "center": {"x": int(center_x), "y": int(center_y)},
                    }
                )

            # Sort by confidence (highest first)
            regions.sort(key=lambda r: r["confidence"], reverse=True)

            self.logger.info(f"Extracted {len(regions)} attention regions")

            return regions

        except Exception as e:
            self.logger.error(f"Failed to extract attention regions: {e}")
            return []

    def _get_region_location(
        self, center_x: int, center_y: int, width: int, height: int
    ) -> str:
        """
        Determine anatomical location of region

        Args:
            center_x: X coordinate of region center
            center_y: Y coordinate of region center
            width: Image width
            height: Image height

        Returns:
            Location description
        """
        # Divide image into 9 regions (3x3 grid)
        x_third = width // 3
        y_third = height // 3

        # Determine horizontal position
        if center_x < x_third:
            h_pos = "Temporal"
        elif center_x < 2 * x_third:
            h_pos = "Central"
        else:
            h_pos = "Nasal"

        # Determine vertical position
        if center_y < y_third:
            v_pos = "Superior"
        elif center_y < 2 * y_third:
            v_pos = "Mid"
        else:
            v_pos = "Inferior"

        # Special case for center
        if h_pos == "Central" and v_pos == "Mid":
            return "Central Lens Region"

        return f"{v_pos} {h_pos} Region"

    def _infer_clinical_feature(self, location: str, confidence: float) -> str:
        """
        Infer clinical feature based on location and confidence

        Args:
            location: Anatomical location
            confidence: Attention confidence

        Returns:
            Clinical feature description
        """
        if "Central" in location:
            if confidence > 0.7:
                return "Nuclear Sclerosis"
            else:
                return "Central Lens Opacity"
        elif "Cortical" in location or "Temporal" in location or "Nasal" in location:
            return "Cortical Cataract"
        elif "Posterior" in location or "Inferior" in location:
            return "Posterior Subcapsular Cataract"
        else:
            return "Lens Opacity"

    def encode_heatmap_base64(self, visualization: np.ndarray) -> str:
        """
        Encode heatmap visualization as Base64 PNG

        Args:
            visualization: Heatmap visualization (H, W, 3) in [0, 255]

        Returns:
            Base64 encoded PNG string
        """
        try:
            # Convert to PIL Image
            image = Image.fromarray(visualization.astype(np.uint8))

            # Save to BytesIO
            buffer = BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            buffer.seek(0)

            # Encode to Base64
            base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

            self.logger.info(f"Heatmap encoded to Base64 ({len(base64_str)} chars)")

            return f"data:image/png;base64,{base64_str}"

        except Exception as e:
            self.logger.error(f"Failed to encode heatmap: {e}")
            raise

    def generate_xai_output(
        self,
        input_tensor: torch.Tensor,
        original_image: np.ndarray,
        prediction_class: int,
        threshold: float = 0.5,
    ) -> Dict:
        """
        Generate complete XAI output

        Args:
            input_tensor: Preprocessed input tensor
            original_image: Original image as numpy array
            prediction_class: Predicted class (1 for cataract)
            threshold: Threshold for attention regions

        Returns:
            Dictionary with complete XAI data
        """
        try:
            # Generate heatmap
            heatmap, visualization = self.generate_heatmap(
                input_tensor, original_image, target_class=prediction_class
            )

            # Extract attention regions
            attention_regions = self.extract_attention_regions(
                heatmap, threshold=threshold
            )

            # Encode heatmap
            heatmap_base64 = self.encode_heatmap_base64(visualization)

            # Calculate statistics
            max_attention = float(np.max(heatmap))
            mean_attention = float(np.mean(heatmap))
            attention_coverage = float(np.sum(heatmap > threshold) / heatmap.size)

            return {
                "heatmap_base64": heatmap_base64,
                "attention_regions": attention_regions,
                "xai_metadata": {
                    "method": "Grad-CAM++",
                    "target_class": int(prediction_class),
                    "max_attention": max_attention,
                    "mean_attention": mean_attention,
                    "attention_coverage": attention_coverage,
                    "num_regions": len(attention_regions),
                },
            }

        except Exception as e:
            self.logger.error(f"Failed to generate XAI output: {e}")
            raise
