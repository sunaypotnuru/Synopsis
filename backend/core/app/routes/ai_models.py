"""
AI Model Status Tracking Routes
Monitors and manages all AI models in the platform.
"""

import httpx
from fastapi import APIRouter, HTTPException
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime

from app.core.config import settings

router = APIRouter(tags=["AI Models"])

# Type definitions
ModelDict = Dict[str, Any]

# AI Model Configuration
AI_MODELS: List[ModelDict] = [
    {
        "name": "Anemia Detection",
        "id": "anemia",
        "version": "1.0.0",
        "status": "deployed",
        "accuracy": 0.90,
        "port": 8001,
        "endpoint": settings.ANEMIA_API_URL,
        "description": "Detects anemia from conjunctival images",
        "last_updated": "2026-04-10T10:00:00Z",
    },
    {
        "name": "Diabetic Retinopathy",
        "id": "diabetic-retinopathy",
        "version": "1.0.0",
        "status": "deployed",
        "accuracy": 0.8527,  # Kappa score (FDA compliant)
        "sensitivity": 0.8562,  # FDA minimum: 0.85,
        "specificity": 0.9361,
        "port": 8002,
        "endpoint": settings.DR_API_URL,
        "description": "FDA-compliant DR detection using EfficientNet-B5. Classifies 5 grades (0-4) with uncertainty quantification.",
        "model_details": {
            "architecture": "EfficientNet-B5",
            "parameters": "28.3M",
            "training_epochs": 30,
            "training_hours": 196,
            "dataset_size": 68000,
            "fda_compliant": True,
        },
        "last_updated": "2026-04-12T14:00:00Z",
    },
    {
        "name": "Cataract Detection",
        "id": "cataract",
        "version": "1.0.0",
        "status": "deployed",
        "accuracy": 0.908,
        "sensitivity": 0.96,
        "specificity": 0.902,
        "port": 8005,
        "endpoint": settings.CATARACT_API_URL,
        "description": "Detects cataracts from ocular images using Swin-Base Transformer (96% sensitivity)",
        "model_details": {
            "architecture": "Swin-Base Transformer",
            "threshold": 0.20,
            "dataset_size": 6514,
        },
        "last_updated": "2026-04-14T08:00:00Z",
    },
    {
        "name": "Parkinson's Voice",
        "id": "parkinsons-voice",
        "version": "0.9.0",
        "status": "training",
        "accuracy": None,
        "port": 8004,
        "endpoint": settings.PARKINSONS_API_URL,
        "description": "Detects Parkinson's disease from voice recordings",
        "last_updated": "2026-04-12T08:00:00Z",
    },
]


async def check_model_health(endpoint: str) -> Dict[str, Any]:
    """Check if AI model service is responding"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{endpoint}/health")
            return {
                "online": response.status_code == 200,
                "response_time_ms": response.elapsed.total_seconds() * 1000,
            }
    except Exception:
        return {"online": False, "response_time_ms": None}


@router.get("/admin/ai-models/status")
async def get_all_models_status():
    """
    Get status of all AI models

    Returns comprehensive status including:
    - Model name and version
    - Deployment status (deployed/training/offline)
    - Accuracy metrics
    - Service health
    """
    models_with_health = []

    for model in AI_MODELS:
        health = await check_model_health(model["endpoint"])

        models_with_health.append(
            {
                **model,
                "online": health["online"],
                "response_time_ms": health["response_time_ms"],
                "health_status": "healthy" if health["online"] else "offline",
            }
        )

    # Calculate summary statistics
    total_models = len(models_with_health)
    deployed = sum(1 for m in models_with_health if m["status"] == "deployed")
    training = sum(1 for m in models_with_health if m["status"] == "training")
    online = sum(1 for m in models_with_health if m["online"])

    return {
        "summary": {
            "total_models": total_models,
            "deployed": deployed,
            "training": training,
            "offline": total_models - online,
            "average_accuracy": (
                sum(m["accuracy"] for m in models_with_health if m["accuracy"])
                / deployed
                if deployed > 0
                else None
            ),
        },
        "models": models_with_health,
        "last_updated": datetime.now().isoformat(),
    }


@router.get("/admin/ai-models/{model_id}")
async def get_model_details(model_id: str):
    """Get detailed information about a specific AI model"""
    model: Optional[ModelDict] = next(
        (m for m in AI_MODELS if m["id"] == model_id), None
    )

    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    # Check health
    health = await check_model_health(str(model["endpoint"]))

    # Mock training metrics (in production, fetch from model service)
    training_metrics = None
    if model["status"] == "training":
        training_metrics = {
            "epoch": 45,
            "total_epochs": 100,
            "current_loss": 0.234,
            "current_accuracy": 0.87,
            "estimated_completion": "2026-04-15T10:00:00Z",
        }

    # Mock performance metrics (in production, fetch from database)
    performance_metrics = None
    if model["status"] == "deployed":
        performance_metrics = {
            "total_predictions": 1250,
            "average_inference_time_ms": 145,
            "predictions_today": 45,
            "accuracy_trend": [0.88, 0.89, 0.90, 0.90, 0.90],  # Last 5 days
        }

    return {
        **model,
        "online": health["online"],
        "response_time_ms": health["response_time_ms"],
        "health_status": "healthy" if health["online"] else "offline",
        "training_metrics": training_metrics,
        "performance_metrics": performance_metrics,
    }


@router.post("/admin/ai-models/{model_id}/deploy")
async def deploy_model(model_id: str):
    """
    Deploy a trained AI model to production

    This endpoint would:
    1. Validate model is ready for deployment
    2. Update model status to 'deployed'
    3. Start model service
    4. Run health checks
    """
    model: Optional[ModelDict] = next(
        (m for m in AI_MODELS if m["id"] == model_id), None
    )

    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    if model["status"] == "deployed":
        raise HTTPException(status_code=400, detail="Model is already deployed")

    # In production, this would:
    # - Copy model files to production directory
    # - Start model service
    # - Run validation tests
    # - Update database

    return {
        "message": f"Model '{str(model['name'])}' deployment initiated",
        "model_id": model_id,
        "status": "deploying",
        "estimated_completion": "2026-04-12T12:00:00Z",
    }


@router.post("/admin/ai-models/{model_id}/update")
async def update_model(
    model_id: str,
    version: Optional[str] = None,
    accuracy: Optional[float] = None,
    status: Optional[Literal["deployed", "training", "offline"]] = None,
):
    """
    Update AI model metadata

    Allows updating:
    - Version number
    - Accuracy metrics
    - Deployment status
    """
    model: Optional[ModelDict] = next(
        (m for m in AI_MODELS if m["id"] == model_id), None
    )

    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    updates: Dict[str, Any] = {}
    if version:
        updates["version"] = version
    if accuracy is not None:
        updates["accuracy"] = str(accuracy)  # Convert float to string for consistency
    if status:
        updates["status"] = status

    updates["last_updated"] = datetime.now().isoformat()

    # In production, update database

    return {
        "message": f"Model '{str(model['name'])}' updated successfully",
        "model_id": model_id,
        "updates": updates,
    }


@router.get("/admin/ai-models/stats")
async def get_model_statistics():
    """Get aggregate statistics for all AI models"""
    return {
        "total_models": 4,
        "deployed_models": 1,
        "training_models": 3,
        "total_predictions_today": 45,
        "total_predictions_all_time": 1250,
        "average_accuracy": 0.90,
        "models_by_status": {"deployed": 1, "training": 3, "offline": 0},
        "recent_deployments": [
            {
                "model_name": "Anemia Detection",
                "deployed_at": "2026-04-10T10:00:00Z",
                "version": "1.0.0",
            }
        ],
    }


@router.get("/public/ai-models")
async def get_public_model_info():
    """
    Get public information about AI models (no authentication required)

    Returns basic information for display on homepage/marketing pages
    """
    return {
        "models": [
            {
                "name": model["name"],
                "description": model["description"],
                "status": model["status"],
                "accuracy": model["accuracy"],
                "version": model["version"],
            }
            for model in AI_MODELS
        ],
        "summary": {
            "total_models": len(AI_MODELS),
            "deployed": sum(1 for m in AI_MODELS if m["status"] == "deployed"),
            "average_accuracy": sum(m["accuracy"] for m in AI_MODELS if m["accuracy"])
            / sum(1 for m in AI_MODELS if m["accuracy"]),
        },
    }
