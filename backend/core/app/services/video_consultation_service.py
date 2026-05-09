"""
Video Consultation Service
Manages video consultation sessions, participants, and lifecycle
"""

import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

logger = logging.getLogger(__name__)


class VideoConsultationService:
    """Service for managing video consultations"""

    def __init__(self, db: Session):
        self.db = db

    def create_session(
        self, appointment_id: str, doctor_id: str, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new video consultation session

        Args:
            appointment_id: Appointment ID
            doctor_id: Doctor user ID
            patient_id: Patient user ID

        Returns:
            Session details or None if failed
        """
        try:
            from app.models.video_consultation import VideoConsultation

            # Generate unique session ID
            session_id = str(uuid.uuid4())

            # Create consultation
            consultation = VideoConsultation(
                appointment_id=appointment_id,
                session_id=session_id,
                doctor_id=doctor_id,
                patient_id=patient_id,
                status="waiting",
                recording_enabled=False,
                recording_consent_given=False,
                emergency_disconnect=False,
            )

            self.db.add(consultation)
            self.db.commit()
            self.db.refresh(consultation)

            logger.info(f"Created video consultation session: {session_id}")

            return {
                "id": str(consultation.id),
                "session_id": session_id,
                "appointment_id": appointment_id,
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "status": "waiting",
                "created_at": consultation.created_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error creating video consultation: {str(e)}")
            self.db.rollback()
            return None

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session details

        Args:
            session_id: Session ID

        Returns:
            Session details or None if not found
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                return None

            return {
                "id": str(consultation.id),
                "session_id": consultation.session_id,
                "appointment_id": (
                    str(consultation.appointment_id)
                    if consultation.appointment_id
                    else None
                ),
                "doctor_id": str(consultation.doctor_id),
                "patient_id": str(consultation.patient_id),
                "status": consultation.status,
                "started_at": (
                    consultation.started_at.isoformat()
                    if consultation.started_at
                    else None
                ),
                "ended_at": (
                    consultation.ended_at.isoformat() if consultation.ended_at else None
                ),
                "duration_seconds": consultation.duration_seconds,
                "recording_enabled": consultation.recording_enabled,
                "recording_consent_given": consultation.recording_consent_given,
                "emergency_disconnect": consultation.emergency_disconnect,
                "created_at": consultation.created_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error getting session: {str(e)}")
            return None

    def join_session(self, session_id: str, user_id: str, user_role: str) -> bool:
        """
        Join a video consultation session

        Args:
            session_id: Session ID
            user_id: User ID joining
            user_role: User role (doctor/patient)

        Returns:
            True if joined successfully
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                logger.warning(f"Session not found: {session_id}")
                return False

            # Verify user is authorized
            if user_role == "doctor" and str(consultation.doctor_id) != user_id:
                logger.warning(f"Unauthorized doctor join attempt: {user_id}")
                return False

            if user_role == "patient" and str(consultation.patient_id) != user_id:
                logger.warning(f"Unauthorized patient join attempt: {user_id}")
                return False

            # Start session if both participants present
            if consultation.status == "waiting":
                consultation.status = "active"
                consultation.started_at = datetime.utcnow()
                self.db.commit()
                logger.info(f"Session started: {session_id}")

            return True

        except Exception as e:
            logger.error(f"Error joining session: {str(e)}")
            self.db.rollback()
            return False

    def leave_session(self, session_id: str, user_id: str) -> bool:
        """
        Leave a video consultation session

        Args:
            session_id: Session ID
            user_id: User ID leaving

        Returns:
            True if left successfully
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                return False

            # If either participant leaves, end the session
            if consultation.status == "active":
                self._end_session_internal(consultation)

            logger.info(f"User {user_id} left session: {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error leaving session: {str(e)}")
            self.db.rollback()
            return False

    def end_session(self, session_id: str) -> bool:
        """
        End a video consultation session

        Args:
            session_id: Session ID

        Returns:
            True if ended successfully
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                return False

            self._end_session_internal(consultation)

            logger.info(f"Session ended: {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error ending session: {str(e)}")
            self.db.rollback()
            return False

    def _end_session_internal(self, consultation):
        """Internal method to end a session"""
        if consultation.status == "active":
            consultation.ended_at = datetime.utcnow()

            # Calculate duration
            if consultation.started_at:
                duration = (
                    consultation.ended_at - consultation.started_at
                ).total_seconds()
                consultation.duration_seconds = int(duration)

            consultation.status = "completed"
            self.db.commit()

    def get_active_sessions(
        self, user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get active sessions

        Args:
            user_id: Filter by user ID (optional)

        Returns:
            List of active sessions
        """
        try:
            from app.models.video_consultation import VideoConsultation

            query = self.db.query(VideoConsultation).filter(
                VideoConsultation.status == "active"
            )

            if user_id:
                query = query.filter(
                    or_(
                        VideoConsultation.doctor_id == user_id,
                        VideoConsultation.patient_id == user_id,
                    )
                )

            consultations = query.all()

            return [
                {
                    "id": str(c.id),
                    "session_id": c.session_id,
                    "doctor_id": str(c.doctor_id),
                    "patient_id": str(c.patient_id),
                    "started_at": c.started_at.isoformat() if c.started_at else None,
                    "duration_seconds": (
                        int((datetime.utcnow() - c.started_at).total_seconds())
                        if c.started_at
                        else 0
                    ),
                }
                for c in consultations
            ]

        except Exception as e:
            logger.error(f"Error getting active sessions: {str(e)}")
            return []

    def get_session_status(self, session_id: str) -> Optional[str]:
        """
        Get session status

        Args:
            session_id: Session ID

        Returns:
            Status string or None if not found
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            return consultation.status if consultation else None

        except Exception as e:
            logger.error(f"Error getting session status: {str(e)}")
            return None

    def get_session_participants(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session participants

        Args:
            session_id: Session ID

        Returns:
            Participant details or None if not found
        """
        try:
            from app.models.video_consultation import VideoConsultation
            from app.models.user import User

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                return None

            # Get doctor details
            doctor = (
                self.db.query(User).filter(User.id == consultation.doctor_id).first()
            )
            patient = (
                self.db.query(User).filter(User.id == consultation.patient_id).first()
            )

            return {
                "doctor": (
                    {
                        "id": str(doctor.id),
                        "name": (
                            doctor.full_name
                            if hasattr(doctor, "full_name")
                            else doctor.username
                        ),
                        "specialty": (
                            doctor.specialty if hasattr(doctor, "specialty") else None
                        ),
                    }
                    if doctor
                    else None
                ),
                "patient": (
                    {
                        "id": str(patient.id),
                        "name": (
                            patient.full_name
                            if hasattr(patient, "full_name")
                            else patient.username
                        ),
                        "age": patient.age if hasattr(patient, "age") else None,
                    }
                    if patient
                    else None
                ),
            }

        except Exception as e:
            logger.error(f"Error getting session participants: {str(e)}")
            return None

    def update_recording_status(
        self,
        session_id: str,
        recording_enabled: bool,
        recording_url: Optional[str] = None,
    ) -> bool:
        """
        Update recording status

        Args:
            session_id: Session ID
            recording_enabled: Whether recording is enabled
            recording_url: Recording URL (if available)

        Returns:
            True if updated successfully
        """
        try:
            from app.models.video_consultation import VideoConsultation

            consultation = (
                self.db.query(VideoConsultation)
                .filter(VideoConsultation.session_id == session_id)
                .first()
            )

            if not consultation:
                return False

            consultation.recording_enabled = recording_enabled
            if recording_url:
                consultation.recording_url = recording_url

            self.db.commit()

            logger.info(
                f"Recording status updated for session {session_id}: {recording_enabled}"
            )
            return True

        except Exception as e:
            logger.error(f"Error updating recording status: {str(e)}")
            self.db.rollback()
            return False

    def get_consultation_history(
        self, user_id: str, user_role: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get consultation history for a user

        Args:
            user_id: User ID
            user_role: User role (doctor/patient)
            limit: Maximum number of results

        Returns:
            List of past consultations
        """
        try:
            from app.models.video_consultation import VideoConsultation

            query = self.db.query(VideoConsultation).filter(
                VideoConsultation.status.in_(
                    ["completed", "cancelled", "emergency_ended"]
                )
            )

            if user_role == "doctor":
                query = query.filter(VideoConsultation.doctor_id == user_id)
            else:
                query = query.filter(VideoConsultation.patient_id == user_id)

            consultations = (
                query.order_by(VideoConsultation.created_at.desc()).limit(limit).all()
            )

            return [
                {
                    "id": str(c.id),
                    "session_id": c.session_id,
                    "status": c.status,
                    "started_at": c.started_at.isoformat() if c.started_at else None,
                    "ended_at": c.ended_at.isoformat() if c.ended_at else None,
                    "duration_seconds": c.duration_seconds,
                    "recording_available": bool(c.recording_url),
                    "emergency_disconnect": c.emergency_disconnect,
                }
                for c in consultations
            ]

        except Exception as e:
            logger.error(f"Error getting consultation history: {str(e)}")
            return []


# Helper function
def get_video_consultation_service(db: Session) -> VideoConsultationService:
    """Get video consultation service instance"""
    return VideoConsultationService(db)
