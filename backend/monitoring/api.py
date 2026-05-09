"""
FastAPI wrapper for FDA APM System
Provides REST API endpoints for the Algorithm Performance Monitoring system
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging

from apm_system import APMSystem, AIModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FDA APM API",
    description="Algorithm Performance Monitoring System API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "netra_ai",
    "user": "netra_ai",
    "password": "secure_password",
}

# Initialize APM system
apm_system = APMSystem(DB_CONFIG)


# Pydantic models
class MetricsResponse(BaseModel):
    model_name: str
    timestamp: datetime
    sensitivity: float
    specificity: float
    ppv: float
    npv: float
    auc_roc: float
    calibration_error: float
    prediction_latency: float
    total_predictions: int
    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int


class AlertResponse(BaseModel):
    id: int
    model_name: str
    alert_level: str
    messages: List[str]
    timestamp: datetime
    acknowledged: bool
    resolved: bool


class PredictionRequest(BaseModel):
    model_name: str
    patient_id: str
    image_id: str
    predicted_label: int
    confidence: float
    metadata: Optional[Dict] = None


class GroundTruthRequest(BaseModel):
    prediction_id: int
    true_label: int
    verified_by: str


class DriftMetrics(BaseModel):
    model_name: str
    timestamp: datetime
    feature_name: str
    drift_score: float
    drift_detected: bool
    baseline_mean: float
    current_mean: float


class BiasMetrics(BaseModel):
    model_name: str
    timestamp: datetime
    demographic_group: str
    sensitivity: float
    specificity: float
    sample_size: int
    bias_detected: bool


# API Endpoints


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"service": "FDA APM API", "status": "healthy", "version": "1.0.0"}


@app.get("/metrics/{model_name}", response_model=List[MetricsResponse])
async def get_metrics(
    model_name: str,
    hours: int = Query(24, description="Number of hours to retrieve"),
    limit: int = Query(100, description="Maximum number of records"),
):
    """Get performance metrics for a model"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM ai_performance_metrics
                    WHERE model_name = %s
                    AND timestamp >= NOW() - INTERVAL '%s hours'
                    ORDER BY timestamp DESC
                    LIMIT %s
                """,
                    (model_name, hours, limit),
                )

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics/{model_name}/latest", response_model=MetricsResponse)
async def get_latest_metrics(model_name: str):
    """Get latest performance metrics for a model"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM ai_performance_metrics
                    WHERE model_name = %s
                    ORDER BY timestamp DESC
                    LIMIT 1
                """,
                    (model_name,),
                )

                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="No metrics found")

                columns = [desc[0] for desc in cur.description]
                return dict(zip(columns, row))
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    model_name: Optional[str] = None,
    level: Optional[str] = None,
    hours: int = Query(24, description="Number of hours to retrieve"),
    unresolved_only: bool = Query(False, description="Only show unresolved alerts"),
):
    """Get performance alerts"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT *
                    FROM ai_performance_alerts
                    WHERE timestamp >= NOW() - INTERVAL '%s hours'
                """
                params = [hours]

                if model_name:
                    query += " AND model_name = %s"
                    params.append(model_name)

                if level:
                    query += " AND alert_level = %s"
                    params.append(level)

                if unresolved_only:
                    query += " AND resolved = FALSE"

                query += " ORDER BY timestamp DESC"

                cur.execute(query, params)

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, acknowledged_by: str):
    """Acknowledge an alert"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ai_performance_alerts
                    SET acknowledged = TRUE,
                        acknowledged_by = %s,
                        acknowledged_at = NOW()
                    WHERE id = %s
                    RETURNING id
                """,
                    (acknowledged_by, alert_id),
                )

                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Alert not found")

                conn.commit()
                return {"status": "acknowledged", "alert_id": alert_id}
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, resolved_by: str, resolution_notes: str):
    """Resolve an alert"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ai_performance_alerts
                    SET resolved = TRUE,
                        resolved_by = %s,
                        resolved_at = NOW(),
                        resolution_notes = %s
                    WHERE id = %s
                    RETURNING id
                """,
                    (resolved_by, resolution_notes, alert_id),
                )

                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Alert not found")

                conn.commit()
                return {"status": "resolved", "alert_id": alert_id}
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predictions")
async def record_prediction(prediction: PredictionRequest):
    """Record a new AI prediction"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_predictions (
                        model_name, patient_id, image_id,
                        predicted_label, confidence, metadata, timestamp
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """,
                    (
                        prediction.model_name,
                        prediction.patient_id,
                        prediction.image_id,
                        prediction.predicted_label,
                        prediction.confidence,
                        str(prediction.metadata) if prediction.metadata else None,
                    ),
                )

                prediction_id = cur.fetchone()[0]
                conn.commit()

                return {"status": "recorded", "prediction_id": prediction_id}
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error recording prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predictions/{prediction_id}/ground-truth")
async def record_ground_truth(prediction_id: int, ground_truth: GroundTruthRequest):
    """Record ground truth for a prediction"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ai_predictions
                    SET true_label = %s,
                        verified_by = %s,
                        verified_at = NOW()
                    WHERE id = %s
                    RETURNING model_name
                """,
                    (ground_truth.true_label, ground_truth.verified_by, prediction_id),
                )

                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Prediction not found")

                model_name = cur.fetchone()[0]
                conn.commit()

                logger.info(f"Ground truth recorded for prediction {prediction_id}")

                return {
                    "status": "recorded",
                    "prediction_id": prediction_id,
                    "model_name": model_name,
                }
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording ground truth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/drift/{model_name}", response_model=List[DriftMetrics])
async def get_drift_metrics(
    model_name: str, days: int = Query(30, description="Number of days to retrieve")
):
    """Get data drift metrics for a model"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM data_drift_metrics
                    WHERE model_name = %s
                    AND timestamp >= NOW() - INTERVAL '%s days'
                    ORDER BY timestamp DESC
                """,
                    (model_name, days),
                )

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching drift metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/bias/{model_name}", response_model=List[BiasMetrics])
async def get_bias_metrics(
    model_name: str, days: int = Query(30, description="Number of days to retrieve")
):
    """Get bias monitoring metrics for a model"""
    try:
        conn = apm_system.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM bias_monitoring
                    WHERE model_name = %s
                    AND timestamp >= NOW() - INTERVAL '%s days'
                    ORDER BY timestamp DESC
                """,
                    (model_name, days),
                )

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching bias metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/report/{model_name}")
async def get_performance_report(
    model_name: str, days: int = Query(30, description="Number of days for report")
):
    """Generate FDA performance report"""
    try:
        report = apm_system.get_performance_report(model_name, days)
        return report
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models")
async def list_models():
    """List all monitored AI models"""
    return {
        "models": [
            {
                "name": AIModel.DIABETIC_RETINOPATHY.value,
                "display_name": "Diabetic Retinopathy Detection",
                "safety_class": "B",
            },
            {
                "name": AIModel.CATARACT.value,
                "display_name": "Cataract Detection",
                "safety_class": "B",
            },
            {
                "name": AIModel.ANEMIA.value,
                "display_name": "Anemia Detection",
                "safety_class": "B",
            },
            {
                "name": AIModel.PARKINSONS.value,
                "display_name": "Parkinson's Voice Analysis",
                "safety_class": "B",
            },
            {
                "name": AIModel.MENTAL_HEALTH.value,
                "display_name": "Mental Health Assessment",
                "safety_class": "C",
            },
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
