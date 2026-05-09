"""
Netra AI - Diabetic Retinopathy Detection Service
FastAPI service for DR detection using trained EfficientNet-B5 model
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import timm
import numpy as np
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import io
import logging
import os
from pathlib import Path
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Netra AI - DR Detection Service")

# Configure CORS - use environment variable for production
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Environment-based for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {allowed_origins}")

# Grade names and clinical information
GRADE_NAMES = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}

GRADE_DESCRIPTIONS = {
    0: "No diabetic retinopathy detected",
    1: "Mild non-proliferative diabetic retinopathy",
    2: "Moderate non-proliferative diabetic retinopathy",
    3: "Severe non-proliferative diabetic retinopathy",
    4: "Proliferative diabetic retinopathy",
}

REFERABLE = {
    0: False,  # No DR - not referable
    1: False,  # Mild - not referable
    2: True,  # Moderate - referable
    3: True,  # Severe - referable
    4: True,  # Proliferative - referable
}

RECOMMENDATIONS = {
    0: "Continue annual screening",
    1: "Rescreen in 6-12 months",
    2: "Refer to ophthalmologist within 1 month",
    3: "Refer to ophthalmologist within 1 week",
    4: "Urgent referral to ophthalmologist",
}


class DRModelIndustrial(nn.Module):
    """Industrial-grade DR detection model"""

    def __init__(self, num_classes=5, dropout=0.5, enable_uncertainty=True):
        super().__init__()
        self.enable_uncertainty = enable_uncertainty

        # Load EfficientNet-B5 backbone
        self.backbone = timm.create_model(
            "efficientnet_b5", pretrained=False, num_classes=0
        )
        n_features = self.backbone.num_features

        # Dropout for uncertainty quantification
        self.dropout = nn.Dropout(dropout)

        # Grade prediction head (matches training architecture)
        self.grade_head = nn.Linear(n_features, num_classes)

        # Binary DR detection head (matches training architecture)
        self.binary_head = nn.Linear(n_features, 1)

    def forward(self, x, return_features=False):
        features = self.backbone(x)

        # Only apply dropout if explicitly enabled (for uncertainty estimation)
        # or if the model is in training mode.
        if self.enable_uncertainty or self.training:
            features = self.dropout(features)

        grade_logits = self.grade_head(features)
        binary_logits = self.binary_head(features)

        if return_features:
            return {
                "grade": grade_logits,
                "binary": binary_logits,
                "features": features,
            }

        return {"grade": grade_logits, "binary": binary_logits}


# Preprocessing pipeline
transform = A.Compose(
    [
        A.Resize(512, 512),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ]
)

# Global model variable
model = None
device = None
xai_generator = None


def load_model():
    """Load trained model from checkpoint with memory optimization for Render Free Tier"""
    global model, device, xai_generator
    import gc

    try:
        # Force CPU for memory efficiency on Free Tier (GPU libs eat RAM)
        device = torch.device("cpu")
        logger.info(f"Using device: {device}")

        # Use absolute paths relative to this file
        base_dir = Path(__file__).resolve().parent.parent
        model_path = base_dir / "models" / "best_model_industrial.pth"
        if not model_path.exists():
            # Fallback to latest checkpoint
            model_path = base_dir / "models" / "checkpoint_latest.pth"

        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found at {model_path}")

        logger.info(f"Loading model from {model_path}")

        # Initialize model in eval mode
        model = DRModelIndustrial(
            num_classes=5, dropout=0.5, enable_uncertainty=False
        ).to(device)
        
        # Load weights
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        # CRITICAL: Delete large checkpoint dict immediately and free RAM
        del checkpoint
        gc.collect()

        # Initialize XAI Generator
        try:
            from .xai_generator import DRXAIGenerator
            xai_generator = DRXAIGenerator(model)
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize XAI: {e}")
            xai_generator = None

        logger.info("✅ Model loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"❌ Error loading model: {e}")
        return False


def preprocess_image(image_bytes):
    """Preprocess image for model input"""
    try:
        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = np.array(image)

        # Apply transforms
        transformed = transform(image=image)
        image_tensor = transformed["image"].unsqueeze(0)

        return image_tensor
    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


def predict(image_tensor):
    """Make prediction on single image"""
    try:
        image_tensor = image_tensor.to(device)

        # Predict
        with torch.no_grad():
            outputs = model(image_tensor)
            grade_logits = outputs["grade"]
            probabilities = torch.softmax(grade_logits, dim=1)
            confidence, predicted_class = torch.max(probabilities, 1)

        # Get results
        grade = predicted_class.item()
        conf = confidence.item()
        probs = probabilities[0].cpu().numpy()

        return {
            "grade": grade,
            "grade_name": GRADE_NAMES[grade],
            "description": GRADE_DESCRIPTIONS[grade],
            "confidence": float(conf),
            "referable": REFERABLE[grade],
            "recommendation": RECOMMENDATIONS[grade],
            "probabilities": {GRADE_NAMES[i]: float(probs[i]) for i in range(5)},
        }
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


def predict_with_uncertainty(image_tensor, num_samples=10):
    """Predict with uncertainty estimation using Monte Carlo Dropout"""
    try:
        image_tensor = image_tensor.to(device)

        # Enable dropout
        model.train()

        # Multiple forward passes
        predictions = []
        for _ in range(num_samples):
            with torch.no_grad():
                outputs = model(image_tensor)
                grade_logits = outputs["grade"]
                probs = torch.softmax(grade_logits, dim=1)
                predictions.append(probs.cpu().numpy())

        predictions = np.array(predictions)

        # Calculate statistics
        mean_pred = predictions.mean(axis=0)[0]
        std_pred = predictions.std(axis=0)[0]

        # Predictive entropy (uncertainty measure)
        entropy = -np.sum(mean_pred * np.log(mean_pred + 1e-10))

        predicted_class = mean_pred.argmax()
        confidence = mean_pred[predicted_class]

        # Back to eval mode
        model.eval()

        return {
            "grade": int(predicted_class),
            "grade_name": GRADE_NAMES[predicted_class],
            "description": GRADE_DESCRIPTIONS[predicted_class],
            "confidence": float(confidence),
            "uncertainty": float(entropy),
            "referable": REFERABLE[predicted_class],
            "recommendation": RECOMMENDATIONS[predicted_class],
            "mean_probabilities": {
                GRADE_NAMES[i]: float(mean_pred[i]) for i in range(5)
            },
            "std_probabilities": {GRADE_NAMES[i]: float(std_pred[i]) for i in range(5)},
            "needs_review": entropy > 0.5,  # High uncertainty threshold
        }
    except Exception as e:
        logger.error(f"Error during uncertainty prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    logger.info("Starting Diabetic Retinopathy Detection Service...")
    success = load_model()
    if not success:
        logger.warning("⚠️  Model failed to load - service will return errors")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "diabetic-retinopathy",
        "model_loaded": model is not None,
        "xai_enabled": xai_generator is not None,
        "device": str(device) if device else "unknown",
    }


@app.post("/predict")
async def predict_endpoint(file: UploadFile = File(...)):
    """
    Predict diabetic retinopathy grade from retinal fundus image

    Returns:
        - grade: DR grade (0-4)
        - grade_name: Human-readable grade name
        - description: Clinical description
        - confidence: Prediction confidence (0-1)
        - referable: Whether patient needs referral
        - recommendation: Clinical recommendation
        - probabilities: Probabilities for all grades
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Read image
        image_bytes = await file.read()

        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {len(image_bytes) / 1024 / 1024:.1f}MB",
            )

        # Preprocess
        image_tensor = preprocess_image(image_bytes)

        # Predict
        result = predict(image_tensor)

        logger.info(
            f"Prediction: {result['grade_name']} (confidence: {result['confidence']:.2%})"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-with-xai")
async def predict_xai_endpoint(file: UploadFile = File(...)):
    """
    Predict diabetic retinopathy grade with XAI heatmap overlay
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        image_bytes = await file.read()

        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {len(image_bytes) / 1024 / 1024:.1f}MB",
            )

        image_tensor = preprocess_image(image_bytes)

        start_time = time.time()
        # Standard predict
        result = predict(image_tensor)

        # XAI Generation
        if xai_generator:
            # Load and convert image properly for XAI
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            pil_image = pil_image.resize((512, 512))  # Match model input size
            original_image = (
                np.array(pil_image) / 255.0
            )  # Convert to numpy and normalize to [0, 1]

            xai_output = xai_generator.generate_xai_output(
                input_tensor=image_tensor,
                original_image=original_image,
                prediction_class=result["grade"],
                threshold=0.5,
            )
            result.update(xai_output)
            result["xai_enabled"] = True
            result["xai_processing_time_ms"] = (time.time() - start_time) * 1000
        else:
            result["xai_enabled"] = False

        logger.info(
            f"XAI Prediction: {result['grade_name']} (confidence: {result['confidence']:.2%})"
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in XAI: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/uncertainty")
async def predict_uncertainty_endpoint(
    file: UploadFile = File(...), num_samples: int = 10
):
    """
    Predict with uncertainty quantification using Monte Carlo Dropout

    Parameters:
        - num_samples: Number of forward passes for uncertainty estimation (default: 10)

    Returns:
        - All fields from /predict endpoint
        - uncertainty: Predictive entropy (uncertainty measure)
        - mean_probabilities: Mean probabilities across samples
        - std_probabilities: Standard deviation of probabilities
        - needs_review: Whether prediction needs human review
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Read image
        image_bytes = await file.read()

        # Preprocess
        image_tensor = preprocess_image(image_bytes)

        # Predict with uncertainty
        result = predict_with_uncertainty(image_tensor, num_samples)

        logger.info(
            f"Prediction: {result['grade_name']} (confidence: {result['confidence']:.2%}, uncertainty: {result['uncertainty']:.4f})"
        )

        if result["needs_review"]:
            logger.warning("⚠️  High uncertainty - flagged for review")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Netra AI - Diabetic Retinopathy Detection",
        "version": "1.0",
        "model": "EfficientNet-B5",
        "status": "operational" if model is not None else "model not loaded",
        "endpoints": {
            "/predict": "Standard prediction",
            "/predict/uncertainty": "Prediction with uncertainty quantification",
            "/health": "Health check",
        },
    }
