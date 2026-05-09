import os
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

# Initialize the Twilio client using standard environment variables
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

current_client = None
if TWILIO_SID and TWILIO_TOKEN:
    current_client = Client(TWILIO_SID, TWILIO_TOKEN)
else:
    logger.warning(
        "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing. Outbound Twilio calls will silently fail."
    )


def initiate_voice_call(to_number: str, twiml_url: str) -> str:
    """
    Start an outbound call and return the unique Call SID so it can be tracked in the database.
    Twiml URL points back to our FastAPI /api/v1/voice/twiml/... endpoint.
    """
    if not current_client:
        logger.error("No Twilio client instantiated.")
        return "mock_call_sid_12345"

    try:
        call = current_client.calls.create(
            url=twiml_url, to=to_number, from_=TWILIO_NUMBER
        )
        logger.info(f"Initiated outbound call {call.sid} to {to_number}")
        return call.sid
    except Exception as e:
        logger.error(f"Failed to initiate Twilio Call: {e}")
        return f"failed_call_sid_{os.urandom(4).hex()}"
