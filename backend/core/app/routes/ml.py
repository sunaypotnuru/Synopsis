from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
import httpx
import logging
import asyncio

from app.core.security import get_current_patient
from app.models.schemas import TokenPayload, AIAnalyzeRequest, AIAnalyzeResponse
from app.core.config import settings
from app.services.supabase import supabase
from app.services.ml_service import get_ml_service, MLModelType

router = APIRouter(prefix="/ml", tags=["ML / AI"])
logger = logging.getLogger(__name__)


async def record_model_telemetry(
    model_name: str,
    confidence: float,
    latency_ms: float,
    status: str,
    prediction: str = None,
    metadata: dict = None,
):
    """
    Record model performance telemetry for FDA APM compliance.
    Runs as a background task to avoid impacting response time.
    """
    from datetime import datetime

    try:
        telemetry_data = {
            "model_name": model_name,
            "confidence_score": float(confidence or 0.0),
            "prediction_latency_ms": float(latency_ms or 0.0),
            "status": status,
            "prediction_result": str(prediction) if prediction else None,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat(),
        }
        supabase.table("model_telemetry").insert(telemetry_data).execute()
        logger.info(f"Recorded telemetry for {model_name}")
    except Exception as e:
        logger.error(f"Failed to record telemetry for {model_name}: {e}")


@router.get("/health")
async def check_ml_health():
    """
    Check health status of all ML models.

    Returns health status, response times, and availability for each model.
    """
    ml_service = get_ml_service()

    try:
        # Check all models
        health_results = await ml_service.check_all_health()

        # Get cache stats
        cache_stats = await ml_service.cache.get_stats()

        return {
            "status": "operational",
            "models": [result.dict() for result in health_results],
            "cache": cache_stats,
            "timestamp": health_results[0].last_checked if health_results else None,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "error": str(e), "models": []}


@router.get("/health/{model_type}")
async def check_model_health(model_type: str):
    """Check health of specific ML model."""
    ml_service = get_ml_service()

    try:
        model_enum = MLModelType(model_type)
        result = await ml_service.check_health(model_enum)
        return result.dict()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model type. Valid types: {[m.value for m in MLModelType]}",
        )
    except Exception as e:
        logger.error(f"Health check failed for {model_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-conjunctiva", response_model=AIAnalyzeResponse)
async def analyze_anemia(
    req: AIAnalyzeRequest,
    background_tasks: BackgroundTasks,
    current_user: TokenPayload = Depends(get_current_patient),
):
    """
    Analyze conjunctiva image for anemia detection.

    Features:
    - Automatic retry with exponential backoff
    - Result caching (1 hour TTL)
    - Health checks
    - Audit logging
    - Graceful fallbacks
    """
    from datetime import datetime

    ml_service = get_ml_service()

    try:
        # 1. Update Scan to 'processing' status
        processing_update = {
            "status": "processing",
            "processing_started_at": datetime.utcnow().isoformat(),
        }

        try:
            supabase.table("scans").update(processing_update).eq(
                "id", req.scan_id
            ).execute()
            logger.info(f"Scan {req.scan_id} marked as processing")
        except Exception as db_error:
            logger.warning(f"Failed to update scan status: {db_error}")

        # 2. Download image from URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                image_response = await client.get(req.image_url)
                image_response.raise_for_status()
                image_data = image_response.content
            except Exception as e:
                logger.error(f"Failed to download image: {e}")
                raise HTTPException(
                    status_code=400, detail="Failed to download image from URL"
                )

        # 3. Call ML service with retry and caching
        try:
            result = await ml_service.predict_anemia(
                image_data=image_data, use_cache=True
            )

            # Check if prediction failed
            if result.prediction.get("fallback"):
                raise HTTPException(
                    status_code=503,
                    detail=result.prediction.get("message", "Service unavailable"),
                )

            data = result.prediction

            logger.info(
                f"Anemia prediction completed: "
                f"cached={result.cached}, "
                f"time={result.response_time_ms:.0f}ms"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Anemia prediction failed: {e}")
            # Update scan to failed status
            error_update = {
                "status": "failed",
                "error_message": str(e),
                "processing_completed_at": datetime.utcnow().isoformat(),
            }
            supabase.table("scans").update(error_update).eq("id", req.scan_id).execute()
            raise HTTPException(status_code=503, detail="Anemia service unavailable")

        # 4. Save final result in DB with completed status
        update_data = {
            "status": "completed",
            "hemoglobin_estimate": data.get("hemoglobin_level", 0.0),
            "prediction": data.get("prediction", "normal").lower(),
            "confidence": data.get("confidence", 0.0),
            "diagnosis": data.get("prediction", "normal"),
            "processing_completed_at": datetime.utcnow().isoformat(),
        }

        supabase.table("scans").update(update_data).eq("id", req.scan_id).execute()
        logger.info(f"Scan {req.scan_id} completed successfully")

        # 5. Create Notification
        notif_data = {
            "user_id": current_user.sub,
            "type": "scan_result",
            "title": "Anemia Scan Results Ready",
            "message": f"Your scan returned a status of {data.get('prediction', 'normal')}.",
            "data": data,
        }
        supabase.table("notifications").insert(notif_data).execute()

        # 6. Record Telemetry (Background)
        background_tasks.add_task(
            record_model_telemetry,
            model_name="anemia-detection",
            confidence=data.get("confidence", 0.0),
            latency_ms=result.response_time_ms,
            status="success",
            prediction=data.get("prediction", "normal"),
            metadata={"scan_id": req.scan_id, "cached": result.cached},
        )

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process AI Anemia request: {e}", exc_info=True)
        # Update scan to failed status
        try:
            error_update = {
                "status": "failed",
                "error_message": str(e),
                "processing_completed_at": datetime.utcnow().isoformat(),
            }
            supabase.table("scans").update(error_update).eq("id", req.scan_id).execute()
        except Exception as db_error:
            logger.error(f"Failed to update scan error status: {db_error}")

        raise HTTPException(status_code=500, detail=f"ML Service Error: {str(e)}")


@router.post("/cataract/analyze")
async def analyze_cataract(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            image_bytes = await file.read()
            files = {"file": (file.filename, image_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.CATARACT_API_URL}/predict", files=files
            )
            resp.raise_for_status()
            data = resp.json()

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="cataract-detection",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("status"),
            )

            return data
        except httpx.RequestError:
            if (
                not settings.ALLOW_MOCK_RESPONSES
                or settings.ENVIRONMENT == "production"
            ):
                raise HTTPException(
                    status_code=503, detail="Cataract service unavailable"
                )

            logger.warning(
                "Cataract service unavailable - returning mock response (development only)"
            )
            await asyncio.sleep(3)
            return {"status": "Early", "confidence": 0.92, "mocked": True}


@router.post("/cataract/analyze-xai")
async def analyze_cataract_with_xai(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Analyze cataract with XAI (Explainable AI) visualization.

    Returns prediction + Grad-CAM heatmap + attention regions.
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            image_bytes = await file.read()
            files = {"file": (file.filename, image_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.CATARACT_API_URL}/predict-with-xai", files=files
            )
            resp.raise_for_status()
            data = resp.json()
            # heatmap_base64 already contains the full data URI (data:image/png;base64,...)
            data["heatmap_url"] = data["heatmap_base64"]

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="cataract-detection-xai",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("status"),
            )

            return data
        except httpx.RequestError:
            if (
                not settings.ALLOW_MOCK_RESPONSES
                or settings.ENVIRONMENT == "production"
            ):
                raise HTTPException(
                    status_code=503, detail="Cataract XAI service unavailable"
                )

            logger.warning(
                "Cataract XAI service unavailable - returning mock response (development only)"
            )
            # Fallback to mock XAI prediction if XAI fails
            await asyncio.sleep(1)
            return {
                "status": "Early Cataract",
                "confidence": 0.92,
                "mocked": True,
                "xai_enabled": True,
                "heatmap_url": "https://placehold.co/400x400/0D9488/FFFFFF/png?text=Heatmap+Simulation",
                "attention_regions": ["Lens center", "Periphery"],
            }


@router.post("/dr/analyze")
async def analyze_dr(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Analyze retinal fundus image for diabetic retinopathy detection.

    Uses FDA-compliant EfficientNet-B5 model with:
    - Kappa: 0.8527
    - Sensitivity: 85.62%
    - Specificity: 93.61%

    Returns:
        - grade: DR grade (0-4)
        - grade_name: Human-readable grade name
        - description: Clinical description
        - confidence: Prediction confidence (0-1)
        - referable: Whether patient needs referral
        - recommendation: Clinical recommendation
        - probabilities: Probabilities for all grades
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            image_bytes = await file.read()
            files = {"file": (file.filename, image_bytes, file.content_type)}
            resp = await client.post(f"{settings.DR_API_URL}/predict", files=files)
            resp.raise_for_status()
            data = resp.json()

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="diabetic-retinopathy",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("grade_name"),
            )

            return data
        except httpx.RequestError as e:
            logger.error(f"DR service error: {e}")
            if (
                not settings.ALLOW_MOCK_RESPONSES
                or settings.ENVIRONMENT == "production"
            ):
                raise HTTPException(
                    status_code=503, detail="Diabetic Retinopathy service unavailable"
                )

            logger.warning(
                "DR service unavailable - returning mock response (development only)"
            )
            await asyncio.sleep(1)
            return {
                "grade": 2,
                "grade_name": "Moderate NPDR",
                "description": "Moderate non-proliferative diabetic retinopathy",
                "confidence": 0.87,
                "referable": True,
                "recommendation": "Refer to ophthalmologist within 1 month",
                "probabilities": {
                    "No DR": 0.02,
                    "Mild NPDR": 0.05,
                    "Moderate NPDR": 0.87,
                    "Severe NPDR": 0.04,
                    "Proliferative DR": 0.02,
                },
                "mocked": True,
            }


@router.post("/dr/analyze-xai")
async def analyze_dr_with_xai(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Analyze retinal fundus image for DR with XAI (Explainable AI) visualization.
    Returns prediction + Grad-CAM heatmap + attention regions.
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            image_bytes = await file.read()
            files = {"file": (file.filename, image_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.DR_API_URL}/predict-with-xai", files=files
            )
            resp.raise_for_status()
            data = resp.json()
            if "heatmap_base64" in data and data["heatmap_base64"]:
                data["heatmap_url"] = data["heatmap_base64"]

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="diabetic-retinopathy-xai",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("grade_name"),
            )

            return data
        except httpx.RequestError as e:
            # Fallback to mock XAI prediction if XAI fails
            logger.error(f"XAI DR service error: {e}")
            await asyncio.sleep(1)
            return {
                "grade": 2,
                "grade_name": "Moderate NPDR",
                "confidence": 0.87,
                "mocked": True,
                "xai_enabled": True,
                "heatmap_url": "https://placehold.co/400x400/ef4444/FFFFFF/png?text=Lesion+Heatmap",
                "probabilities": {
                    "No DR": 0.02,
                    "Mild NPDR": 0.05,
                    "Moderate NPDR": 0.87,
                    "Severe NPDR": 0.04,
                    "Proliferative DR": 0.02,
                },
            }


@router.post("/dr/analyze/uncertainty")
async def analyze_dr_with_uncertainty(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    num_samples: int = 10,
):
    """
    Analyze retinal fundus image with uncertainty quantification.

    Uses Monte Carlo Dropout for uncertainty estimation.
    Useful for quality control and flagging cases that need human review.

    Parameters:
        - num_samples: Number of MC dropout samples (default: 10)

    Returns:
        - All fields from /dr/analyze
        - uncertainty: Predictive entropy (uncertainty measure)
        - mean_probabilities: Mean probabilities across samples
        - std_probabilities: Standard deviation of probabilities
        - needs_review: Whether prediction needs human review
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            image_bytes = await file.read()
            files = {"file": (file.filename, image_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.DR_API_URL}/predict/uncertainty?num_samples={num_samples}",
                files=files,
            )
            resp.raise_for_status()
            data = resp.json()

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="diabetic-retinopathy-uncertainty",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("grade_name"),
                metadata={"num_samples": num_samples, "uncertainty": data.get("uncertainty")},
            )

            return data
        except httpx.RequestError as e:
            logger.error(f"DR service error: {e}")
            # Fallback mock response
            await asyncio.sleep(3)
            return {
                "grade": 2,
                "grade_name": "Moderate NPDR",
                "description": "Moderate non-proliferative diabetic retinopathy",
                "confidence": 0.85,
                "uncertainty": 0.32,
                "referable": True,
                "recommendation": "Refer to ophthalmologist within 1 month",
                "mean_probabilities": {
                    "No DR": 0.02,
                    "Mild NPDR": 0.05,
                    "Moderate NPDR": 0.85,
                    "Severe NPDR": 0.06,
                    "Proliferative DR": 0.02,
                },
                "std_probabilities": {
                    "No DR": 0.01,
                    "Mild NPDR": 0.02,
                    "Moderate NPDR": 0.03,
                    "Severe NPDR": 0.02,
                    "Proliferative DR": 0.01,
                },
                "needs_review": False,
                "mocked": True,
            }


@router.post("/parkinsons/analyze")
async def analyze_parkinsons(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Analyze voice recording for Parkinson's disease screening.

    Uses acoustic analysis to detect:
    - Voice tremor patterns
    - Speech articulation issues
    - Vocal cord dysfunction

    Returns:
        - risk_score: Parkinson's risk score (0-1)
        - confidence: Prediction confidence (0-1)
        - recommendation: Clinical recommendation
    """
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            audio_bytes = await file.read()
            files = {"file": (file.filename, audio_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.PARKINSONS_API_URL}/predict", files=files
            )
            resp.raise_for_status()
            data = resp.json()

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="parkinsons-detection",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("risk_level"),
            )

            return data
        except httpx.RequestError as e:
            logger.error(f"Parkinson's service error: {e}")
            if (
                not settings.ALLOW_MOCK_RESPONSES
                or settings.ENVIRONMENT == "production"
            ):
                raise HTTPException(
                    status_code=503, detail="Parkinson's service unavailable"
                )

            logger.warning(
                "Parkinson's service unavailable - returning mock response (development only)"
            )
            await asyncio.sleep(1)
            return {
                "prediction": 0,
                "probability": 0.34,
                "risk_level": "Low Risk",
                "risk_score": 0.34,
                "color": "green",
                "model_accuracy": "87.3%",
                "features_extracted": 22,
                "recommendation": "No significant Parkinson's indicators detected. Continue regular health monitoring.",
                "note": "This is a screening tool only. Consult a neurologist for clinical diagnosis.",
                "mocked": True,
            }


@router.post("/mental-health/analyze")
async def analyze_mental_health(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Analyze voice recording for mental health assessment.

    Uses AI voice analysis to detect:
    - Stress levels in speech patterns
    - Anxiety indicators
    - Depression markers
    - Emotional state from prosody

    Returns:
        - risk_level: Low, Moderate, High
        - confidence: Prediction confidence (0-1)
        - indicators: List of detected indicators
        - recommendation: Clinical recommendation
        - scores: Individual metric scores
    """
    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            audio_bytes = await file.read()
            files = {"file": (file.filename, audio_bytes, file.content_type)}
            resp = await client.post(
                f"{settings.MENTAL_HEALTH_API_URL}/predict", files=files
            )
            resp.raise_for_status()
            data = resp.json()

            # Record Telemetry
            background_tasks.add_task(
                record_model_telemetry,
                model_name="mental-health-analysis",
                confidence=data.get("confidence", 0.0),
                latency_ms=resp.elapsed.total_seconds() * 1000,
                status="success",
                prediction=data.get("risk_level"),
            )

            return data
        except httpx.RequestError as e:
            logger.error(f"Mental Health service error: {e}")
            if (
                not settings.ALLOW_MOCK_RESPONSES
                or settings.ENVIRONMENT == "production"
            ):
                raise HTTPException(
                    status_code=503, detail="Mental Health service unavailable"
                )

            logger.warning(
                "Mental Health service unavailable - returning mock response (development only)"
            )
            await asyncio.sleep(1)
            return {
                "risk_level": "LOW",
                "risk_score": 15,
                "confidence": 0.82,
                "depression_score": 0.25,
                "anxiety_score": 0.30,
                "stress_score": 0.28,
                "transcription": "Voice analysis completed successfully.",
                "transcription_confidence": 0.85,
                "coping_strategy": "Practice mindfulness and maintain regular sleep schedule. Consider light exercise and social connection.",
                "crisis_detected": False,
                "processing_time_seconds": 2.3,
                "mocked": True,
            }


@router.post("/chatbot/chat")
async def chat_with_mental_health_bot(payload: dict):
    """
    Proxy chat requests to the Mental Health Chatbot (Ollama-based).
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(f"{settings.CHATBOT_API_URL}/chat", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.RequestError as e:
            logger.error(f"Chatbot service error: {e}")
            raise HTTPException(status_code=503, detail="Chatbot service unavailable")


@router.post("/emergency/sos")
async def trigger_emergency_sos(payload: dict):
    """
    Proxy SOS alerts to the Emergency Services API.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{settings.EMERGENCY_API_URL}/sos", json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.RequestError as e:
            logger.error(f"Emergency service error: {e}")
            raise HTTPException(
                status_code=503, detail="Emergency services unavailable"
            )
