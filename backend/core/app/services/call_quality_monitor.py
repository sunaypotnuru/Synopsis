"""
Call Quality Monitor Service for Video Consultations
Tracks and analyzes video/audio quality metrics
"""

import logging
from typing import Dict, Any
from datetime import datetime
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


class CallQualityMonitor:
    """Service for monitoring video consultation call quality"""

    def __init__(self):
        # Quality thresholds
        self.thresholds = {
            "video_bitrate_min": 500,  # kbps
            "audio_bitrate_min": 32,  # kbps
            "packet_loss_max": 5.0,  # percentage
            "jitter_max": 30,  # milliseconds
            "rtt_max": 300,  # milliseconds (round-trip time)
            "fps_min": 15,  # frames per second
        }

    # ==================== METRICS SUBMISSION ====================

    def submit_metrics(
        self, consultation_id: str, user_id: str, metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submit call quality metrics

        Args:
            consultation_id: Video consultation ID
            user_id: User submitting metrics
            metrics: Dictionary with quality metrics

        Returns:
            Dictionary with success status and quality score
        """
        try:
            # Calculate quality score
            quality_score = self._calculate_quality_score(metrics)
            quality_rating = self._get_quality_rating(quality_score)

            # Prepare metrics entry
            entry = {
                "consultation_id": consultation_id,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "video_bitrate_kbps": metrics.get("video_bitrate", 0),
                "audio_bitrate_kbps": metrics.get("audio_bitrate", 0),
                "packet_loss_percent": metrics.get("packet_loss", 0),
                "jitter_ms": metrics.get("jitter", 0),
                "round_trip_time_ms": metrics.get("rtt", 0),
                "frames_per_second": metrics.get("fps", 0),
                "quality_score": quality_score,
                "quality_rating": quality_rating,
            }

            # Insert into database
            result = supabase.table("call_quality_metrics").insert(entry).execute()

            if result.data:
                logger.debug(
                    f"Quality metrics submitted: {consultation_id}, score: {quality_score}"
                )

                # Check if quality is poor and needs alert
                if quality_rating == "poor":
                    self._send_quality_alert(
                        consultation_id, user_id, quality_score, metrics
                    )

                return {
                    "success": True,
                    "metrics": result.data[0],
                    "quality_score": quality_score,
                    "quality_rating": quality_rating,
                }

            return {"success": False, "error": "Failed to submit metrics"}

        except Exception as e:
            logger.error(f"Error submitting metrics: {e}")
            return {"success": False, "error": str(e)}

    # ==================== QUALITY CALCULATION ====================

    def _calculate_quality_score(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate overall quality score (0-100)

        Weighted scoring:
        - Video bitrate: 25%
        - Audio bitrate: 15%
        - Packet loss: 25%
        - Jitter: 15%
        - RTT: 15%
        - FPS: 5%
        """
        try:
            scores = []

            # Video bitrate score (0-100)
            video_bitrate = metrics.get("video_bitrate", 0)
            if video_bitrate >= 2000:
                video_score = 100
            elif video_bitrate >= self.thresholds["video_bitrate_min"]:
                video_score = 50 + (video_bitrate - 500) / 1500 * 50
            else:
                video_score = video_bitrate / 500 * 50
            scores.append(("video", video_score, 0.25))

            # Audio bitrate score (0-100)
            audio_bitrate = metrics.get("audio_bitrate", 0)
            if audio_bitrate >= 128:
                audio_score = 100
            elif audio_bitrate >= self.thresholds["audio_bitrate_min"]:
                audio_score = 50 + (audio_bitrate - 32) / 96 * 50
            else:
                audio_score = audio_bitrate / 32 * 50
            scores.append(("audio", audio_score, 0.15))

            # Packet loss score (0-100, inverted)
            packet_loss = metrics.get("packet_loss", 0)
            if packet_loss <= 1.0:
                packet_loss_score = 100
            elif packet_loss <= self.thresholds["packet_loss_max"]:
                packet_loss_score = 100 - (packet_loss - 1.0) / 4.0 * 50
            else:
                packet_loss_score = max(0, 50 - (packet_loss - 5.0) * 10)
            scores.append(("packet_loss", packet_loss_score, 0.25))

            # Jitter score (0-100, inverted)
            jitter = metrics.get("jitter", 0)
            if jitter <= 10:
                jitter_score = 100
            elif jitter <= self.thresholds["jitter_max"]:
                jitter_score = 100 - (jitter - 10) / 20 * 50
            else:
                jitter_score = max(0, 50 - (jitter - 30) * 2)
            scores.append(("jitter", jitter_score, 0.15))

            # RTT score (0-100, inverted)
            rtt = metrics.get("rtt", 0)
            if rtt <= 100:
                rtt_score = 100
            elif rtt <= self.thresholds["rtt_max"]:
                rtt_score = 100 - (rtt - 100) / 200 * 50
            else:
                rtt_score = max(0, 50 - (rtt - 300) * 0.5)
            scores.append(("rtt", rtt_score, 0.15))

            # FPS score (0-100)
            fps = metrics.get("fps", 0)
            if fps >= 30:
                fps_score = 100
            elif fps >= self.thresholds["fps_min"]:
                fps_score = 50 + (fps - 15) / 15 * 50
            else:
                fps_score = fps / 15 * 50
            scores.append(("fps", fps_score, 0.05))

            # Calculate weighted average
            total_score = sum(score * weight for _, score, weight in scores)

            return round(total_score, 2)

        except Exception as e:
            logger.error(f"Error calculating quality score: {e}")
            return 0.0

    def _get_quality_rating(self, score: float) -> str:
        """Get quality rating from score"""
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "fair"
        else:
            return "poor"

    # ==================== QUALITY STATISTICS ====================

    def get_quality_statistics(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get quality statistics for consultation

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with quality statistics
        """
        try:
            # Get all metrics for consultation
            result = (
                supabase.table("call_quality_metrics")
                .select("*")
                .eq("consultation_id", consultation_id)
                .order("timestamp", desc=False)
                .execute()
            )

            if not result.data:
                return {
                    "success": True,
                    "metrics_count": 0,
                    "avg_quality_score": 0,
                    "quality_rating": "unknown",
                }

            metrics = result.data

            # Calculate statistics
            quality_scores = [m["quality_score"] for m in metrics]
            avg_score = sum(quality_scores) / len(quality_scores)
            min_score = min(quality_scores)
            max_score = max(quality_scores)

            # Count by rating
            ratings = [m["quality_rating"] for m in metrics]
            rating_counts = {
                "excellent": ratings.count("excellent"),
                "good": ratings.count("good"),
                "fair": ratings.count("fair"),
                "poor": ratings.count("poor"),
            }

            # Calculate average metrics
            avg_metrics = {
                "video_bitrate": sum(m["video_bitrate_kbps"] for m in metrics)
                / len(metrics),
                "audio_bitrate": sum(m["audio_bitrate_kbps"] for m in metrics)
                / len(metrics),
                "packet_loss": sum(m["packet_loss_percent"] for m in metrics)
                / len(metrics),
                "jitter": sum(m["jitter_ms"] for m in metrics) / len(metrics),
                "rtt": sum(m["round_trip_time_ms"] for m in metrics) / len(metrics),
                "fps": sum(m["frames_per_second"] for m in metrics) / len(metrics),
            }

            return {
                "success": True,
                "metrics_count": len(metrics),
                "avg_quality_score": round(avg_score, 2),
                "min_quality_score": round(min_score, 2),
                "max_quality_score": round(max_score, 2),
                "quality_rating": self._get_quality_rating(avg_score),
                "rating_distribution": rating_counts,
                "avg_metrics": avg_metrics,
            }

        except Exception as e:
            logger.error(f"Error getting quality statistics: {e}")
            return {"success": False, "error": str(e)}

    def get_latest_metrics(
        self, consultation_id: str, limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get latest quality metrics

        Args:
            consultation_id: Video consultation ID
            limit: Number of latest metrics to retrieve

        Returns:
            Dictionary with latest metrics
        """
        try:
            result = (
                supabase.table("call_quality_metrics")
                .select("*")
                .eq("consultation_id", consultation_id)
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )

            if result.data:
                return {"success": True, "metrics": result.data}

            return {"success": True, "metrics": []}

        except Exception as e:
            logger.error(f"Error getting latest metrics: {e}")
            return {"success": False, "error": str(e)}

    # ==================== QUALITY TRENDS ====================

    def get_quality_trends(
        self, consultation_id: str, interval_seconds: int = 30
    ) -> Dict[str, Any]:
        """
        Get quality trends over time

        Args:
            consultation_id: Video consultation ID
            interval_seconds: Time interval for grouping

        Returns:
            Dictionary with quality trends
        """
        try:
            # Get all metrics
            result = (
                supabase.table("call_quality_metrics")
                .select("*")
                .eq("consultation_id", consultation_id)
                .order("timestamp", desc=False)
                .execute()
            )

            if not result.data:
                return {"success": True, "trends": []}

            metrics = result.data

            # Group by time intervals
            trends = []
            current_group = []
            group_start = None

            for metric in metrics:
                timestamp = datetime.fromisoformat(
                    metric["timestamp"].replace("Z", "+00:00")
                )

                if group_start is None:
                    group_start = timestamp

                # Check if metric belongs to current group
                if (timestamp - group_start).total_seconds() <= interval_seconds:
                    current_group.append(metric)
                else:
                    # Calculate average for current group
                    if current_group:
                        avg_score = sum(
                            m["quality_score"] for m in current_group
                        ) / len(current_group)
                        trends.append(
                            {
                                "timestamp": group_start.isoformat(),
                                "avg_quality_score": round(avg_score, 2),
                                "quality_rating": self._get_quality_rating(avg_score),
                                "sample_count": len(current_group),
                            }
                        )

                    # Start new group
                    current_group = [metric]
                    group_start = timestamp

            # Add last group
            if current_group:
                avg_score = sum(m["quality_score"] for m in current_group) / len(
                    current_group
                )
                trends.append(
                    {
                        "timestamp": group_start.isoformat(),
                        "avg_quality_score": round(avg_score, 2),
                        "quality_rating": self._get_quality_rating(avg_score),
                        "sample_count": len(current_group),
                    }
                )

            return {
                "success": True,
                "trends": trends,
                "interval_seconds": interval_seconds,
            }

        except Exception as e:
            logger.error(f"Error getting quality trends: {e}")
            return {"success": False, "error": str(e)}

    # ==================== QUALITY ALERTS ====================

    def _send_quality_alert(
        self,
        consultation_id: str,
        user_id: str,
        quality_score: float,
        metrics: Dict[str, Any],
    ):
        """Send alert for poor quality"""
        try:
            # Identify issues
            issues = []

            if metrics.get("video_bitrate", 0) < self.thresholds["video_bitrate_min"]:
                issues.append("Low video bitrate")

            if metrics.get("audio_bitrate", 0) < self.thresholds["audio_bitrate_min"]:
                issues.append("Low audio bitrate")

            if metrics.get("packet_loss", 0) > self.thresholds["packet_loss_max"]:
                issues.append("High packet loss")

            if metrics.get("jitter", 0) > self.thresholds["jitter_max"]:
                issues.append("High jitter")

            if metrics.get("rtt", 0) > self.thresholds["rtt_max"]:
                issues.append("High latency")

            if metrics.get("fps", 0) < self.thresholds["fps_min"]:
                issues.append("Low frame rate")

            logger.warning(
                f"Poor call quality detected: {consultation_id}, "
                f"score: {quality_score}, issues: {', '.join(issues)}"
            )

            # TODO: Send actual alert (WebSocket, push notification, etc.)

        except Exception as e:
            logger.error(f"Error sending quality alert: {e}")

    def get_diagnostics(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get diagnostic information for troubleshooting

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with diagnostic information
        """
        try:
            # Get latest metrics
            latest = self.get_latest_metrics(consultation_id, limit=5)

            if not latest["success"] or not latest["metrics"]:
                return {"success": True, "diagnostics": "No metrics available"}

            metrics = latest["metrics"][0]  # Most recent

            # Analyze issues
            issues = []
            recommendations = []

            if metrics["video_bitrate_kbps"] < self.thresholds["video_bitrate_min"]:
                issues.append("Low video bitrate")
                recommendations.append("Check internet connection speed")

            if metrics["packet_loss_percent"] > self.thresholds["packet_loss_max"]:
                issues.append("High packet loss")
                recommendations.append("Check network stability, try wired connection")

            if metrics["jitter_ms"] > self.thresholds["jitter_max"]:
                issues.append("High jitter")
                recommendations.append("Close other applications using network")

            if metrics["round_trip_time_ms"] > self.thresholds["rtt_max"]:
                issues.append("High latency")
                recommendations.append("Move closer to router or use wired connection")

            if metrics["frames_per_second"] < self.thresholds["fps_min"]:
                issues.append("Low frame rate")
                recommendations.append("Close other applications, check CPU usage")

            return {
                "success": True,
                "quality_score": metrics["quality_score"],
                "quality_rating": metrics["quality_rating"],
                "issues": issues,
                "recommendations": recommendations,
                "current_metrics": metrics,
            }

        except Exception as e:
            logger.error(f"Error getting diagnostics: {e}")
            return {"success": False, "error": str(e)}


# ==================== SERVICE INSTANCE ====================

_call_quality_monitor = None


def get_call_quality_monitor() -> CallQualityMonitor:
    """Get or create call quality monitor instance"""
    global _call_quality_monitor
    if _call_quality_monitor is None:
        _call_quality_monitor = CallQualityMonitor()
    return _call_quality_monitor
