"""
Waiting Room Service for Video Consultations
Manages patient queue, position tracking, and notifications
"""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


class WaitingRoomService:
    """Service for managing video consultation waiting room"""

    def __init__(self):
        self.auto_timeout_minutes = 30  # Auto-remove after 30 minutes

    # ==================== QUEUE MANAGEMENT ====================

    def add_to_waiting_room(
        self, consultation_id: str, patient_id: str, doctor_id: str, priority: int = 0
    ) -> Dict[str, Any]:
        """
        Add patient to waiting room queue

        Args:
            consultation_id: Video consultation ID
            patient_id: Patient user ID
            doctor_id: Doctor user ID
            priority: Queue priority (0=normal, 1=high, 2=urgent)

        Returns:
            Dictionary with queue entry details
        """
        try:
            # Check if already in queue
            existing = (
                supabase.table("waiting_room")
                .select("*")
                .eq("consultation_id", consultation_id)
                .eq("status", "waiting")
                .execute()
            )

            if existing.data:
                logger.warning(f"Patient already in waiting room: {consultation_id}")
                return {
                    "success": False,
                    "error": "Already in waiting room",
                    "entry": existing.data[0],
                }

            # Add to queue
            entry = {
                "consultation_id": consultation_id,
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "status": "waiting",
                "priority": priority,
                "joined_at": datetime.utcnow().isoformat(),
                "notified_at": None,
            }

            result = supabase.table("waiting_room").insert(entry).execute()

            if result.data:
                queue_entry = result.data[0]

                # Calculate position
                position = self._calculate_position(doctor_id, queue_entry["id"])
                estimated_wait = self._estimate_wait_time(doctor_id, position)

                logger.info(
                    f"Added to waiting room: {consultation_id}, position: {position}"
                )

                return {
                    "success": True,
                    "entry": queue_entry,
                    "position": position,
                    "estimated_wait_minutes": estimated_wait,
                }

            return {"success": False, "error": "Failed to add to queue"}

        except Exception as e:
            logger.error(f"Error adding to waiting room: {e}")
            return {"success": False, "error": str(e)}

    def remove_from_waiting_room(
        self, consultation_id: str, reason: str = "left"
    ) -> Dict[str, Any]:
        """
        Remove patient from waiting room

        Args:
            consultation_id: Video consultation ID
            reason: Reason for removal (left, called, timeout)

        Returns:
            Dictionary with success status
        """
        try:
            # Update status
            result = (
                supabase.table("waiting_room")
                .update({"status": reason, "left_at": datetime.utcnow().isoformat()})
                .eq("consultation_id", consultation_id)
                .eq("status", "waiting")
                .execute()
            )

            if result.data:
                logger.info(
                    f"Removed from waiting room: {consultation_id}, reason: {reason}"
                )
                return {"success": True, "entry": result.data[0]}

            return {"success": False, "error": "Not found in waiting room"}

        except Exception as e:
            logger.error(f"Error removing from waiting room: {e}")
            return {"success": False, "error": str(e)}

    # ==================== POSITION & WAIT TIME ====================

    def get_queue_position(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get patient's position in queue

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with position and wait time
        """
        try:
            # Get entry
            entry_result = (
                supabase.table("waiting_room")
                .select("*")
                .eq("consultation_id", consultation_id)
                .eq("status", "waiting")
                .execute()
            )

            if not entry_result.data:
                return {"success": False, "error": "Not in waiting room"}

            entry = entry_result.data[0]
            doctor_id = entry["doctor_id"]

            # Calculate position
            position = self._calculate_position(doctor_id, entry["id"])
            estimated_wait = self._estimate_wait_time(doctor_id, position)

            # Calculate actual wait time
            joined_at = datetime.fromisoformat(
                entry["joined_at"].replace("Z", "+00:00")
            )
            wait_time_minutes = int(
                (datetime.utcnow() - joined_at.replace(tzinfo=None)).total_seconds()
                / 60
            )

            return {
                "success": True,
                "position": position,
                "estimated_wait_minutes": estimated_wait,
                "actual_wait_minutes": wait_time_minutes,
                "joined_at": entry["joined_at"],
            }

        except Exception as e:
            logger.error(f"Error getting queue position: {e}")
            return {"success": False, "error": str(e)}

    def _calculate_position(self, doctor_id: str, entry_id: int) -> int:
        """Calculate position in queue based on priority and join time"""
        try:
            # Get all waiting entries for this doctor, ordered by priority and join time
            queue = (
                supabase.table("waiting_room")
                .select("id")
                .eq("doctor_id", doctor_id)
                .eq("status", "waiting")
                .order("priority", desc=True)
                .order("joined_at", desc=False)
                .execute()
            )

            if queue.data:
                # Find position (1-indexed)
                for i, entry in enumerate(queue.data, 1):
                    if entry["id"] == entry_id:
                        return i

            return 1

        except Exception as e:
            logger.error(f"Error calculating position: {e}")
            return 1

    def _estimate_wait_time(self, doctor_id: str, position: int) -> int:
        """
        Estimate wait time in minutes

        Assumes average consultation time of 15 minutes
        """
        avg_consultation_minutes = 15
        return (position - 1) * avg_consultation_minutes

    # ==================== DOCTOR OPERATIONS ====================

    def get_queue(self, doctor_id: str) -> Dict[str, Any]:
        """
        Get waiting room queue for doctor

        Args:
            doctor_id: Doctor user ID

        Returns:
            Dictionary with queue entries
        """
        try:
            # Get all waiting entries, ordered by priority and join time
            result = (
                supabase.table("waiting_room")
                .select("*, video_consultations(appointment_id)")
                .eq("doctor_id", doctor_id)
                .eq("status", "waiting")
                .order("priority", desc=True)
                .order("joined_at", desc=False)
                .execute()
            )

            if result.data:
                # Add position and wait time to each entry
                queue = []
                for i, entry in enumerate(result.data, 1):
                    joined_at = datetime.fromisoformat(
                        entry["joined_at"].replace("Z", "+00:00")
                    )
                    wait_time = int(
                        (
                            datetime.utcnow() - joined_at.replace(tzinfo=None)
                        ).total_seconds()
                        / 60
                    )

                    queue.append(
                        {**entry, "position": i, "wait_time_minutes": wait_time}
                    )

                return {"success": True, "queue": queue, "total_waiting": len(queue)}

            return {"success": True, "queue": [], "total_waiting": 0}

        except Exception as e:
            logger.error(f"Error getting queue: {e}")
            return {"success": False, "error": str(e)}

    def call_next_patient(self, doctor_id: str) -> Dict[str, Any]:
        """
        Call next patient in queue

        Args:
            doctor_id: Doctor user ID

        Returns:
            Dictionary with next patient details
        """
        try:
            # Get next patient (highest priority, earliest join time)
            result = (
                supabase.table("waiting_room")
                .select("*, video_consultations(*)")
                .eq("doctor_id", doctor_id)
                .eq("status", "waiting")
                .order("priority", desc=True)
                .order("joined_at", desc=False)
                .limit(1)
                .execute()
            )

            if not result.data:
                return {"success": False, "error": "No patients waiting"}

            next_patient = result.data[0]

            # Update status to called
            supabase.table("waiting_room").update(
                {"status": "called", "notified_at": datetime.utcnow().isoformat()}
            ).eq("id", next_patient["id"]).execute()

            logger.info(f"Called next patient: {next_patient['consultation_id']}")

            # TODO: Send notification to patient (WebSocket, push notification, etc.)

            return {
                "success": True,
                "patient": next_patient,
                "consultation_id": next_patient["consultation_id"],
            }

        except Exception as e:
            logger.error(f"Error calling next patient: {e}")
            return {"success": False, "error": str(e)}

    # ==================== NOTIFICATIONS ====================

    def notify_patient(self, consultation_id: str, message: str) -> Dict[str, Any]:
        """
        Send notification to patient in waiting room

        Args:
            consultation_id: Video consultation ID
            message: Notification message

        Returns:
            Dictionary with success status
        """
        try:
            # Get entry
            entry_result = (
                supabase.table("waiting_room")
                .select("*")
                .eq("consultation_id", consultation_id)
                .eq("status", "waiting")
                .execute()
            )

            if not entry_result.data:
                return {"success": False, "error": "Not in waiting room"}

            entry = entry_result.data[0]

            # Update notified_at
            supabase.table("waiting_room").update(
                {"notified_at": datetime.utcnow().isoformat()}
            ).eq("id", entry["id"]).execute()

            # TODO: Send actual notification (WebSocket, push, SMS, email)
            logger.info(
                f"Notification sent to patient: {consultation_id}, message: {message}"
            )

            return {"success": True, "message": "Notification sent"}

        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return {"success": False, "error": str(e)}

    # ==================== AUTO-TIMEOUT ====================

    def check_timeouts(self) -> Dict[str, Any]:
        """
        Check for timed-out waiting room entries and remove them

        Returns:
            Dictionary with timeout statistics
        """
        try:
            # Calculate timeout threshold
            timeout_threshold = datetime.utcnow() - timedelta(
                minutes=self.auto_timeout_minutes
            )

            # Get timed-out entries
            result = (
                supabase.table("waiting_room")
                .select("*")
                .eq("status", "waiting")
                .lt("joined_at", timeout_threshold.isoformat())
                .execute()
            )

            if result.data:
                timed_out_count = len(result.data)

                # Update status to timeout
                for entry in result.data:
                    supabase.table("waiting_room").update(
                        {"status": "timeout", "left_at": datetime.utcnow().isoformat()}
                    ).eq("id", entry["id"]).execute()

                    logger.info(f"Waiting room timeout: {entry['consultation_id']}")

                return {
                    "success": True,
                    "timed_out_count": timed_out_count,
                    "entries": result.data,
                }

            return {"success": True, "timed_out_count": 0, "entries": []}

        except Exception as e:
            logger.error(f"Error checking timeouts: {e}")
            return {"success": False, "error": str(e)}

    # ==================== STATISTICS ====================

    def get_statistics(self, doctor_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get waiting room statistics for doctor

        Args:
            doctor_id: Doctor user ID
            days: Number of days to analyze

        Returns:
            Dictionary with statistics
        """
        try:
            start_date = datetime.utcnow() - timedelta(days=days)

            # Get all entries for time period
            result = (
                supabase.table("waiting_room")
                .select("*")
                .eq("doctor_id", doctor_id)
                .gte("joined_at", start_date.isoformat())
                .execute()
            )

            if not result.data:
                return {
                    "success": True,
                    "total_patients": 0,
                    "avg_wait_time_minutes": 0,
                    "max_wait_time_minutes": 0,
                    "timeout_rate": 0,
                }

            entries = result.data
            total_patients = len(entries)

            # Calculate wait times
            wait_times = []
            timeout_count = 0

            for entry in entries:
                joined_at = datetime.fromisoformat(
                    entry["joined_at"].replace("Z", "+00:00")
                )

                if entry["left_at"]:
                    left_at = datetime.fromisoformat(
                        entry["left_at"].replace("Z", "+00:00")
                    )
                    wait_time = int((left_at - joined_at).total_seconds() / 60)
                    wait_times.append(wait_time)

                if entry["status"] == "timeout":
                    timeout_count += 1

            avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0
            max_wait = max(wait_times) if wait_times else 0
            timeout_rate = (
                (timeout_count / total_patients * 100) if total_patients > 0 else 0
            )

            return {
                "success": True,
                "total_patients": total_patients,
                "avg_wait_time_minutes": round(avg_wait, 1),
                "max_wait_time_minutes": max_wait,
                "timeout_count": timeout_count,
                "timeout_rate": round(timeout_rate, 1),
                "days_analyzed": days,
            }

        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"success": False, "error": str(e)}


# ==================== SERVICE INSTANCE ====================

_waiting_room_service = None


def get_waiting_room_service() -> WaitingRoomService:
    """Get or create waiting room service instance"""
    global _waiting_room_service
    if _waiting_room_service is None:
        _waiting_room_service = WaitingRoomService()
    return _waiting_room_service
