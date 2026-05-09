"""
Cataract Detection Service - Production API
Model: Swin-Base Transformer
Performance: 96% Sensitivity, 90.2% Specificity
Port: 8005
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import logging
import numpy as np
import os
from pathlib import Path

from app.cataract_detector import CataractDetector
from app.preprocessing_pipeline import CataractPreprocessingPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Cataract Detection API",
    description="Industrial-level cataract detection using Swin-Base Transformer (96% sensitivity)",
    version="1.0.0",
)

# Configure CORS - use environment variable for production
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Environment-based for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {allowed_origins}")

# Global variables for model and pipeline
detector = None
pipeline = None


@app.on_event("startup")
async def startup_event():
    """Initialize model and pipeline on startup with memory optimization"""
    global detector, pipeline
    import gc
    import torch

    try:
        logger.info("Starting Cataract Detection Service...")

        # Use absolute paths relative to this file
        base_dir = Path(__file__).resolve().parent.parent
        model_path = base_dir / "models" / "swin_combined_best.pth"

        if not model_path.exists():
            logger.error(f"CRITICAL: Model file not found: {model_path}")
            raise RuntimeError(f"Cataract model file not found at {model_path}")

        # Initialize preprocessing pipeline
        logger.info("Initializing preprocessing pipeline...")
        pipeline = CataractPreprocessingPipeline()
        logger.info("✅ Preprocessing pipeline ready")

        # Initialize detector with XAI support
        logger.info("Loading cataract detection model (Swin-Base)...")
        # Ensure detector uses CPU for memory efficiency on Free Tier
        detector = CataractDetector(str(model_path), enable_xai=True)
        
        # Force garbage collection after loading
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info("✅ Model loaded successfully")
        logger.info("🚀 Cataract Detection Service is ready!")

    except Exception as e:
        logger.error(f"CRITICAL: Failed to initialize service: {e}")
        raise RuntimeError(f"Cataract service initialization failed: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Cataract Detection API",
        "version": "1.0.0",
        "model": "Swin-Base Transformer",
        "performance": {
            "sensitivity": "96.0%",
            "specificity": "90.2%",
            "accuracy": "90.8%",
        },
        "status": "ready" if detector is not None else "model_not_loaded",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if detector is not None else "model_not_loaded",
        "model_loaded": detector is not None,
        "pipeline_ready": pipeline is not None,
        "xai_enabled": detector.enable_xai if detector is not None else False,
        "service": "cataract-detection",
        "version": "1.0.0",
    }


@app.get("/model-info")
async def get_model_info():
    """Get detailed model information"""
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return detector.get_model_info()


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Predict cataract from fundus image

    Args:
        file: Uploaded fundus image (JPG/PNG)

    Returns:
        Prediction results with confidence scores
    """
    if detector is None or pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please ensure model file exists in models/ folder",
        )

    try:
        # Read image file
        logger.info(f"Received image: {file.filename}")
        image_bytes = await file.read()

        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {len(image_bytes) / 1024 / 1024:.1f}MB",
            )

        image = Image.open(io.BytesIO(image_bytes))

        # Quality check
        logger.info("Performing quality check...")
        quality = pipeline.quality_check(image)

        if not quality.get("is_valid", False):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image quality: {quality.get('error', 'Unknown error')}",
            )

        # Log quality warnings
        if "warning" in quality:
            logger.warning(f"Image quality warning: {quality['warning']}")

        # Preprocess image
        logger.info("Preprocessing image...")
        image_tensor = pipeline.preprocess(image)

        # Run prediction
        logger.info("Running prediction...")
        result = detector.predict(image_tensor)

        # Add quality metrics to result
        result["quality_metrics"] = {
            "size": quality["size"],
            "mean_intensity": quality["mean_intensity"],
            "std_intensity": quality["std_intensity"],
        }

        # Format response for frontend
        response = {
            "status": (
                "Early" if result["prediction"] == "CATARACT DETECTED" else "Normal"
            ),
            "confidence": result["confidence"],
            "cataract_probability": result["cataract_probability"],
            "prediction": result["prediction"],
            "threshold": result["threshold"],
            "processing_time_ms": result["processing_time_ms"],
            "model_info": result["model_info"],
            "quality_check": quality,
        }

        logger.info(
            f"Prediction complete: {result['prediction']} (confidence: {result['confidence']:.2%})"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict-with-xai")
async def predict_with_xai(file: UploadFile = File(...)):
    """
    Predict cataract with XAI (Explainable AI) visualization

    Args:
        file: Uploaded fundus image (JPG/PNG)

    Returns:
        Prediction results with Grad-CAM heatmap and attention regions
    """
    if detector is None or pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please ensure model file exists in models/ folder",
        )

    if not detector.enable_xai:
        raise HTTPException(
            status_code=503,
            detail="XAI not enabled. Please ensure pytorch-grad-cam is installed",
        )

    try:
        # Read image file
        logger.info(f"Received image for XAI prediction: {file.filename}")
        image_bytes = await file.read()

        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if len(image_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {len(image_bytes) / 1024 / 1024:.1f}MB",
            )

        image = Image.open(io.BytesIO(image_bytes))

        # Quality check
        logger.info("Performing quality check...")
        quality = pipeline.quality_check(image)

        if not quality.get("is_valid", False):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image quality: {quality.get('error', 'Unknown error')}",
            )

        # Log quality warnings
        if "warning" in quality:
            logger.warning(f"Image quality warning: {quality['warning']}")

        # Preprocess image
        logger.info("Preprocessing image...")
        image_tensor = pipeline.preprocess(image)

        # Prepare original image for Grad-CAM (numpy array in [0, 1])
        # Convert to RGB first to ensure 3 channels
        image_rgb = image.convert("RGB")
        original_image = np.array(image_rgb.resize((224, 224))) / 255.0

        # Run prediction with XAI
        logger.info("Running prediction with XAI...")
        result = detector.predict_with_xai(image_tensor, original_image)

        # Add quality metrics to result
        result["quality_metrics"] = {
            "size": quality["size"],
            "mean_intensity": quality["mean_intensity"],
            "std_intensity": quality["std_intensity"],
        }

        # Format response for frontend
        response = {
            "status": (
                "Early" if result["prediction"] == "CATARACT DETECTED" else "Normal"
            ),
            "confidence": result["confidence"],
            "cataract_probability": result["cataract_probability"],
            "prediction": result["prediction"],
            "threshold": result["threshold"],
            "processing_time_ms": result["processing_time_ms"],
            "xai_processing_time_ms": result.get("xai_processing_time_ms", 0),
            "model_info": result["model_info"],
            "quality_check": quality,
            # XAI data
            "heatmap_base64": result.get("heatmap_base64"),
            "attention_regions": result.get("attention_regions", []),
            "xai_metadata": result.get("xai_metadata", {}),
            "xai_enabled": result.get("xai_enabled", False),
        }

        logger.info(
            f"XAI Prediction complete: {result['prediction']} "
            f"(confidence: {result['confidence']:.2%}, "
            f"regions: {len(result.get('attention_regions', []))})"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"XAI Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"XAI Prediction failed: {str(e)}")


@app.post("/batch-predict")
async def batch_predict(files: list[UploadFile] = File(...)):
    """
    Predict cataract for multiple images

    Args:
        files: List of uploaded fundus images

    Returns:
        List of prediction results
    """
    if detector is None or pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    results = []

    for i, file in enumerate(files):
        try:
            # Read and process image
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))

            # Quality check
            quality = pipeline.quality_check(image)
            if not quality.get("is_valid", False):
                results.append(
                    {
                        "filename": file.filename,
                        "error": f"Invalid image quality: {quality.get('error')}",
                    }
                )
                continue

            # Preprocess and predict
            image_tensor = pipeline.preprocess(image)
            result = detector.predict(image_tensor)

            # Format response
            results.append(
                {
                    "filename": file.filename,
                    "status": (
                        "Early"
                        if result["prediction"] == "CATARACT DETECTED"
                        else "Normal"
                    ),
                    "confidence": result["confidence"],
                    "cataract_probability": result["cataract_probability"],
                    "prediction": result["prediction"],
                }
            )

        except Exception as e:
            logger.error(f"Batch prediction error for {file.filename}: {e}")
            results.append({"filename": file.filename, "error": str(e)})

    return {"results": results, "total": len(files), "processed": len(results)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8005)
