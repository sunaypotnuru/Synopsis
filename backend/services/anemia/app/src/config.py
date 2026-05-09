"""
config.py - Configuration settings for NetraAI
"""

from pathlib import Path

# ===== Base Directories =====
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root
MODELS_DIR = BASE_DIR / "models"
LOGS_DIR = BASE_DIR / "logs"  # keep if needed for other logs

# ===== Output Directories for Saved Images =====
OUTPUT_DIR = BASE_DIR / "outputs"  # new root for all outputs
ORIGINALS_DIR = OUTPUT_DIR / "originals"  # user original images
CROPPED_DIR = OUTPUT_DIR / "cropped"  # extracted 64x64 conjunctiva
HEATMAPS_DIR = OUTPUT_DIR / "heatmaps"  # GradCAM visualizations

# Create directories automatically (optional, but convenient)
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
CROPPED_DIR.mkdir(parents=True, exist_ok=True)
HEATMAPS_DIR.mkdir(parents=True, exist_ok=True)

# ===== Model Settings =====
MODEL_PATH = MODELS_DIR / "best_enhanced.h5"
INPUT_SIZE = 64
USE_DIP = False
LAST_CONV_LAYER = "conv2d_2"

# Legacy support
GRADCAM_DIR = HEATMAPS_DIR

# ===== Extraction Settings =====
EXTRACTION_SIZE_THRESHOLD = 300
AUTO_SKIP_EXTRACTION = True

# Class names
CLASS_NAMES = ["Non-Anemic", "Anemic"]

# ===== Severity Thresholds =====
SEVERITY_THRESHOLDS = {"mild": 0.70, "moderate": 0.85, "severe": 0.95}

# ===== Hemoglobin Estimates (g/dL) =====
HB_ESTIMATES = {"normal": 13.5, "mild": 11.5, "moderate": 9.5, "severe": 7.0}

# ===== Deployment & Staging Settings =====
ENV = "STAGING"  # Options: "PRODUCTION", "STAGING"
PILOT_QUORUM = 200  # Minimum total cases before reporting pilot metrics
ANEMIA_QUORUM = 50  # Minimum confirmed anemia cases before reporting
DRIFT_ALERT_THRESHOLD = 0.05  # 5% deviation threshold for drift alerts

# ===== Auto-Save Settings =====
SAVE_ORIGINAL = True  # save a copy of the input image
SAVE_CROPPED = True  # save the 64x64 cropped conjunctiva
SAVE_HEATMAP = True  # save GradCAM heatmap (if generated)
