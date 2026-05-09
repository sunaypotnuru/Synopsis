import csv
import hashlib
import cv2
import numpy as np
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("logs")
AUDIT_FILE = LOG_DIR / "audit.csv"


def calculate_anemia_status(hb_value, sex):
    """
    Calculate anemic status based on sex-specific Hb thresholds.
    < 12.0 g/dL (Female) = Anemic
    < 13.0 g/dL (Male) = Anemic
    """
    if hb_value is None or sex is None:
        return None

    sex = str(sex).upper()
    if sex == "FEMALE" or sex == "F":
        return hb_value < 12.0
    elif sex == "MALE" or sex == "M":
        return hb_value < 13.0
    return None


def init_logger():
    """Ensure log directory and audit file exist with headers."""
    if not LOG_DIR.exists():
        LOG_DIR.mkdir(parents=True)

    if not AUDIT_FILE.exists():
        with open(AUDIT_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "timestamp",
                    "image_hash_sha256",
                    "model_version",
                    "probability",
                    "classification",
                    "is_low_confidence",
                    "extraction_method",
                    "environment",
                    "device_type",
                    "resolution",
                    "mean_luminance",
                    "subject_age",
                    "subject_sex",
                    "capture_environment",
                    "hb_lab_value",
                    "hb_confirmed_anemia",
                    "time_delta_seconds",
                    "clinician_decision",
                    "override_reason",
                ]
            )


def log_inference(
    image_bgr,
    probability,
    classification,
    is_low_confidence,
    extraction_method,
    version="v1.0.0",
    env="PRODUCTION",
    metadata=None,
):
    """
    Log inference details with expanded clinical metadata.
    """
    init_logger()

    metadata = metadata or {}

    # Generate SHA-256 hash of image pixels
    img_hash = hashlib.sha256(image_bgr.tobytes()).hexdigest()
    timestamp = datetime.utcnow().isoformat()

    # Calculate Hb status if ground truth is provided
    hb_v = metadata.get("hb_lab_value")
    sex = metadata.get("subject_sex")
    hb_anemic = calculate_anemia_status(hb_v, sex)

    # Image stats
    h, w = image_bgr.shape[:2]
    res = f"{w}x{h}"
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    mean_lum = float(np.mean(gray))

    with open(AUDIT_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                timestamp,
                img_hash,
                version,
                f"{probability:.4f}",
                classification,
                is_low_confidence,
                extraction_method,
                env,
                metadata.get("device_type", "unknown"),
                res,
                f"{mean_lum:.2f}",
                metadata.get("subject_age", "N/A"),
                sex or "N/A",
                metadata.get("capture_environment", "unknown"),
                hb_v if hb_v is not None else "N/A",
                hb_anemic if hb_anemic is not None else "N/A",
                metadata.get("time_delta_seconds", "N/A"),
                metadata.get("clinician_decision", "N/A"),
                metadata.get("override_reason", "N/A"),
            ]
        )


if __name__ == "__main__":
    init_logger()
    print(f"Audit logger initialized at {AUDIT_FILE}")
