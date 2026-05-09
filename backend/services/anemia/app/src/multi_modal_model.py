"""
Multi-modal multi-task model for anemia detection.

Architecture:
- Dual EfficientNetV2B0 branches (conjunctiva + fingernail)
- Feature fusion layer
- Dual prediction heads (classification + regression)
"""

import timm
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Optional, Tuple

try:
    from exceptions import ModelError
    from utils import get_logger
except ImportError:
    # Fallback for direct execution
    import sys
    from pathlib import Path

    sys.path.append(str(Path(__file__).parent))
    from exceptions import ModelError
    from utils import get_logger

logger = get_logger("models.multi_modal_model")


class MultiModalModel(nn.Module):
    """
    Multi-modal multi-task model for anemia detection.

    Supports both conjunctiva and fingernail images with:
    - Binary classification (anemic/non-anemic)
    - Hemoglobin level regression (g/dL)
    """

    def __init__(
        self,
        input_shape: Tuple[int, int, int] = (3, 224, 224),
        pretrained: bool = True,
        dropout_rate: float = 0.3,
        fusion_dim: int = 512,
        classification_hidden: int = 128,
        regression_hidden: int = 128,
    ):
        """
        Initialize multi-modal model.

        Args:
            input_shape: Input image shape (C, H, W)
            pretrained: Whether to use pretrained ImageNet weights
            dropout_rate: Dropout rate for regularization
            fusion_dim: Dimension of fusion layer
            classification_hidden: Hidden dimension for classification head
            regression_hidden: Hidden dimension for regression head
        """
        super().__init__()

        self.input_shape = input_shape
        self.dropout_rate = dropout_rate

        # Conjunctiva branch
        self.conjunctiva_backbone = self._create_backbone(pretrained)
        self.conjunctiva_projection = nn.Sequential(
            nn.Linear(1000, 256),  # EfficientNetV2B0 outputs 1000 features
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )

        # Fingernail branch
        self.fingernail_backbone = self._create_backbone(pretrained)
        self.fingernail_projection = nn.Sequential(
            nn.Linear(1000, 256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )

        # Palm branch
        self.palm_backbone = self._create_backbone(pretrained)
        self.palm_projection = nn.Sequential(
            nn.Linear(1000, 256),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )

        # Feature fusion (for dual-modal input)
        self.fusion = nn.Sequential(
            nn.Linear(512, fusion_dim),  # 256 + 256 = 512
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )

        # Single-branch fusion (for single-modality input)
        self.single_branch_fusion = nn.Sequential(
            nn.Linear(256, fusion_dim),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
        )

        # Classification head
        # NOTE: No sigmoid here! BCEWithLogitsLoss applies it internally
        self.classification_head = nn.Sequential(
            nn.Linear(fusion_dim, classification_hidden),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(classification_hidden, 1),
            # Removed nn.Sigmoid() - BCEWithLogitsLoss handles this
        )

        # Regression head
        self.regression_head = nn.Sequential(
            nn.Linear(fusion_dim, regression_hidden),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(regression_hidden, 1),
        )

        logger.info(
            f"MultiModalModel initialized: pretrained={pretrained}, "
            f"dropout={dropout_rate}, fusion_dim={fusion_dim}"
        )

    def _create_backbone(self, pretrained: bool) -> nn.Module:
        """
        Create EfficientNetV2B0 backbone modified for 4-channel input.

        The 4th channel is the L*a*b* 'a*' channel which directly encodes
        the red-green axis — the primary pallor signal for anemia detection.

        Strategy: Load pretrained 3-channel weights, then extend the first
        conv layer to accept a 4th channel initialized from the mean of RGB
        weights (transfer learning friendly).
        """
        try:
            # Load standard 3-channel pretrained model first
            model = timm.create_model(
                "tf_efficientnetv2_b0",
                pretrained=pretrained,
                num_classes=1000,
                in_chans=3,
            )

            # Extend first conv layer to 4 channels
            old_conv = (
                model.conv_stem
            )  # or model.features[0][0] depending on timm version
            new_conv = nn.Conv2d(
                4,
                old_conv.out_channels,
                kernel_size=old_conv.kernel_size,
                stride=old_conv.stride,
                padding=old_conv.padding,
                bias=old_conv.bias is not None,
            )

            # Copy pretrained RGB weights, initialize 4th channel as mean of RGB
            with torch.no_grad():
                new_conv.weight[:, :3, :, :] = old_conv.weight
                new_conv.weight[:, 3:4, :, :] = old_conv.weight.mean(
                    dim=1, keepdim=True
                )
                if old_conv.bias is not None:
                    new_conv.bias = old_conv.bias

            model.conv_stem = new_conv
            return model

        except Exception as e:
            logger.warning(f"4-channel init failed ({e}), falling back to 3-channel")
            # Fallback: standard 3-channel model
            model = timm.create_model(
                "tf_efficientnetv2_b0",
                pretrained=pretrained,
                num_classes=1000,
                in_chans=3,
            )
            return model

    def forward(
        self,
        x: torch.Tensor,
        modality: str,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass through model.

        Args:
            x: Input image tensor (B, C, H, W)
            modality: Image modality ("conjunctiva" or "fingernail")

        Returns:
            Tuple of (classification_logits, regression_predictions)
        """
        # Each modality uses its own branch + single-branch fusion
        if modality == "conjunctiva":
            features = self.conjunctiva_backbone(x)
            features = self.conjunctiva_projection(features)
        elif modality == "fingernail":
            features = self.fingernail_backbone(x)
            features = self.fingernail_projection(features)
        elif modality == "palm":
            features = self.palm_backbone(x)
            features = self.palm_projection(features)
        else:
            raise ModelError(
                f"Invalid modality: {modality}. Must be 'conjunctiva', 'fingernail', or 'palm'"
            )

        # Single-modality path (no zero-padding)
        fused = self.single_branch_fusion(features)

        # Predictions
        classification_output = self.classification_head(fused)
        regression_output = self.regression_head(fused)

        return classification_output, regression_output

    def forward_multi_modal(
        self,
        conjunctiva_x: torch.Tensor,
        fingernail_x: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass with both modalities (for ensemble predictions).

        Args:
            conjunctiva_x: Conjunctiva image tensor (B, C, H, W)
            fingernail_x: Fingernail image tensor (B, C, H, W)

        Returns:
            Tuple of (classification_logits, regression_predictions)
        """
        # Extract features from both branches
        conj_features = self.conjunctiva_backbone(conjunctiva_x)
        conj_features = self.conjunctiva_projection(conj_features)

        finger_features = self.fingernail_backbone(fingernail_x)
        finger_features = self.fingernail_projection(finger_features)

        # Concatenate features
        fused_features = torch.cat([conj_features, finger_features], dim=1)

        # Fusion
        fused = self.fusion(fused_features)

        # Predictions
        classification_output = self.classification_head(fused)
        regression_output = self.regression_head(fused)

        return classification_output, regression_output

    def compute_loss(
        self,
        class_pred: torch.Tensor,
        class_true: torch.Tensor,
        reg_pred: torch.Tensor,
        reg_true: Optional[torch.Tensor],
        modality: str,
        alpha: float = 0.5,
    ) -> torch.Tensor:
        """
        Compute combined multi-task loss with proper None/NaN handling (FIXED BUG-6).

        Classification: Binary cross-entropy (anemic vs non-anemic)
        Regression: MSE on Hb level when available

        WHO Anemia Severity Thresholds (for reference in inference):
        - Non-anemic: Hb >= 12 g/dL (women) / 13 g/dL (men)
        - Mild: Hb 10-12 g/dL
        - Moderate: Hb 7-10 g/dL
        - Severe: Hb < 7 g/dL
        """
        # Classification loss (always computed)
        # Note: Using BCEWithLogitsLoss which applies sigmoid internally
        class_loss = F.binary_cross_entropy_with_logits(
            class_pred.view(-1), class_true.view(-1), reduction="mean"
        )

        # Regression loss (only when Hb labels available and valid)
        if reg_true is not None and not torch.isnan(reg_true).all():
            # Create mask for valid Hb values (not NaN)
            valid_mask = ~torch.isnan(reg_true.view(-1))

            if valid_mask.any():
                # Compute loss only on valid samples
                reg_loss = F.mse_loss(
                    reg_pred.view(-1)[valid_mask],
                    reg_true.view(-1)[valid_mask],
                    reduction="mean",
                )
                total_loss = alpha * class_loss + (1 - alpha) * reg_loss
            else:
                # No valid Hb labels in this batch - classification only
                total_loss = class_loss
        else:
            # No Hb labels provided - classification only
            total_loss = class_loss

        return total_loss

    @staticmethod
    def classify_severity(hb_level: float, gender: str = "unknown") -> str:
        """
        Classify anemia severity based on WHO hemoglobin thresholds.

        WHO Thresholds:
        - Adult women: Non-anemic >= 12.0, Mild 11.0-11.9, Moderate 8.0-10.9, Severe < 8.0
        - Adult men:   Non-anemic >= 13.0, Mild 11.0-12.9, Moderate 8.0-10.9, Severe < 8.0
        - Children:    Non-anemic >= 11.0, Mild 10.0-10.9, Moderate 7.0-9.9,  Severe < 7.0

        Args:
            hb_level: Predicted hemoglobin level in g/dL
            gender: 'male', 'female', 'child', or 'unknown'

        Returns:
            Severity string: 'Non-Anemic', 'Mild Anemia', 'Moderate Anemia', 'Severe Anemia'
        """
        if gender == "male":
            if hb_level >= 13.0:
                return "Non-Anemic"
            elif hb_level >= 11.0:
                return "Mild Anemia"
            elif hb_level >= 8.0:
                return "Moderate Anemia"
            else:
                return "Severe Anemia"
        elif gender == "female":
            if hb_level >= 12.0:
                return "Non-Anemic"
            elif hb_level >= 11.0:
                return "Mild Anemia"
            elif hb_level >= 8.0:
                return "Moderate Anemia"
            else:
                return "Severe Anemia"
        elif gender == "child":
            if hb_level >= 11.0:
                return "Non-Anemic"
            elif hb_level >= 10.0:
                return "Mild Anemia"
            elif hb_level >= 7.0:
                return "Moderate Anemia"
            else:
                return "Severe Anemia"
        else:
            # Unknown gender: use conservative female thresholds
            if hb_level >= 12.0:
                return "Non-Anemic"
            elif hb_level >= 11.0:
                return "Mild Anemia"
            elif hb_level >= 8.0:
                return "Moderate Anemia"
            else:
                return "Severe Anemia"

    def freeze_backbones(self):
        """Freeze backbone parameters for fine-tuning."""
        for param in self.conjunctiva_backbone.parameters():
            param.requires_grad = False
        for param in self.fingernail_backbone.parameters():
            param.requires_grad = False
        for param in self.palm_backbone.parameters():
            param.requires_grad = False
        logger.info("Backbones frozen (conjunctiva, fingernail, palm)")

    def unfreeze_backbones(self):
        """Unfreeze backbone parameters."""
        for param in self.conjunctiva_backbone.parameters():
            param.requires_grad = True
        for param in self.fingernail_backbone.parameters():
            param.requires_grad = True
        for param in self.palm_backbone.parameters():
            param.requires_grad = True
        logger.info("Backbones unfrozen (conjunctiva, fingernail, palm)")

    def get_num_parameters(self) -> Dict[str, int]:
        """Get number of parameters in model."""
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)

        return {
            "total": total,
            "trainable": trainable,
            "frozen": total - trainable,
        }
