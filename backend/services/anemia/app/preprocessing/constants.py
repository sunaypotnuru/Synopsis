"""
Preprocessing constants used across all pipelines.

Centralizes normalization statistics and other constants to ensure
consistency between training and inference (FIX for BUG-5).
"""

import numpy as np

# ImageNet statistics (for pretrained EfficientNet)
# These are the standard normalization values used by torchvision
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Alias for consistency across codebase
TRAIN_MEAN = IMAGENET_MEAN
TRAIN_STD = IMAGENET_STD

# Image size for model input
TARGET_SIZE = 224

# Hemoglobin range (g/dL)
HB_MIN = 5.0
HB_MAX = 18.0

# WHO Anemia thresholds (g/dL)
ANEMIA_THRESHOLD_FEMALE = 12.0
ANEMIA_THRESHOLD_MALE = 13.0
ANEMIA_THRESHOLD_CHILD = 11.0

# Anemia severity thresholds (WHO guidelines)
SEVERITY_THRESHOLDS = {
    "female": {
        "non_anemic": 12.0,
        "mild": 11.0,
        "moderate": 8.0,
        "severe": 0.0,
    },
    "male": {
        "non_anemic": 13.0,
        "mild": 11.0,
        "moderate": 8.0,
        "severe": 0.0,
    },
    "child": {
        "non_anemic": 11.0,
        "mild": 10.0,
        "moderate": 7.0,
        "severe": 0.0,
    },
}

# Contrast enhancement thresholds
CONTRAST_THRESHOLD_LOW = 30.0
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)

# ROI extraction parameters
MIN_ROI_SIZE = 100
PADDING_RATIO = 0.1

# Supported modalities
SUPPORTED_MODALITIES = ["conjunctiva", "fingernail", "palm"]
