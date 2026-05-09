"""
FDA AI/ML Algorithm Performance Monitoring (APM) System
Implements real-time monitoring of AI algorithm performance per FDA guidance
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels per FDA APM requirements"""

    INFO = "info"  # Performance within normal range
    WARNING = "warning"  # Approaching alert threshold
    CRITICAL = "critical"  # Below alert threshold
    EMERGENCY = "emergency"  # Below action threshold


class AIModel(Enum):
    """AI models being monitored"""

    DIABETIC_RETINOPATHY = "diabetic_retinopathy"
    CATARACT = "cataract"
    ANEMIA = "anemia"
    PARKINSONS = "parkinsons"
    MENTAL_HEALTH = "mental_health"


@dataclass
class PerformanceMetrics:
    """Performance metrics for AI model"""

    model_name: str
    timestamp: datetime
    sensitivity: float
    specificity: float
    ppv: float  # Positive Predictive Value
    npv: float  # Negative Predictive Value
    auc_roc: float
    calibration_error: float
    prediction_latency: float  # seconds
    total_predictions: int
    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int


@dataclass
class PerformanceThresholds:
    """Performance thresholds per FDA requirements"""

    sensitivity_target: float = 0.85
    sensitivity_alert: float = 0.80
    sensitivity_action: float = 0.75

    specificity_target: float = 0.85
    specificity_alert: float = 0.80
    specificity_action: float = 0.75

    ppv_target: float = 0.80
    ppv_alert: float = 0.75
    ppv_action: float = 0.70

    npv_target: float = 0.90
    npv_alert: float = 0.85
    npv_action: float = 0.80

    auc_target: float = 0.90
    auc_alert: float = 0.85
    auc_action: float = 0.80

    calibration_target: float = 0.05
    calibration_alert: float = 0.10
    calibration_action: float = 0.15

    latency_target: float = 2.0  # seconds
    latency_alert: float = 5.0
    latency_action: float = 10.0


# Prometheus metrics
prediction_counter = Counter(
    "ai_predictions_total", "Total number of AI predictions", ["model", "prediction"]
)

performance_gauge = Gauge(
    "ai_performance_metric", "AI model performance metrics", ["model", "metric"]
)

prediction_latency = Histogram(
    "ai_prediction_latency_seconds", "AI prediction latency in seconds", ["model"]
)

alert_counter = Counter(
    "ai_performance_alerts_total",
    "Total number of performance alerts",
    ["model", "level"],
)


class APMSystem:
    """Algorithm Performance Monitoring System"""

    def __init__(self, db_config: Dict):
        self.db_config = db_config
        self.thresholds = PerformanceThresholds()
        self.alert_history: List[Dict] = []

    def connect_db(self):
        """Connect to TimescaleDB for metrics storage"""
        return psycopg2.connect(**self.db_config)

    def calculate_metrics(
        self,
        model_name: str,
        predictions: List[
            Tuple[int, int, float]
        ],  # (true_label, predicted_label, confidence)
        start_time: datetime,
        end_time: datetime,
    ) -> PerformanceMetrics:
        """Calculate performance metrics from predictions"""

        # Calculate confusion matrix
        tp = sum(
            1
            for true_label, pred_label, _ in predictions
            if true_label == 1 and pred_label == 1
        )
        tn = sum(
            1
            for true_label, pred_label, _ in predictions
            if true_label == 0 and pred_label == 0
        )
        fp = sum(
            1
            for true_label, pred_label, _ in predictions
            if true_label == 0 and pred_label == 1
        )
        fn = sum(
            1
            for true_label, pred_label, _ in predictions
            if true_label == 1 and pred_label == 0
        )

        # Calculate metrics
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0

        # Calculate AUC-ROC (simplified)
        confidences = [conf for _, _, conf in predictions]
        auc_roc = np.mean(confidences) if confidences else 0.0

        # Calculate calibration error (Expected Calibration Error)
        calibration_error = self._calculate_ece(predictions)

        # Calculate average latency
        total_time = (end_time - start_time).total_seconds()
        avg_latency = total_time / len(predictions) if predictions else 0.0

        return PerformanceMetrics(
            model_name=model_name,
            timestamp=datetime.now(),
            sensitivity=sensitivity,
            specificity=specificity,
            ppv=ppv,
            npv=npv,
            auc_roc=auc_roc,
            calibration_error=calibration_error,
            prediction_latency=avg_latency,
            total_predictions=len(predictions),
            true_positives=tp,
            true_negatives=tn,
            false_positives=fp,
            false_negatives=fn,
        )

    def _calculate_ece(
        self, predictions: List[Tuple[int, int, float]], n_bins: int = 10
    ) -> float:
        """Calculate Expected Calibration Error"""
        bins = np.linspace(0, 1, n_bins + 1)
        bin_accuracies = []
        bin_confidences = []
        bin_counts = []

        for i in range(n_bins):
            bin_lower = bins[i]
            bin_upper = bins[i + 1]

            in_bin = [
                (true_label == pred_label, conf)
                for true_label, pred_label, conf in predictions
                if bin_lower <= conf < bin_upper
            ]

            if in_bin:
                accuracy = sum(correct for correct, _ in in_bin) / len(in_bin)
                confidence = sum(conf for _, conf in in_bin) / len(in_bin)
                bin_accuracies.append(accuracy)
                bin_confidences.append(confidence)
                bin_counts.append(len(in_bin))

        if not bin_counts:
            return 0.0

        total = sum(bin_counts)
        ece = sum(
            (count / total) * abs(acc - conf)
            for acc, conf, count in zip(bin_accuracies, bin_confidences, bin_counts)
        )

        return ece

    def check_thresholds(
        self, metrics: PerformanceMetrics
    ) -> Tuple[AlertLevel, List[str]]:
        """Check if metrics breach thresholds"""
        alerts = []
        max_level = AlertLevel.INFO

        # Check sensitivity
        if metrics.sensitivity < self.thresholds.sensitivity_action:
            alerts.append(f"Sensitivity critically low: {metrics.sensitivity:.3f}")
            max_level = AlertLevel.EMERGENCY
        elif metrics.sensitivity < self.thresholds.sensitivity_alert:
            alerts.append(
                f"Sensitivity below alert threshold: {metrics.sensitivity:.3f}"
            )
            max_level = max(max_level, AlertLevel.CRITICAL)
        elif metrics.sensitivity < self.thresholds.sensitivity_target:
            alerts.append(f"Sensitivity below target: {metrics.sensitivity:.3f}")
            max_level = max(max_level, AlertLevel.WARNING)

        # Check specificity
        if metrics.specificity < self.thresholds.specificity_action:
            alerts.append(f"Specificity critically low: {metrics.specificity:.3f}")
            max_level = AlertLevel.EMERGENCY
        elif metrics.specificity < self.thresholds.specificity_alert:
            alerts.append(
                f"Specificity below alert threshold: {metrics.specificity:.3f}"
            )
            max_level = max(max_level, AlertLevel.CRITICAL)
        elif metrics.specificity < self.thresholds.specificity_target:
            alerts.append(f"Specificity below target: {metrics.specificity:.3f}")
            max_level = max(max_level, AlertLevel.WARNING)

        # Check AUC-ROC
        if metrics.auc_roc < self.thresholds.auc_action:
            alerts.append(f"AUC-ROC critically low: {metrics.auc_roc:.3f}")
            max_level = AlertLevel.EMERGENCY
        elif metrics.auc_roc < self.thresholds.auc_alert:
            alerts.append(f"AUC-ROC below alert threshold: {metrics.auc_roc:.3f}")
            max_level = max(max_level, AlertLevel.CRITICAL)

        # Check calibration error
        if metrics.calibration_error > self.thresholds.calibration_action:
            alerts.append(
                f"Calibration error too high: {metrics.calibration_error:.3f}"
            )
            max_level = AlertLevel.EMERGENCY
        elif metrics.calibration_error > self.thresholds.calibration_alert:
            alerts.append(
                f"Calibration error above alert threshold: {metrics.calibration_error:.3f}"
            )
            max_level = max(max_level, AlertLevel.CRITICAL)

        # Check latency
        if metrics.prediction_latency > self.thresholds.latency_action:
            alerts.append(
                f"Prediction latency too high: {metrics.prediction_latency:.2f}s"
            )
            max_level = max(max_level, AlertLevel.CRITICAL)
        elif metrics.prediction_latency > self.thresholds.latency_alert:
            alerts.append(
                f"Prediction latency above alert threshold: {metrics.prediction_latency:.2f}s"
            )
            max_level = max(max_level, AlertLevel.WARNING)

        return max_level, alerts

    def store_metrics(self, metrics: PerformanceMetrics):
        """Store metrics in TimescaleDB"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_performance_metrics (
                        model_name, timestamp, sensitivity, specificity,
                        ppv, npv, auc_roc, calibration_error,
                        prediction_latency, total_predictions,
                        true_positives, true_negatives,
                        false_positives, false_negatives
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """,
                    (
                        metrics.model_name,
                        metrics.timestamp,
                        metrics.sensitivity,
                        metrics.specificity,
                        metrics.ppv,
                        metrics.npv,
                        metrics.auc_roc,
                        metrics.calibration_error,
                        metrics.prediction_latency,
                        metrics.total_predictions,
                        metrics.true_positives,
                        metrics.true_negatives,
                        metrics.false_positives,
                        metrics.false_negatives,
                    ),
                )
                conn.commit()

                # Update Prometheus metrics
                performance_gauge.labels(
                    model=metrics.model_name, metric="sensitivity"
                ).set(metrics.sensitivity)

                performance_gauge.labels(
                    model=metrics.model_name, metric="specificity"
                ).set(metrics.specificity)

                performance_gauge.labels(
                    model=metrics.model_name, metric="auc_roc"
                ).set(metrics.auc_roc)

                logger.info(f"Stored metrics for {metrics.model_name}")

        finally:
            conn.close()

    def create_alert(
        self,
        model_name: str,
        level: AlertLevel,
        messages: List[str],
        metrics: PerformanceMetrics,
    ):
        """Create and store alert"""
        alert = {
            "model_name": model_name,
            "level": level.value,
            "messages": messages,
            "timestamp": datetime.now(),
            "metrics": asdict(metrics),
        }

        self.alert_history.append(alert)

        # Store in database
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_performance_alerts (
                        model_name, alert_level, messages, timestamp, metrics
                    ) VALUES (%s, %s, %s, %s, %s)
                """,
                    (
                        model_name,
                        level.value,
                        messages,
                        alert["timestamp"],
                        str(alert["metrics"]),
                    ),
                )
                conn.commit()

                # Update Prometheus counter
                alert_counter.labels(model=model_name, level=level.value).inc()

                logger.warning(
                    f"Alert created for {model_name}: {level.value} - {messages}"
                )

                # Send notifications based on level
                if level == AlertLevel.EMERGENCY:
                    self._send_emergency_notification(alert)
                elif level == AlertLevel.CRITICAL:
                    self._send_critical_notification(alert)

        finally:
            conn.close()

    def _send_emergency_notification(self, alert: Dict):
        """Send emergency notification (PagerDuty, email, SMS)"""
        logger.critical(f"EMERGENCY ALERT: {alert}")
        # TODO: Integrate with PagerDuty API
        # TODO: Send email to on-call team
        # TODO: Send SMS to CISO

    def _send_critical_notification(self, alert: Dict):
        """Send critical notification (email, Slack)"""
        logger.error(f"CRITICAL ALERT: {alert}")
        # TODO: Send email to AI/ML team
        # TODO: Post to Slack #ai-alerts channel

    async def monitor_model(self, model_name: str, interval_minutes: int = 60):
        """Continuously monitor model performance"""
        logger.info(f"Starting monitoring for {model_name}")

        while True:
            try:
                # Fetch recent predictions from database
                end_time = datetime.now()
                start_time = end_time - timedelta(minutes=interval_minutes)

                predictions = self._fetch_predictions(model_name, start_time, end_time)

                if predictions:
                    # Calculate metrics
                    metrics = self.calculate_metrics(
                        model_name, predictions, start_time, end_time
                    )

                    # Store metrics
                    self.store_metrics(metrics)

                    # Check thresholds
                    alert_level, messages = self.check_thresholds(metrics)

                    if messages:
                        self.create_alert(model_name, alert_level, messages, metrics)

                    logger.info(
                        f"{model_name} - Sensitivity: {metrics.sensitivity:.3f}, "
                        f"Specificity: {metrics.specificity:.3f}, "
                        f"AUC: {metrics.auc_roc:.3f}"
                    )

            except Exception as e:
                logger.error(f"Error monitoring {model_name}: {e}")

            # Wait for next interval
            await asyncio.sleep(interval_minutes * 60)

    def _fetch_predictions(
        self, model_name: str, start_time: datetime, end_time: datetime
    ) -> List[Tuple[int, int, float]]:
        """Fetch predictions from database"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT true_label, predicted_label, confidence
                    FROM ai_predictions
                    WHERE model_name = %s
                    AND timestamp BETWEEN %s AND %s
                    AND true_label IS NOT NULL
                """,
                    (model_name, start_time, end_time),
                )

                results = cur.fetchall()
                return [
                    (row["true_label"], row["predicted_label"], row["confidence"])
                    for row in results
                ]
        finally:
            conn.close()

    def get_performance_report(self, model_name: str, days: int = 30) -> Dict:
        """Generate performance report for FDA submission"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get metrics for last N days
                cur.execute(
                    """
                    SELECT *
                    FROM ai_performance_metrics
                    WHERE model_name = %s
                    AND timestamp >= NOW() - INTERVAL '%s days'
                    ORDER BY timestamp DESC
                """,
                    (model_name, days),
                )

                metrics = cur.fetchall()

                # Get alerts for last N days
                cur.execute(
                    """
                    SELECT *
                    FROM ai_performance_alerts
                    WHERE model_name = %s
                    AND timestamp >= NOW() - INTERVAL '%s days'
                    ORDER BY timestamp DESC
                """,
                    (model_name, days),
                )

                alerts = cur.fetchall()

                return {
                    "model_name": model_name,
                    "report_period_days": days,
                    "total_metrics": len(metrics),
                    "total_alerts": len(alerts),
                    "metrics": metrics,
                    "alerts": alerts,
                    "summary": self._calculate_summary(metrics),
                }
        finally:
            conn.close()

    def _calculate_summary(self, metrics: List[Dict]) -> Dict:
        """Calculate summary statistics"""
        if not metrics:
            return {}

        sensitivities = [m["sensitivity"] for m in metrics]
        specificities = [m["specificity"] for m in metrics]
        aucs = [m["auc_roc"] for m in metrics]

        return {
            "avg_sensitivity": np.mean(sensitivities),
            "min_sensitivity": np.min(sensitivities),
            "max_sensitivity": np.max(sensitivities),
            "avg_specificity": np.mean(specificities),
            "min_specificity": np.min(specificities),
            "max_specificity": np.max(specificities),
            "avg_auc": np.mean(aucs),
            "min_auc": np.min(aucs),
            "max_auc": np.max(aucs),
        }


async def main():
    """Main monitoring loop"""
    # Database configuration
    db_config = {
        "host": "localhost",
        "port": 5432,
        "database": "netra_ai",
        "user": "netra_ai",
        "password": "secure_password",
    }

    # Start Prometheus metrics server
    start_http_server(8000)
    logger.info("Prometheus metrics server started on port 8000")

    # Initialize APM system
    apm = APMSystem(db_config)

    # Start monitoring all models
    tasks = [
        apm.monitor_model(AIModel.DIABETIC_RETINOPATHY.value, interval_minutes=60),
        apm.monitor_model(AIModel.CATARACT.value, interval_minutes=60),
        apm.monitor_model(AIModel.ANEMIA.value, interval_minutes=60),
        apm.monitor_model(AIModel.PARKINSONS.value, interval_minutes=60),
        apm.monitor_model(
            AIModel.MENTAL_HEALTH.value, interval_minutes=30
        ),  # More frequent for Class C
    ]

    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
