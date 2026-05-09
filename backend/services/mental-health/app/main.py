"""
Mental Health Voice Analysis API - Main Application
100% FREE - No API costs, all processing local
Uses pre-trained models (NO TRAINING NEEDED)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
import tempfile
from datetime import datetime
from typing import Optional
import asyncio

# Import our modules
from app.models import transcribe_audio, analyze_text_with_bert, preload_models
from app.features import extract_acoustic_features, classify_from_acoustic_features
from app.crisis_detection import detect_crisis, get_coping_strategy
from app.facial_emotions import (
    analyze_facial_emotions,
    get_mental_health_indicators_from_emotions,
    load_deepface,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Mental Health Voice Analysis API",
    description="FREE AI-powered mental health screening from voice",
    version="1.0.0",
)

# Configure CORS - use environment variable for production
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Environment-based for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {allowed_origins}")


# Response models
class AnalysisResponse(BaseModel):
    # Transcription
    transcription: str
    transcription_confidence: float

    # Mental health scores
    depression_score: float
    anxiety_score: float
    stress_score: float
    confidence: float

    # Crisis detection
    crisis_detected: bool
    risk_level: str
    risk_score: int

    # Recommendations
    coping_strategy: str

    # Optional crisis info
    crisis_message: Optional[str] = None
    hotlines: Optional[list] = None
    immediate_steps: Optional[list] = None

    # Optional facial emotions
    facial_emotions: Optional[dict] = None
    dominant_emotion: Optional[str] = None

    # Metadata
    timestamp: str
    processing_time_seconds: float


_core_models_ready: bool = False
_core_models_error: Optional[str] = None
_deepface_ready: bool = False
_deepface_error: Optional[str] = None


async def _preload_core_models_in_background():
    global _core_models_ready, _core_models_error
    try:
        await asyncio.to_thread(preload_models)
        _core_models_ready = True
        logger.info("✅ Core models preloaded successfully (background)")
    except Exception as e:
        _core_models_error = str(e)
        logger.warning(f"⚠️ Core model preload failed (background): {e}")


async def _preload_deepface_in_background():
    global _deepface_ready, _deepface_error
    try:
        await asyncio.to_thread(load_deepface)
        _deepface_ready = True
        logger.info("✅ DeepFace facial emotion model loaded (background)")
    except Exception as e:
        _deepface_error = str(e)
        logger.warning(f"⚠️ DeepFace not available (background): {e}")


@app.on_event("startup")
async def startup_event():
    """
    Preload models on startup for faster first request
    """
    logger.info("Starting Mental Health Voice Analysis API...")
    logger.info("Scheduling model warmup in background...")

    # Don't block server readiness on large downloads (Whisper/MentalBERT).
    asyncio.create_task(_preload_core_models_in_background())
    asyncio.create_task(_preload_deepface_in_background())

    logger.info("🚀 API ready to accept requests (models may still be loading)")


@app.get("/")
async def root():
    """
    Root endpoint - API info
    """
    return {
        "service": "Mental Health Voice Analysis API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Speech-to-text (Whisper)",
            "Mental health analysis (MentalBERT)",
            "Acoustic feature extraction (50+ features)",
            "Facial emotion recognition (DeepFace - optional)",
            "Crisis detection",
            "Coping strategy recommendations",
        ],
        "cost": "FREE - No API costs",
        "privacy": "All processing local",
    }


@app.get("/health")
async def health():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "service": "mental-health-voice-analysis",
        "core_models_ready": _core_models_ready,
        "core_models_error": _core_models_error,
        "deepface_ready": _deepface_ready,
        "deepface_error": _deepface_error,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_mental_health(file: UploadFile = File(...)):
    """
    Analyze voice recording for mental health indicators

    Process:
    1. Transcribe audio (Whisper)
    2. Analyze text (MentalBERT)
    3. Extract acoustic features (librosa + parselmouth)
    4. Classify from acoustic features
    5. Detect crisis situations
    6. Combine results
    7. Generate recommendations

    Args:
        file: Audio file (WebM, MP3, WAV, etc.)

    Returns:
        AnalysisResponse with comprehensive mental health analysis
    """
    start_time = datetime.now()

    logger.info(f"Received analysis request: {file.filename}")

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(file.filename)[1]
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        logger.info(f"Saved audio to: {temp_path}")

        # ===== STEP 1: TRANSCRIBE AUDIO =====
        logger.info("Step 1: Transcribing audio with Whisper...")
        transcription_result = transcribe_audio(temp_path)
        transcription = transcription_result["text"]
        transcription_confidence = transcription_result["confidence"]

        logger.info(f"Transcription: {transcription[:100]}...")

        # ===== STEP 2: ANALYZE TEXT WITH MENTALBERT =====
        logger.info("Step 2: Analyzing text with MentalBERT...")
        text_analysis = analyze_text_with_bert(transcription)

        text_depression = text_analysis["depression_score"]
        text_anxiety = text_analysis["anxiety_score"]
        text_stress = text_analysis["stress_score"]
        text_confidence = text_analysis["confidence"]

        logger.info(
            f"Text analysis - Depression: {text_depression:.2f}, Anxiety: {text_anxiety:.2f}"
        )

        # ===== STEP 3: EXTRACT ACOUSTIC FEATURES =====
        logger.info("Step 3: Extracting acoustic features...")
        acoustic_features = extract_acoustic_features(temp_path)

        logger.info(f"Extracted {len(acoustic_features)} acoustic features")

        # ===== STEP 4: CLASSIFY FROM ACOUSTIC FEATURES =====
        logger.info("Step 4: Classifying from acoustic features...")
        acoustic_analysis = classify_from_acoustic_features(acoustic_features)

        acoustic_depression = acoustic_analysis["depression_score"]
        acoustic_anxiety = acoustic_analysis["anxiety_score"]
        acoustic_stress = acoustic_analysis["stress_score"]

        logger.info(
            f"Acoustic analysis - Depression: {acoustic_depression:.2f}, Anxiety: {acoustic_anxiety:.2f}"
        )

        # ===== STEP 5: FACIAL EMOTION ANALYSIS (Optional) =====
        logger.info("Step 5: Attempting facial emotion analysis...")

        facial_result = None
        facial_depression = 0.0
        facial_anxiety = 0.0
        facial_stress = 0.0

        try:
            # Try to analyze facial emotions from video/audio file
            # Note: This works best with video files, audio-only will skip
            facial_result = analyze_facial_emotions(video_path=temp_path)

            if facial_result and facial_result.get("face_detected"):
                logger.info(
                    f"Facial emotion detected: {facial_result.get('dominant_emotion')}"
                )

                # Get mental health indicators from emotions
                indicators = get_mental_health_indicators_from_emotions(
                    facial_result["emotions"]
                )
                facial_depression = indicators["depression_indicator"]
                facial_anxiety = indicators["anxiety_indicator"]
                facial_stress = indicators["stress_indicator"]

                logger.info(
                    f"Facial indicators - Depression: {facial_depression:.2f}, Anxiety: {facial_anxiety:.2f}"
                )
            else:
                logger.info("No face detected (audio-only recording)")
        except Exception as e:
            logger.info(f"Facial analysis skipped: {e}")

        # ===== STEP 6: COMBINE RESULTS (Multimodal Fusion) =====
        logger.info("Step 6: Combining text, acoustic, and facial analysis...")

        # Weighted average based on available modalities
        if facial_result and facial_result.get("face_detected"):
            # 3-modal: text 50%, acoustic 30%, facial 20%
            depression_score = (
                0.5 * text_depression
                + 0.3 * acoustic_depression
                + 0.2 * facial_depression
            )
            anxiety_score = (
                0.5 * text_anxiety + 0.3 * acoustic_anxiety + 0.2 * facial_anxiety
            )
            stress_score = (
                0.5 * text_stress + 0.3 * acoustic_stress + 0.2 * facial_stress
            )
            confidence = (text_confidence + 0.8 + facial_result["confidence"]) / 3
        else:
            # 2-modal: text 60%, acoustic 40%
            depression_score = 0.6 * text_depression + 0.4 * acoustic_depression
            anxiety_score = 0.6 * text_anxiety + 0.4 * acoustic_anxiety
            stress_score = 0.6 * text_stress + 0.4 * acoustic_stress
            confidence = (text_confidence + 0.8) / 2

        logger.info(
            f"Combined scores - Depression: {depression_score:.2f}, Anxiety: {anxiety_score:.2f}, Stress: {stress_score:.2f}"
        )

        # ===== STEP 7: CRISIS DETECTION =====
        logger.info("Step 7: Performing crisis detection...")
        crisis_result = detect_crisis(transcription, acoustic_features)

        crisis_detected = crisis_result["crisis"]
        risk_level = crisis_result["risk_level"]
        risk_score = crisis_result["risk_score"]

        logger.info(f"Crisis detection - Risk level: {risk_level}, Score: {risk_score}")

        if crisis_detected:
            logger.warning(f"⚠️ CRISIS DETECTED - Risk level: {risk_level}")

        # ===== STEP 8: GENERATE COPING STRATEGY =====
        logger.info("Step 8: Generating coping strategy...")
        coping_strategy = get_coping_strategy(
            depression_score, anxiety_score, stress_score
        )

        # ===== STEP 9: PREPARE RESPONSE =====
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()

        response = AnalysisResponse(
            # Transcription
            transcription=transcription,
            transcription_confidence=transcription_confidence,
            # Mental health scores
            depression_score=round(depression_score, 3),
            anxiety_score=round(anxiety_score, 3),
            stress_score=round(stress_score, 3),
            confidence=round(confidence, 3),
            # Crisis detection
            crisis_detected=crisis_detected,
            risk_level=risk_level,
            risk_score=risk_score,
            # Recommendations
            coping_strategy=coping_strategy,
            # Metadata
            timestamp=datetime.now().isoformat(),
            processing_time_seconds=round(processing_time, 2),
        )

        # Add crisis info if detected
        if crisis_detected:
            response.crisis_message = crisis_result.get("message")
            response.hotlines = crisis_result.get("hotlines")
            response.immediate_steps = crisis_result.get("immediate_steps")

        # Add facial emotions if detected
        if facial_result and facial_result.get("face_detected"):
            response.facial_emotions = facial_result["emotions"]
            response.dominant_emotion = facial_result["dominant_emotion"]

        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except Exception as e:
            logger.warning(f"Failed to delete temp file {temp_path}: {e}")

        logger.info(f"✅ Analysis complete in {processing_time:.2f}s")

        return response

    except Exception as e:
        logger.error(f"❌ Error during analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/test")
async def test_models():
    """
    Test endpoint to verify all models are working
    """
    try:
        from app.models import load_whisper_model, load_mental_bert

        # Test Whisper
        whisper_model = load_whisper_model()
        whisper_status = "✅ Loaded" if whisper_model else "❌ Failed"

        # Test MentalBERT
        tokenizer, bert_model = load_mental_bert()
        bert_status = "✅ Loaded" if tokenizer and bert_model else "❌ Failed"

        return {
            "status": "healthy",
            "models": {"whisper": whisper_status, "mental_bert": bert_status},
            "message": (
                "All models ready"
                if "❌" not in f"{whisper_status}{bert_status}"
                else "Some models failed to load"
            ),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True, log_level="info")
