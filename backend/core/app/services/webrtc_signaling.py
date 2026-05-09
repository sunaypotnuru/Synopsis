"""
WebRTC Signaling Service for Video Consultations
Handles SDP offer/answer exchange and ICE candidate exchange
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class WebRTCSignalingService:
    """Service for WebRTC signaling (SDP and ICE candidates)"""

    def __init__(self):
        # In-memory storage for signaling messages (in production, use Redis or database)
        self.pending_offers: Dict[str, Dict[str, Any]] = {}
        self.pending_answers: Dict[str, Dict[str, Any]] = {}
        self.ice_candidates: Dict[str, List[Dict[str, Any]]] = {}
        self.connection_states: Dict[str, str] = {}

        # STUN/TURN server configuration (FREE TIER - Google STUN servers)
        self.ice_servers = [
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"},
            {"urls": "stun:stun2.l.google.com:19302"},
            {"urls": "stun:stun3.l.google.com:19302"},
            {"urls": "stun:stun4.l.google.com:19302"},
        ]

    # ==================== SDP EXCHANGE ====================

    def create_offer(
        self, consultation_id: str, user_id: str, sdp: str, sdp_type: str = "offer"
    ) -> Dict[str, Any]:
        """
        Create WebRTC offer

        Args:
            consultation_id: Video consultation ID
            user_id: User creating the offer
            sdp: Session Description Protocol data
            sdp_type: Type of SDP (offer/answer)

        Returns:
            Dictionary with offer details
        """
        try:
            offer = {
                "consultation_id": consultation_id,
                "user_id": user_id,
                "sdp": sdp,
                "type": sdp_type,
                "created_at": datetime.utcnow().isoformat(),
            }

            self.pending_offers[consultation_id] = offer

            logger.info(f"WebRTC offer created: {consultation_id} by {user_id}")

            return {"success": True, "offer": offer, "ice_servers": self.ice_servers}

        except Exception as e:
            logger.error(f"Error creating offer: {e}")
            return {"success": False, "error": str(e)}

    def create_answer(
        self, consultation_id: str, user_id: str, sdp: str, sdp_type: str = "answer"
    ) -> Dict[str, Any]:
        """
        Create WebRTC answer

        Args:
            consultation_id: Video consultation ID
            user_id: User creating the answer
            sdp: Session Description Protocol data
            sdp_type: Type of SDP (offer/answer)

        Returns:
            Dictionary with answer details
        """
        try:
            # Check if offer exists
            if consultation_id not in self.pending_offers:
                return {"success": False, "error": "No pending offer found"}

            answer = {
                "consultation_id": consultation_id,
                "user_id": user_id,
                "sdp": sdp,
                "type": sdp_type,
                "created_at": datetime.utcnow().isoformat(),
            }

            self.pending_answers[consultation_id] = answer

            # Update connection state
            self.connection_states[consultation_id] = "connecting"

            logger.info(f"WebRTC answer created: {consultation_id} by {user_id}")

            return {"success": True, "answer": answer, "ice_servers": self.ice_servers}

        except Exception as e:
            logger.error(f"Error creating answer: {e}")
            return {"success": False, "error": str(e)}

    def get_offer(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get pending offer for consultation

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with offer details
        """
        try:
            if consultation_id in self.pending_offers:
                return {
                    "success": True,
                    "offer": self.pending_offers[consultation_id],
                    "ice_servers": self.ice_servers,
                }

            return {"success": False, "error": "No pending offer"}

        except Exception as e:
            logger.error(f"Error getting offer: {e}")
            return {"success": False, "error": str(e)}

    def get_answer(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get answer for consultation

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with answer details
        """
        try:
            if consultation_id in self.pending_answers:
                return {
                    "success": True,
                    "answer": self.pending_answers[consultation_id],
                    "ice_servers": self.ice_servers,
                }

            return {"success": False, "error": "No answer available"}

        except Exception as e:
            logger.error(f"Error getting answer: {e}")
            return {"success": False, "error": str(e)}

    # ==================== ICE CANDIDATE EXCHANGE ====================

    def add_ice_candidate(
        self,
        consultation_id: str,
        user_id: str,
        candidate: str,
        sdp_mid: Optional[str] = None,
        sdp_m_line_index: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Add ICE candidate

        Args:
            consultation_id: Video consultation ID
            user_id: User adding the candidate
            candidate: ICE candidate string
            sdp_mid: Media stream ID
            sdp_m_line_index: Media line index

        Returns:
            Dictionary with success status
        """
        try:
            ice_candidate = {
                "consultation_id": consultation_id,
                "user_id": user_id,
                "candidate": candidate,
                "sdpMid": sdp_mid,
                "sdpMLineIndex": sdp_m_line_index,
                "created_at": datetime.utcnow().isoformat(),
            }

            # Initialize list if not exists
            if consultation_id not in self.ice_candidates:
                self.ice_candidates[consultation_id] = []

            self.ice_candidates[consultation_id].append(ice_candidate)

            logger.debug(f"ICE candidate added: {consultation_id} by {user_id}")

            return {"success": True, "candidate": ice_candidate}

        except Exception as e:
            logger.error(f"Error adding ICE candidate: {e}")
            return {"success": False, "error": str(e)}

    def get_ice_candidates(
        self, consultation_id: str, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get ICE candidates for consultation

        Args:
            consultation_id: Video consultation ID
            user_id: Optional filter by user ID

        Returns:
            Dictionary with ICE candidates
        """
        try:
            if consultation_id not in self.ice_candidates:
                return {"success": True, "candidates": []}

            candidates = self.ice_candidates[consultation_id]

            # Filter by user if specified
            if user_id:
                candidates = [c for c in candidates if c["user_id"] == user_id]

            return {"success": True, "candidates": candidates}

        except Exception as e:
            logger.error(f"Error getting ICE candidates: {e}")
            return {"success": False, "error": str(e)}

    # ==================== CONNECTION STATE ====================

    def update_connection_state(
        self, consultation_id: str, state: str
    ) -> Dict[str, Any]:
        """
        Update WebRTC connection state

        Args:
            consultation_id: Video consultation ID
            state: Connection state (new, connecting, connected, disconnected, failed, closed)

        Returns:
            Dictionary with success status
        """
        try:
            valid_states = [
                "new",
                "connecting",
                "connected",
                "disconnected",
                "failed",
                "closed",
            ]

            if state not in valid_states:
                return {
                    "success": False,
                    "error": f"Invalid state. Must be one of: {valid_states}",
                }

            self.connection_states[consultation_id] = state

            logger.info(f"Connection state updated: {consultation_id} -> {state}")

            return {"success": True, "state": state}

        except Exception as e:
            logger.error(f"Error updating connection state: {e}")
            return {"success": False, "error": str(e)}

    def get_connection_state(self, consultation_id: str) -> Dict[str, Any]:
        """
        Get WebRTC connection state

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with connection state
        """
        try:
            state = self.connection_states.get(consultation_id, "new")

            return {"success": True, "state": state}

        except Exception as e:
            logger.error(f"Error getting connection state: {e}")
            return {"success": False, "error": str(e)}

    # ==================== RECONNECTION ====================

    def handle_reconnection(self, consultation_id: str, user_id: str) -> Dict[str, Any]:
        """
        Handle WebRTC reconnection

        Args:
            consultation_id: Video consultation ID
            user_id: User attempting to reconnect

        Returns:
            Dictionary with reconnection details
        """
        try:
            # Get current state
            current_state = self.connection_states.get(consultation_id, "new")

            if current_state in ["closed", "failed"]:
                # Need to restart signaling
                return {
                    "success": True,
                    "action": "restart",
                    "message": "Connection closed/failed, restart signaling",
                }

            # Get existing offer/answer
            offer = self.pending_offers.get(consultation_id)
            answer = self.pending_answers.get(consultation_id)
            candidates = self.ice_candidates.get(consultation_id, [])

            return {
                "success": True,
                "action": "reconnect",
                "offer": offer,
                "answer": answer,
                "candidates": candidates,
                "ice_servers": self.ice_servers,
            }

        except Exception as e:
            logger.error(f"Error handling reconnection: {e}")
            return {"success": False, "error": str(e)}

    # ==================== CLEANUP ====================

    def cleanup_session(self, consultation_id: str) -> Dict[str, Any]:
        """
        Clean up signaling data for ended session

        Args:
            consultation_id: Video consultation ID

        Returns:
            Dictionary with success status
        """
        try:
            # Remove all signaling data
            self.pending_offers.pop(consultation_id, None)
            self.pending_answers.pop(consultation_id, None)
            self.ice_candidates.pop(consultation_id, None)
            self.connection_states.pop(consultation_id, None)

            logger.info(f"Signaling data cleaned up: {consultation_id}")

            return {"success": True, "message": "Signaling data cleaned up"}

        except Exception as e:
            logger.error(f"Error cleaning up session: {e}")
            return {"success": False, "error": str(e)}

    # ==================== CONFIGURATION ====================

    def get_ice_servers(self) -> List[Dict[str, str]]:
        """
        Get ICE server configuration

        Returns:
            List of ICE server configurations
        """
        return self.ice_servers

    def get_rtc_configuration(self) -> Dict[str, Any]:
        """
        Get complete RTC configuration

        Returns:
            Dictionary with RTC configuration
        """
        return {
            "iceServers": self.ice_servers,
            "iceTransportPolicy": "all",  # Use both STUN and TURN
            "bundlePolicy": "balanced",
            "rtcpMuxPolicy": "require",
            "iceCandidatePoolSize": 10,
        }


# ==================== SERVICE INSTANCE ====================

_webrtc_signaling_service = None


def get_webrtc_signaling_service() -> WebRTCSignalingService:
    """Get or create WebRTC signaling service instance"""
    global _webrtc_signaling_service
    if _webrtc_signaling_service is None:
        _webrtc_signaling_service = WebRTCSignalingService()
    return _webrtc_signaling_service
