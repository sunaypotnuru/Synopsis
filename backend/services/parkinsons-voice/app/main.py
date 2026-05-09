"""
Parkinson's Disease Detection Service
Uses LightGBM model with 70.9% accuracy
33 acoustic biomarkers for voice analysis
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import TYPE_CHECKING, List, Optional
import logging
import warnings
warnings.filterwarnings('ignore', category=UserWarning)
import os
import json
import joblib
import numpy as np
import librosa

# parselmouth is a native C-extension installed via Docker (python:3.10 full image).
# The TYPE_CHECKING guard suppresses the static-analysis warning on Windows dev machines
# where the package is not installed — it is always available at runtime inside Docker.
if not TYPE_CHECKING:
    import parselmouth
    from parselmouth.praat import call
else:  # pragma: no cover
    parselmouth = None  # type: ignore[assignment]
    call = None  # type: ignore[assignment]
from pathlib import Path
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Parkinson's Voice Detection Service", version="2.0.0")

# Configure CORS
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {allowed_origins}")


class ParkinsonDetector:
    """
    Parkinson's Disease Detection Model

    Performance:
    - Accuracy: 70.9%
    - Precision: 73.2%
    - Recall: 64.7%
    - F1 Score: 68.7%
    """

    def __init__(self, model_dir=None):
        if model_dir is None:
            # Resolve relative to the parent directory (sibling of 'app')
            model_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"
            )
        self.model_dir = Path(model_dir)

        logger.info("Loading Parkinson's Detection Model...")

        try:
            self.model = joblib.load(self.model_dir / "model.pkl")

            # Load scaler
            with open(self.model_dir / "scaler.json", "r") as f:
                scaler_data = json.load(f)

            self.scaler_mean = np.array(scaler_data["mean"])
            self.scaler_std = np.array(scaler_data["std"])
            self.feature_names = scaler_data["features"]

            # Load metrics
            with open(self.model_dir / "metrics.json", "r") as f:
                self.metrics = json.load(f)

            logger.info("✅ Model loaded successfully")
            logger.info(f"   Accuracy: {self.metrics['accuracy']*100:.1f}%")
            logger.info(f"   Features: {len(self.feature_names)}")

            self.model_loaded = True

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model_loaded = False
            raise

    def scale_features(self, features):
        """Apply StandardScaler transformation"""
        return (features - self.scaler_mean) / self.scaler_std

    def extract_features(self, audio_path: str) -> Optional[np.ndarray]:
        """
        Extract 33 acoustic biomarkers from audio file

        Features:
        - Pitch (4): mean, std, min, max
        - Jitter (5): local, abs, rap, ppq, ddp
        - Shimmer (6): local, db, apq3, apq5, apq11, dda
        - Harmonic (2): HNR, NHR
        - Nonlinear (3): PPE, spread1, spread2
        - MFCC (13): mfcc_1 through mfcc_13
        """
        try:
            # Load audio
            y, sr = librosa.load(audio_path, sr=16000, duration=10.0)

            if len(y) < 1000:
                logger.warning("Audio file too short")
                return None

            # Parselmouth for voice analysis
            sound = parselmouth.Sound(str(audio_path))

            features = []

            # 1. Pitch Features (4)
            pitch = call(sound, "To Pitch", 0.0, 75, 600)
            pitch_values = pitch.selected_array["frequency"]
            pitch_values = pitch_values[pitch_values > 0]

            if len(pitch_values) > 0:
                features.extend(
                    [
                        float(np.mean(pitch_values)),  # mean_pitch
                        float(np.std(pitch_values)),  # stdev_pitch
                        float(np.max(pitch_values)),  # MDVP_Fhi
                        float(np.min(pitch_values)),  # MDVP_Flo
                    ]
                )
            else:
                features.extend([0, 0, 0, 0])

            # 2. Jitter Features (5)
            point_process = None
            try:
                point_process = call(sound, "To PointProcess (periodic, cc)", 75, 600)
                features.extend(
                    [
                        float(
                            call(
                                point_process,
                                "Get jitter (local)",
                                0,
                                0,
                                0.0001,
                                0.02,
                                1.3,
                            )
                        ),
                        float(
                            call(
                                point_process,
                                "Get jitter (local, absolute)",
                                0,
                                0,
                                0.0001,
                                0.02,
                                1.3,
                            )
                        ),
                        float(
                            call(
                                point_process,
                                "Get jitter (rap)",
                                0,
                                0,
                                0.0001,
                                0.02,
                                1.3,
                            )
                        ),
                        float(
                            call(
                                point_process,
                                "Get jitter (ppq5)",
                                0,
                                0,
                                0.0001,
                                0.02,
                                1.3,
                            )
                        ),
                        float(
                            call(
                                point_process,
                                "Get jitter (ddp)",
                                0,
                                0,
                                0.0001,
                                0.02,
                                1.3,
                            )
                        ),
                    ]
                )
            except Exception:
                features.extend([0, 0, 0, 0, 0])

            # 3. Shimmer Features (6)
            if point_process is not None:
                try:
                    features.extend(
                        [
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (local)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (local, dB)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (apq3)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (apq5)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (apq11)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                            float(
                                call(
                                    [sound, point_process],
                                    "Get shimmer (dda)",
                                    0,
                                    0,
                                    0.0001,
                                    0.02,
                                    1.3,
                                    1.6,
                                )
                            ),
                        ]
                    )
                except Exception:
                    features.extend([0, 0, 0, 0, 0, 0])
            else:
                features.extend([0, 0, 0, 0, 0, 0])

            # 4. Harmonic Features (2)
            try:
                harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
                hnr = float(call(harmonicity, "Get mean", 0, 0))
                nhr = float(1.0 / (10 ** (hnr / 10.0)) if hnr > 0 else 1.0)
                features.extend([hnr, nhr])
            except Exception:
                features.extend([0, 0])

            # 5. Nonlinear Features (3)
            try:
                # PPE (Pitch Period Entropy)
                if len(pitch_values) > 1:
                    periods = 1.0 / pitch_values
                    ppe = -np.sum(
                        (periods / np.sum(periods))
                        * np.log2(periods / np.sum(periods) + 1e-10)
                    )
                else:
                    ppe = 0

                # Spread1 and Spread2
                spread1 = float(
                    np.std(np.diff(pitch_values)) / np.mean(pitch_values)
                    if np.mean(pitch_values) > 0
                    else 0
                )
                spread2 = float(np.std(y) / (np.mean(np.abs(y)) + 1e-10))

                features.extend([float(ppe), spread1, spread2])
            except Exception:
                features.extend([0, 0, 0])

            # 6. MFCC Features (13)
            try:
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                mfcc_means = [float(np.mean(mfcc)) for mfcc in mfccs]
                features.extend(mfcc_means)
            except Exception:
                features.extend([0] * 13)

            return np.array(features)

        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            return None

    def predict(self, features, return_probability=False):
        """
        Predict Parkinson's Disease

        Args:
            features: numpy array of 33 features
            return_probability: if True, return probability instead of binary prediction

        Returns:
            If return_probability=False: 0 (Healthy) or 1 (Parkinson's)
            If return_probability=True: probability of Parkinson's (0.0 to 1.0)
        """
        # Ensure correct shape
        if features.ndim == 1:
            features = features.reshape(1, -1)

        # Scale features
        features_scaled = self.scale_features(features)

        # Predict
        if return_probability:
            prob = self.model.predict_proba(features_scaled)[:, 1]
            return prob[0]
        else:
            pred = self.model.predict(features_scaled)
            return int(pred[0])

    def get_interpretation(self, probability):
        """
        Get human-readable interpretation

        Args:
            probability: probability of Parkinson's (0.0 to 1.0)

        Returns:
            dict with interpretation
        """
        if probability < 0.3:
            risk = "Low"
            recommendation = "No immediate concern. Regular monitoring recommended."
            color = "green"
        elif probability < 0.5:
            risk = "Low-Moderate"
            recommendation = "Some indicators present. Consider follow-up screening."
            color = "yellow"
        elif probability < 0.7:
            risk = "Moderate"
            recommendation = (
                "Multiple indicators present. Medical consultation recommended."
            )
            color = "orange"
        elif probability < 0.85:
            risk = "Moderate-High"
            recommendation = (
                "Strong indicators present. Medical evaluation strongly recommended."
            )
            color = "red"
        else:
            risk = "High"
            recommendation = (
                "Very strong indicators. Immediate medical evaluation recommended."
            )
            color = "darkred"

        return {
            "probability": float(probability),
            "risk_level": risk,
            "recommendation": recommendation,
            "color": color,
            "note": "This is a screening tool. Final diagnosis must be made by a medical professional.",
        }

    def get_model_info(self):
        """Get model information"""
        return {
            "model_type": "LightGBM Classifier",
            "features": len(self.feature_names),
            "accuracy": f"{self.metrics['accuracy']*100:.1f}%",
            "precision": f"{self.metrics['precision']*100:.1f}%",
            "recall": f"{self.metrics['recall']*100:.1f}%",
            "f1_score": f"{self.metrics['f1_score']*100:.1f}%",
            "training_samples": self.metrics["train_samples"],
            "test_samples": self.metrics["test_samples"],
            "feature_names": self.feature_names,
        }


# Initialize detector
detector = None


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    global detector
    try:
        detector = ParkinsonDetector()
        logger.info("✅ Parkinson's Detection Service Ready")
    except Exception as e:
        logger.error(f"❌ Failed to initialize detector: {e}")
        detector = None


@app.get("/")
async def root():
    return {
        "service": "Netra AI - Parkinson's Voice Detection Service",
        "version": "2.0.0",
        "status": "operational" if detector and detector.model_loaded else "unhealthy",
        "model_accuracy": f"{detector.metrics['accuracy']*100:.1f}%" if detector else "N/A",
        "endpoints": {
            "/predict": "Audio prediction",
            "/predict-from-features": "Feature-based prediction",
            "/model-info": "Detailed model metrics",
            "/health": "Health check"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if detector and detector.model_loaded else "unhealthy",
        "service": "parkinsons-voice",
        "model_loaded": detector.model_loaded if detector else False,
        "version": "2.0.0",
        "model_accuracy": (
            f"{detector.metrics['accuracy']*100:.1f}%" if detector else "N/A"
        ),
    }


@app.get("/model-info")
async def get_model_info():
    """Get model information"""
    if not detector or not detector.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return detector.get_model_info()


class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    prediction: int
    probability: float
    risk_level: str
    recommendation: str
    color: str
    note: str
    features_extracted: int
    model_accuracy: str


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    """
    Predict Parkinson's Disease from voice recording

    Args:
        file: Audio file (WAV, MP3, etc.)

    Returns:
        Prediction with risk level and recommendation
    """
    if not detector or not detector.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    if not file.filename.lower().endswith((".wav", ".mp3", ".m4a", ".flac", ".ogg")):
        raise HTTPException(
            status_code=400,
            detail="Invalid audio format. Supported: WAV, MP3, M4A, FLAC, OGG",
        )

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        logger.info(f"Processing audio file: {file.filename}")

        # Extract features
        features = detector.extract_features(tmp_path)

        # Clean up temp file
        os.unlink(tmp_path)

        if features is None:
            raise HTTPException(
                status_code=400, detail="Failed to extract features from audio"
            )

        if len(features) != 33:
            raise HTTPException(
                status_code=500,
                detail=f"Feature extraction error: expected 33 features, got {len(features)}",
            )

        # Get prediction
        probability = detector.predict(features, return_probability=True)
        prediction = detector.predict(features)

        # Get interpretation
        interpretation = detector.get_interpretation(probability)

        logger.info(
            f"Prediction: {prediction}, Probability: {probability:.2f}, Risk: {interpretation['risk_level']}"
        )

        return PredictionResponse(
            prediction=prediction,
            probability=interpretation["probability"],
            risk_level=interpretation["risk_level"],
            recommendation=interpretation["recommendation"],
            color=interpretation["color"],
            note=interpretation["note"],
            features_extracted=len(features),
            model_accuracy=f"{detector.metrics['accuracy']*100:.1f}%",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


class FeaturesRequest(BaseModel):
    features: List[float]


@app.post("/predict-from-features", response_model=PredictionResponse)
async def predict_from_features(request: FeaturesRequest):
    """
    Predict from pre-extracted features

    Args:
        features: List of 33 acoustic features

    Returns:
        Prediction with risk level and recommendation
    """
    if not detector or not detector.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if len(request.features) != 33:
        raise HTTPException(
            status_code=400, detail=f"Expected 33 features, got {len(request.features)}"
        )

    try:
        features = np.array(request.features)

        # Get prediction
        probability = detector.predict(features, return_probability=True)
        prediction = detector.predict(features)

        # Get interpretation
        interpretation = detector.get_interpretation(probability)

        return PredictionResponse(
            prediction=prediction,
            probability=interpretation["probability"],
            risk_level=interpretation["risk_level"],
            recommendation=interpretation["recommendation"],
            color=interpretation["color"],
            note=interpretation["note"],
            features_extracted=len(features),
            model_accuracy=f"{detector.metrics['accuracy']*100:.1f}%",
        )

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=10000)
