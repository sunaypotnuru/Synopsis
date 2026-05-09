import logging
from typing import Optional
from livekit.api import AccessToken, VideoGrants, WebhookReceiver, TokenVerifier

from app.core.config import settings

try:
    from livekit.api import LiveKitAPI, RoomCompositeEgressRequest, FileOutput
except ImportError:
    LiveKitAPI = None

logger = logging.getLogger(__name__)

# Initialize Webhook Receiver if keys are present
receiver = None
if settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET:
    verifier = TokenVerifier(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    receiver = WebhookReceiver(verifier)


def create_room_token(room_name: str, identity: str) -> str:
    """Generate a JWT token for a user to join a LiveKit room."""
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        # Fallback for demo environments
        logger.warning("LIVEKIT credentials missing. MOCK mode enabled.")
        return "MOCK_LIVEKIT_TOKEN"

    grant = VideoGrants(roomJoin=True, room=room_name)
    access_token = AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    access_token.with_identity(identity).with_grant(grant)
    return access_token.to_jwt()


def receive_webhook(request_body: str, auth_header: str) -> Optional[dict]:
    """Validate and process a LiveKit webhook event."""
    if not receiver:
        logger.warning("Webhook receiver not configured.")
        return None
    try:
        event = receiver.receive(request_body, auth_header)
        # Convert the protobuf-like event to dict for easy handling
        return event
    except Exception as e:
        logger.error(f"Failed to validate LiveKit webhook: {e}")
        return None


async def start_room_recording(room_name: str) -> str:
    """Start recording a LiveKit room using Egress. Assumes Cloud defaults."""

    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        return "MOCK_EGRESS_ID"

    api = LiveKitAPI(
        url=settings.LIVEKIT_URL or "ws://localhost:7880",
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )

    try:
        # We assume the default output is configured in the LiveKit Cloud project settings
        request = RoomCompositeEgressRequest(
            room_name=room_name,
            file=FileOutput(filepath=f"recordings/{room_name}_{{time}}.mp4"),
        )
        info = await api.egress.start_room_composite_egress(request)
        return info.egress_id
    finally:
        await api.aclose()


async def stop_room_recording(egress_id: str):
    """Stop an active LiveKit room recording."""

    if not settings.LIVEKIT_API_KEY or egress_id == "MOCK_EGRESS_ID":
        return True

    api = LiveKitAPI(
        url=settings.LIVEKIT_URL or "ws://localhost:7880",
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )

    try:
        await api.egress.stop_egress(egress_id)
        return True
    finally:
        await api.aclose()
