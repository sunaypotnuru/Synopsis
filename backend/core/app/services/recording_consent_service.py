"""
Recording Consent Service for Video Consultations
HIPAA-compliant consent management for video recording
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


class RecordingConsentService:
    """Service for managing video recording consent (HIPAA compliant)"""

    def __init__(self):
        # Consent is required from ALL participants before recording
        self.consent_required = True

    # ==================== CONSENT MANAGEMENT ====================

    def request_consent(
        self, consultation_id: str, requested_by: str, participants: List[str]
    ) -> Dict[str, Any]:
        """
        Request recording consent from all participants

        Args:
            consultation_id: Video consultation ID
            requested_by: User ID requesting recording
            participants: List of participant user IDs

        Returns:
            Dictionary with consent request details
        """
        try:
            # Create consent requests for each participant
            consent_requests = []

            for participant_id in participants:
                consent = {
                    "consultation_id": consultation_id,
                    "user_id": participant_id,
                    "requested_by": requested_by,
                    "requested_at": datetime.utcnow().isoformat(),
                    "consent_given": None,  # NULL = pending
                    "responded_at": None,
                    "consent_text": self._get_consent_text(),
                    "consent_version": "1.0",
                }

                result = supabase.table("recording_consents").insert(consent).execute()

                if result.data:
                    consent_requests.append(result.data[0])
                    logger.info(
                        f"Consent requested: {consultation_id} from {participant_id}"
                    )

            return {
                "success": True,
                "consent_requests": consent_requests,
                "total_participants": len(participants),
                "pending_count": len(participants),
            }

        except Exception as e:
            logger.error(f"Error requesting consent: {e}")
            return {"success": False, "error": str(e)}

    def record_consent_response(
        self,
        consultation_id: str,
        user_id: str,
        consent_given: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record participant's consent response

        Args:
            consultation_id: Video consultation ID
            user_id: User ID responding
            consent_given: True if consent given, False if denied
            ip_address: IP address of user (for audit)
            user_agent: User agent string (for audit)

        Returns:
            Dictionary with response details
        """
        try:
            # Update consent record
            update_data = {
                "consent_given": consent_given,
                "responded_at": datetime.utcnow().isoformat(),
                "ip_address": ip_address,
                "user_agent": user_agent,
            }

            result = (
                supabase.table("recording_consents")
                .update(update_data)
                .eq("consultation_id", consultation_id)
                .eq("user_id", user_id)
                .eq("consent_given", None)
                .execute()
            )

            if result.data:
                logger.info(
                    f"Consent response recorded: {consultation_id}, "
                    f"user: {user_id}, consent: {consent_given}"
                )

                # Check if all participants have responded
                all_consents = self.get_consent_status(consultation_id)

                return {
                    "success": True,
                    "consent": result.data[0],
                    "all_consents": all_consents,
                }

            return {
                "success": False,
                "error": "Consent request not found or already responded",
            }

        except Exception as e:
            logger.error(f"Error recording consent response: {e}")
            return {"success": False, "error": str(e)}

    def get_consent_status(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get consent status for all participants

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with consent status
        """
        try:
            # Get all consent records
            result = (
                supabase.table("recording_consents")
                .select("*")
                .eq("consultation_id", consultation_id)
                .execute()
            )

            if not result.data:
                return {
                    "success": True,
                    "consents": [],
                    "all_consented": False,
                    "any_denied": False,
                    "pending_count": 0,
                }

            consents = result.data

            # Analyze consent status
            pending = [c for c in consents if c["consent_given"] is None]
            approved = [c for c in consents if c["consent_given"] is True]
            denied = [c for c in consents if c["consent_given"] is False]

            all_consented = len(pending) == 0 and len(denied) == 0 and len(approved) > 0
            any_denied = len(denied) > 0

            return {
                "success": True,
                "consents": consents,
                "total_participants": len(consents),
                "approved_count": len(approved),
                "denied_count": len(denied),
                "pending_count": len(pending),
                "all_consented": all_consented,
                "any_denied": any_denied,
                "can_record": all_consented and not any_denied,
            }

        except Exception as e:
            logger.error(f"Error getting consent status: {e}")
            return {"success": False, "error": str(e)}

    def verify_consent(self, consultation_id: str) -> Dict[str, Any]:
        """
        Verify that all participants have consented to recording

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with verification result
        """
        try:
            status = self.get_consent_status(consultation_id)

            if not status["success"]:
                return status

            can_record = status.get("can_record", False)

            if not can_record:
                reasons = []
                if status["pending_count"] > 0:
                    reasons.append(
                        f"{status['pending_count']} participant(s) have not responded"
                    )
                if status["any_denied"]:
                    reasons.append(
                        f"{status['denied_count']} participant(s) denied consent"
                    )

                return {
                    "success": True,
                    "verified": False,
                    "can_record": False,
                    "reasons": reasons,
                }

            return {
                "success": True,
                "verified": True,
                "can_record": True,
                "message": "All participants have consented to recording",
            }

        except Exception as e:
            logger.error(f"Error verifying consent: {e}")
            return {"success": False, "error": str(e)}

    def revoke_consent(
        self, consultation_id: str, user_id: str, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Revoke previously given consent

        Args:
            consultation_id: Video consultation ID
            user_id: User ID revoking consent
            reason: Optional reason for revocation

        Returns:
            Dictionary with revocation details
        """
        try:
            # Update consent to revoked
            update_data = {
                "consent_given": False,
                "revoked_at": datetime.utcnow().isoformat(),
                "revocation_reason": reason,
            }

            result = (
                supabase.table("recording_consents")
                .update(update_data)
                .eq("consultation_id", consultation_id)
                .eq("user_id", user_id)
                .eq("consent_given", True)
                .execute()
            )

            if result.data:
                logger.warning(
                    f"Consent revoked: {consultation_id}, user: {user_id}, reason: {reason}"
                )

                # If recording is active, it must be stopped
                return {
                    "success": True,
                    "consent": result.data[0],
                    "action_required": "stop_recording",
                    "message": "Consent revoked, recording must be stopped immediately",
                }

            return {
                "success": False,
                "error": "Consent not found or not previously given",
            }

        except Exception as e:
            logger.error(f"Error revoking consent: {e}")
            return {"success": False, "error": str(e)}

    # ==================== RECORDING CONTROL ====================

    def start_recording(
        self,
        consultation_id: str,
        started_by: str,
        storage_location: str,
        encryption_key_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Start recording (after verifying consent)

        Args:
            consultation_id: Video consultation ID
            started_by: User ID starting recording
            storage_location: File storage location
            encryption_key_id: Encryption key ID for HIPAA compliance

        Returns:
            Dictionary with recording details
        """
        try:
            # Verify consent first
            verification = self.verify_consent(consultation_id)

            if not verification.get("can_record", False):
                return {
                    "success": False,
                    "error": "Cannot start recording without consent from all participants",
                    "verification": verification,
                }

            # Create recording record
            recording = {
                "consultation_id": consultation_id,
                "started_by": started_by,
                "started_at": datetime.utcnow().isoformat(),
                "storage_location": storage_location,
                "encryption_key_id": encryption_key_id,
                "file_size_bytes": 0,
                "duration_seconds": 0,
                "status": "recording",
            }

            result = supabase.table("video_recordings").insert(recording).execute()

            if result.data:
                logger.info(f"Recording started: {consultation_id}")

                return {
                    "success": True,
                    "recording": result.data[0],
                    "message": "Recording started successfully",
                }

            return {"success": False, "error": "Failed to create recording record"}

        except Exception as e:
            logger.error(f"Error starting recording: {e}")
            return {"success": False, "error": str(e)}

    def stop_recording(
        self,
        consultation_id: str,
        stopped_by: str,
        file_size_bytes: int,
        duration_seconds: int,
    ) -> Dict[str, Any]:
        """
        Stop recording

        Args:
            consultation_id: Video consultation ID
            stopped_by: User ID stopping recording
            file_size_bytes: Final file size
            duration_seconds: Recording duration

        Returns:
            Dictionary with recording details
        """
        try:
            # Update recording record
            update_data = {
                "stopped_at": datetime.utcnow().isoformat(),
                "stopped_by": stopped_by,
                "file_size_bytes": file_size_bytes,
                "duration_seconds": duration_seconds,
                "status": "completed",
            }

            result = (
                supabase.table("video_recordings")
                .update(update_data)
                .eq("consultation_id", consultation_id)
                .eq("status", "recording")
                .execute()
            )

            if result.data:
                logger.info(
                    f"Recording stopped: {consultation_id}, "
                    f"duration: {duration_seconds}s, size: {file_size_bytes} bytes"
                )

                return {
                    "success": True,
                    "recording": result.data[0],
                    "message": "Recording stopped successfully",
                }

            return {"success": False, "error": "No active recording found"}

        except Exception as e:
            logger.error(f"Error stopping recording: {e}")
            return {"success": False, "error": str(e)}

    def get_recording_status(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get recording status

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with recording status
        """
        try:
            result = (
                supabase.table("video_recordings")
                .select("*")
                .eq("consultation_id", consultation_id)
                .order("started_at", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                recording = result.data[0]

                return {
                    "success": True,
                    "recording": recording,
                    "is_recording": recording["status"] == "recording",
                }

            return {"success": True, "recording": None, "is_recording": False}

        except Exception as e:
            logger.error(f"Error getting recording status: {e}")
            return {"success": False, "error": str(e)}

    # ==================== ACCESS CONTROL ====================

    def log_recording_access(
        self,
        recording_id: int,
        accessed_by: str,
        access_purpose: str,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Log access to recording (HIPAA audit requirement)

        Args:
            recording_id: Recording ID
            accessed_by: User ID accessing recording
            access_purpose: Purpose of access (view, download, share)
            ip_address: IP address of accessor

        Returns:
            Dictionary with access log details
        """
        try:
            access_log = {
                "recording_id": recording_id,
                "accessed_by": accessed_by,
                "accessed_at": datetime.utcnow().isoformat(),
                "access_purpose": access_purpose,
                "ip_address": ip_address,
            }

            result = supabase.table("recording_access_log").insert(access_log).execute()

            if result.data:
                logger.info(
                    f"Recording access logged: recording_id={recording_id}, "
                    f"user={accessed_by}, purpose={access_purpose}"
                )

                return {"success": True, "access_log": result.data[0]}

            return {"success": False, "error": "Failed to log access"}

        except Exception as e:
            logger.error(f"Error logging recording access: {e}")
            return {"success": False, "error": str(e)}

    def check_recording_access(self, recording_id: int, user_id: str) -> Dict[str, Any]:
        """
        Check if user has access to recording

        Args:
            recording_id: Recording ID
            user_id: User ID requesting access

        Returns:
            Dictionary with access permission
        """
        try:
            # Get recording details
            recording_result = (
                supabase.table("video_recordings")
                .select("*, video_consultations(patient_id, doctor_id)")
                .eq("id", recording_id)
                .execute()
            )

            if not recording_result.data:
                return {"success": False, "error": "Recording not found"}

            recording = recording_result.data[0]
            consultation = recording.get("video_consultations", {})

            # Check if user is participant or admin
            is_participant = user_id in [
                consultation.get("patient_id"),
                consultation.get("doctor_id"),
            ]

            # TODO: Check if user is admin
            # is_admin = check_user_role(user_id) == 'admin'

            has_access = is_participant  # or is_admin

            return {"success": True, "has_access": has_access, "recording": recording}

        except Exception as e:
            logger.error(f"Error checking recording access: {e}")
            return {"success": False, "error": str(e)}

    def get_access_logs(self, recording_id: int, limit: int = 50) -> Dict[str, Any]:
        """
        Get access logs for recording (HIPAA audit)

        Args:
            recording_id: Recording ID
            limit: Maximum number of logs to retrieve

        Returns:
            Dictionary with access logs
        """
        try:
            result = (
                supabase.table("recording_access_log")
                .select("*")
                .eq("recording_id", recording_id)
                .order("accessed_at", desc=True)
                .limit(limit)
                .execute()
            )

            return {
                "success": True,
                "access_logs": result.data or [],
                "total_accesses": len(result.data) if result.data else 0,
            }

        except Exception as e:
            logger.error(f"Error getting access logs: {e}")
            return {"success": False, "error": str(e)}

    # ==================== CONSENT TEXT ====================

    def _get_consent_text(self) -> str:
        """Get standard consent text for recording"""
        return """
        VIDEO CONSULTATION RECORDING CONSENT
        
        By providing consent, you acknowledge and agree that:
        
        1. This video consultation will be recorded for medical documentation purposes.
        2. The recording will be stored securely and encrypted in compliance with HIPAA regulations.
        3. The recording will be retained for 7 years as required by medical record retention laws.
        4. Access to the recording will be limited to authorized healthcare providers and administrators.
        5. You have the right to revoke this consent at any time, which will immediately stop the recording.
        6. Revoking consent will not affect the portion of the consultation already recorded.
        7. The recording may be used for quality assurance, training, or legal purposes.
        
        Your consent is voluntary and you may decline without affecting your care.
        """


# ==================== SERVICE INSTANCE ====================

_recording_consent_service = None


def get_recording_consent_service() -> RecordingConsentService:
    """Get or create recording consent service instance"""
    global _recording_consent_service
    if _recording_consent_service is None:
        _recording_consent_service = RecordingConsentService()
    return _recording_consent_service
