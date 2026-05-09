from fastapi import APIRouter, Request, Response, Query, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse
import logging
import os
import tempfile
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream

try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    WhisperModel = None
    FASTER_WHISPER_AVAILABLE = False

from app.voice.stream_handler import websocket_endpoint
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/incoming")
async def handle_incoming_call(request: Request):
    """Twilio webhook for incoming calls. Hands off immediately to the Media Stream."""
    response = VoiceResponse()

    # Optional greeting before stream starts
    response.say(
        "Welcome to Netra AI Healthcare. Please hold while I connect you to our intelligent assistant."
    )

    connect = Connect()
    # Assuming VITE_API_URL or a specific WS_URL is provided for production
    # Fallback to local ngrok/host for local development testing
    host = request.headers.get("host", "localhost:8000")
    # For local testing, ensure you use ngrok to expose localhost:8000
    # and configure it in Twilio.
    ws_url = f"wss://{host}/api/v1/voice/stream"

    stream = Stream(url=ws_url)
    stream.parameter(name="aStreamParam", value="aStreamValue")
    connect.append(stream)

    response.append(connect)

    # Fallback if connection fails
    response.say(
        "Oops! We encountered an error connecting you. Please try again later."
    )

    return HTMLResponse(content=str(response), media_type="text/xml")


# The actual WebSocket endpoint is defined in stream_handler.py
# but we can mount it directly to this router if preferred,
# or, the handler function here.
# For architecture cleanliness, we'll let stream_handler do the heavy lifting
# and, the websocket endpoint here.


# Register the WebSocket route
router.add_api_websocket_route("/stream", websocket_endpoint)


@router.get("/twiml/medication-check")
async def medication_check_twiml(
    request: Request, patient_id: str = Query(...), language: str = Query("hi-IN")
):
    """Return TwiML that initiates a stream to our WebSocket."""
    host = request.headers.get("host", "localhost:8000")
    ws_url = f"wss://{host}/api/v1/voice/stream"

    twiml = f"""<Response>
        <Say voice="alice" language="{language}">
            Hello, this is your Netra A I health assistant. I am calling to check on your medications today. Please wait a moment while I connect.
        </Say>
        <Connect>
            <Stream url="{ws_url}">
                <Parameter name="patient_id" value="{patient_id}" />
                <Parameter name="purpose" value="medication_check" />
                <Parameter name="language" value="{language}" />
            </Stream>
        </Connect>
    </Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/status-callback")
async def call_status_callback(request: Request):
    form = await request.form()
    call_sid = form.get("CallSid")
    call_status = form.get("CallStatus")

    if call_sid and call_status:
        try:
            # Update the call log with the final status from Twilio (completed, busy, no-answer, failed)
            supabase.table("voice_call_logs").update({"call_status": call_status}).eq(
                "call_sid", call_sid
            ).execute()
            logger.info(f"Twilio Call {call_sid} status updated to: {call_status}")
        except Exception as e:
            logger.error(f"Failed to record call status for {call_sid}: {e}")

    return Response(status_code=200)


# Global cache for the faster-whisper model to avoid cold re-loads
whisper_model = None


@router.post("/transcribe/local")
async def transcribe_local(file: UploadFile = File(...)):
    global whisper_model
    try:
        if not FASTER_WHISPER_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Local transcription unavailable: faster_whisper dependency is not installed.",
            )

        # Lazy load model
        if whisper_model is None:
            whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")

        with tempfile.NamedTemporaryFile(
            mode="wb", delete=False, suffix=".webm"
        ) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        segments, info = whisper_model.transcribe(tmp_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])

        os.remove(tmp_path)

        return {"text": text.strip()}
    except Exception as e:
        logger.error(f"Whisper Local Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
