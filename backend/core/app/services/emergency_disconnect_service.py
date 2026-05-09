"""
Emergency Disconnect Service for Video Consultations
Handles emergency disconnections and incident logging
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


class EmergencyDisconnectService:
    """Service for handling emergency disconnections during video consultations"""

    def __init__(self):
        self.emergency_reasons = [
            "medical_emergency",
            "technical_failure",
            "security_concern",
            "patient_distress",
            "inappropriate_behavior",
            "other",
        ]

    # ==================== EMERGENCY DISCONNECT ====================

    def emergency_disconnect(
        self,
        consultation_id: str,
        initiated_by: str,
        reason: str,
        description: Optional[str] = None,
        requires_followup: bool = True,
    ) -> Dict[str, Any]:
        """
        Perform emergency disconnect

        Args:
            consultation_id: Video consultation ID
            initiated_by: User ID initiating disconnect
            reason: Reason for disconnect (from emergency_reasons list)
            description: Detailed description of incident
            requires_followup: Whether follow-up is required

        Returns:
            Dictionary with disconnect details
        """
        try:
            # Validate reason
            if reason not in self.emergency_reasons:
                return {
                    "success": False,
                    "error": f"Invalid reason. Must be one of: {self.emergency_reasons}",
                }

            # Create incident record
            incident = {
                "consultation_id": consultation_id,
                "initiated_by": initiated_by,
                "disconnected_at": datetime.utcnow().isoformat(),
                "reason": reason,
                "description": description,
                "requires_followup": requires_followup,
                "followup_completed": False,
                "severity": self._determine_severity(reason),
            }

            result = supabase.table("emergency_disconnects").insert(incident).execute()

            if result.data:
                incident_record = result.data[0]

                logger.warning(
                    f"EMERGENCY DISCONNECT: consultation_id={consultation_id}, "
                    f"reason={reason}, initiated_by={initiated_by}"
                )

                # End the video consultation
                self._end_consultation(consultation_id, "emergency_disconnect")

                # Send notifications
                self._send_emergency_notifications(
                    consultation_id, initiated_by, reason, incident_record["id"]
                )

                # Schedule follow-up if required
                if requires_followup:
                    self._schedule_followup(consultation_id, incident_record["id"])

                return {
                    "success": True,
                    "incident": incident_record,
                    "message": "Emergency disconnect completed",
                    "followup_required": requires_followup,
                }

            return {"success": False, "error": "Failed to create incident record"}

        except Exception as e:
            logger.error(f"Error performing emergency disconnect: {e}")
            return {"success": False, "error": str(e)}

    def _determine_severity(self, reason: str) -> str:
        """Determine incident severity based on reason"""
        high_severity = ["medical_emergency", "patient_distress", "security_concern"]
        medium_severity = ["inappropriate_behavior", "technical_failure"]

        if reason in high_severity:
            return "high"
        elif reason in medium_severity:
            return "medium"
        else:
            return "low"

    def _end_consultation(self, consultation_id: str, end_reason: str):
        """End the video consultation"""
        try:
            supabase.table("video_consultations").update(
                {
                    "status": "ended",
                    "ended_at": datetime.utcnow().isoformat(),
                    "end_reason": end_reason,
                }
            ).eq("id", consultation_id).execute()

            logger.info(f"Consultation ended: {consultation_id}, reason: {end_reason}")

        except Exception as e:
            logger.error(f"Error ending consultation: {e}")

    def _send_emergency_notifications(
        self, consultation_id: str, initiated_by: str, reason: str, incident_id: int
    ):
        """Send emergency notifications to relevant parties"""
        try:
            # Get consultation details
            consultation_result = (
                supabase.table("video_consultations")
                .select("patient_id, doctor_id")
                .eq("id", consultation_id)
                .execute()
            )

            if not consultation_result.data:
                return

            consultation = consultation_result.data[0]

            # Determine who to notify
            notify_users = []
            if initiated_by != consultation["patient_id"]:
                notify_users.append(consultation["patient_id"])
            if initiated_by != consultation["doctor_id"]:
                notify_users.append(consultation["doctor_id"])

            # TODO: Send actual notifications (WebSocket, push, email, SMS)
            logger.info(
                f"Emergency notifications sent: incident_id={incident_id}, "
                f"reason={reason}, recipients={notify_users}"
            )

            # For high severity, notify administrators
            if self._determine_severity(reason) == "high":
                logger.warning(
                    f"HIGH SEVERITY INCIDENT: {incident_id}, "
                    f"consultation={consultation_id}, reason={reason}"
                )
                # TODO: Notify administrators

        except Exception as e:
            logger.error(f"Error sending emergency notifications: {e}")

    def _schedule_followup(self, consultation_id: str, incident_id: int):
        """Schedule follow-up for incident"""
        try:
            # TODO: Create follow-up task/appointment
            logger.info(
                f"Follow-up scheduled: incident_id={incident_id}, "
                f"consultation={consultation_id}"
            )

        except Exception as e:
            logger.error(f"Error scheduling follow-up: {e}")

    # ==================== INCIDENT MANAGEMENT ====================

    def get_incident(self, incident_id: int) -> Dict[str, Any]:
        """
        Get incident details

        Args:
            incident_id: Incident ID

        Returns:
            Dictionary with incident details
        """
        try:
            result = (
                supabase.table("emergency_disconnects")
                .select("*, video_consultations(patient_id, doctor_id, appointment_id)")
                .eq("id", incident_id)
                .execute()
            )

            if result.data:
                return {"success": True, "incident": result.data[0]}

            return {"success": False, "error": "Incident not found"}

        except Exception as e:
            logger.error(f"Error getting incident: {e}")
            return {"success": False, "error": str(e)}

    def get_consultation_incidents(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get all incidents for a consultation

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with incidents
        """
        try:
            result = (
                supabase.table("emergency_disconnects")
                .select("*")
                .eq("consultation_id", consultation_id)
                .order("disconnected_at", desc=True)
                .execute()
            )

            return {
                "success": True,
                "incidents": result.data or [],
                "total_incidents": len(result.data) if result.data else 0,
            }

        except Exception as e:
            logger.error(f"Error getting consultation incidents: {e}")
            return {"success": False, "error": str(e)}

    def update_incident(
        self, incident_id: int, updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update incident details

        Args:
            incident_id: Incident ID
            updates: Dictionary with fields to update

        Returns:
            Dictionary with updated incident
        """
        try:
            # Add updated timestamp
            updates["updated_at"] = datetime.utcnow().isoformat()

            result = (
                supabase.table("emergency_disconnects")
                .update(updates)
                .eq("id", incident_id)
                .execute()
            )

            if result.data:
                logger.info(f"Incident updated: {incident_id}")

                return {"success": True, "incident": result.data[0]}

            return {"success": False, "error": "Incident not found"}

        except Exception as e:
            logger.error(f"Error updating incident: {e}")
            return {"success": False, "error": str(e)}

    def complete_followup(
        self, incident_id: int, completed_by: str, notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mark follow-up as completed

        Args:
            incident_id: Incident ID
            completed_by: User ID completing follow-up
            notes: Follow-up notes

        Returns:
            Dictionary with updated incident
        """
        try:
            updates = {
                "followup_completed": True,
                "followup_completed_at": datetime.utcnow().isoformat(),
                "followup_completed_by": completed_by,
                "followup_notes": notes,
            }

            result = (
                supabase.table("emergency_disconnects")
                .update(updates)
                .eq("id", incident_id)
                .execute()
            )

            if result.data:
                logger.info(f"Follow-up completed: incident_id={incident_id}")

                return {
                    "success": True,
                    "incident": result.data[0],
                    "message": "Follow-up marked as completed",
                }

            return {"success": False, "error": "Incident not found"}

        except Exception as e:
            logger.error(f"Error completing follow-up: {e}")
            return {"success": False, "error": str(e)}

    # ==================== REPORTING ====================

    def generate_incident_report(self, incident_id: int) -> Dict[str, Any]:
        """
        Generate incident report

        Args:
            incident_id: Incident ID

        Returns:
            Dictionary with incident report
        """
        try:
            # Get incident with related data
            incident_result = (
                supabase.table("emergency_disconnects")
                .select(
                    "*, video_consultations(patient_id, doctor_id, appointment_id, started_at, ended_at)"
                )
                .eq("id", incident_id)
                .execute()
            )

            if not incident_result.data:
                return {"success": False, "error": "Incident not found"}

            incident = incident_result.data[0]
            consultation = incident.get("video_consultations", {})

            # Calculate consultation duration
            if consultation.get("started_at") and consultation.get("ended_at"):
                started = datetime.fromisoformat(
                    consultation["started_at"].replace("Z", "+00:00")
                )
                ended = datetime.fromisoformat(
                    consultation["ended_at"].replace("Z", "+00:00")
                )
                duration_minutes = int((ended - started).total_seconds() / 60)
            else:
                duration_minutes = 0

            # Build report
            report = {
                "incident_id": incident_id,
                "consultation_id": incident["consultation_id"],
                "appointment_id": consultation.get("appointment_id"),
                "disconnected_at": incident["disconnected_at"],
                "initiated_by": incident["initiated_by"],
                "reason": incident["reason"],
                "severity": incident["severity"],
                "description": incident["description"],
                "consultation_duration_minutes": duration_minutes,
                "requires_followup": incident["requires_followup"],
                "followup_completed": incident["followup_completed"],
                "followup_completed_at": incident.get("followup_completed_at"),
                "followup_notes": incident.get("followup_notes"),
                "generated_at": datetime.utcnow().isoformat(),
            }

            logger.info(f"Incident report generated: {incident_id}")

            return {"success": True, "report": report}

        except Exception as e:
            logger.error(f"Error generating incident report: {e}")
            return {"success": False, "error": str(e)}

    def get_incident_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get incident statistics

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            days: Number of days to analyze (if dates not provided)

        Returns:
            Dictionary with statistics
        """
        try:
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=days)

            # Get incidents in date range
            result = (
                supabase.table("emergency_disconnects")
                .select("*")
                .gte("disconnected_at", start_date.isoformat())
                .lte("disconnected_at", end_date.isoformat())
                .execute()
            )

            if not result.data:
                return {
                    "success": True,
                    "total_incidents": 0,
                    "by_reason": {},
                    "by_severity": {},
                    "followup_rate": 0,
                }

            incidents = result.data

            # Count by reason
            by_reason = {}
            for incident in incidents:
                reason = incident["reason"]
                by_reason[reason] = by_reason.get(reason, 0) + 1

            # Count by severity
            by_severity = {}
            for incident in incidents:
                severity = incident["severity"]
                by_severity[severity] = by_severity.get(severity, 0) + 1

            # Calculate follow-up rate
            requires_followup = [i for i in incidents if i["requires_followup"]]
            completed_followup = [
                i for i in requires_followup if i["followup_completed"]
            ]
            followup_rate = (
                (len(completed_followup) / len(requires_followup) * 100)
                if requires_followup
                else 0
            )

            return {
                "success": True,
                "total_incidents": len(incidents),
                "by_reason": by_reason,
                "by_severity": by_severity,
                "requires_followup_count": len(requires_followup),
                "completed_followup_count": len(completed_followup),
                "followup_rate": round(followup_rate, 1),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days,
                },
            }

        except Exception as e:
            logger.error(f"Error getting incident statistics: {e}")
            return {"success": False, "error": str(e)}


# ==================== SERVICE INSTANCE ====================

_emergency_disconnect_service = None


def get_emergency_disconnect_service() -> EmergencyDisconnectService:
    """Get or create emergency disconnect service instance"""
    global _emergency_disconnect_service
    if _emergency_disconnect_service is None:
        _emergency_disconnect_service = EmergencyDisconnectService()
    return _emergency_disconnect_service
