import os
import json
import base64
import asyncio
import logging
from datetime import datetime
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
import websockets
import subprocess
import tempfile

try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    WhisperModel = None
    FASTER_WHISPER_AVAILABLE = False

from app.services.supabase import supabase
from app.utils.twilio_client import current_client, TWILIO_NUMBER

logger = logging.getLogger(__name__)

audio_buffers: Dict[str, bytearray] = {}


async def finalize_transcription(call_sid: str):
    """Offline background task to convert uLAW to WAV via ffmpeg and transcribe with Whisper."""
    if call_sid not in audio_buffers:
        return

    ulaw_bytes = audio_buffers[call_sid]
    if not ulaw_bytes:
        audio_buffers.pop(call_sid, None)
        return

    if not FASTER_WHISPER_AVAILABLE:
        logger.warning(
            "Skipping local transcription for %s: faster_whisper dependency unavailable",
            call_sid,
        )
        audio_buffers.pop(call_sid, None)
        return

    try:
        with tempfile.NamedTemporaryFile(suffix=".ulaw", delete=False) as f:
            f.write(ulaw_bytes)
            ulaw_path = f.name

        wav_path = ulaw_path.replace(".ulaw", ".wav")
        # Format explicitly via FFMPEG
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "mulaw",
                "-ar",
                "8000",
                "-i",
                ulaw_path,
                "-ar",
                "16000",
                wav_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Load faster-whisper and transcribe natively
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segments, info = model.transcribe(wav_path, beam_size=5)
        transcript = " ".join([segment.text for segment in segments])

        if transcript:
            supabase.table("voice_call_logs").update({"transcript": transcript}).eq(
                "call_sid", call_sid
            ).execute()
            logger.info(f"Transcription saved for Call {call_sid}")

        os.unlink(ulaw_path)
        os.unlink(wav_path)
    except Exception as e:
        logger.error(f"Error finalizing transcription for {call_sid}: {e}")
    finally:
        audio_buffers.pop(call_sid, None)


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


async def configure_medication_check_session(openai_ws, patient_id, language):
    """Dynamically configure the OpenAI session for an autonomous outbound nurse call."""
    try:
        patient_res = (
            supabase.table("profiles_patient")
            .select("*")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        patient = patient_res.data

        if not patient:
            logger.error(f"Cannot configure session for missing patient {patient_id}")
            return

        medications = patient.get("medication_schedule", [])
        today_name = datetime.now().strftime("%a")  # Mon, Tue, Wed...
        today_meds = [m for m in medications if today_name in m.get("days", [])]

        if today_meds:
            med_list = ", ".join(
                [f"{m.get('name')} ({m.get('dosage')})" for m in today_meds]
            )
        else:
            med_list = "no scheduled medications for today"

        # ---------------------------------------------------------
        # INDUSTRIAL UPGRADE: Fetch live clinical context for the Nurse
        # ---------------------------------------------------------
        scan_context = "No recent scans found."
        vitals_context = "No recent vitals found."

        try:
            # 1. Fetch latest Anemia scan
            scan_res = (
                supabase.table("scans")
                .select("prediction, confidence, hemoglobin_estimate, created_at")
                .eq("patient_id", patient_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if scan_res.data:
                s = scan_res.data[0]
                scan_context = f"Latest Anemia Scan ({s.get('created_at')[:10]}): Result is {s.get('prediction')} with {int(s.get('confidence', 0)*100)}% confidence. Estimated Hemoglobin: {s.get('hemoglobin_estimate')} g/dL."

            # 2. Fetch latest 3 vital logs
            vitals_res = (
                supabase.table("vitals_log")
                .select("tracker_type, value, unit")
                .eq("patient_id", patient_id)
                .order("logged_at", desc=True)
                .limit(3)
                .execute()
            )
            if vitals_res.data:
                v_list = [
                    f"{v.get('tracker_type')}: {v.get('value')} {v.get('unit')}"
                    for v in vitals_res.data
                ]
                vitals_context = f"Recent Vitals: {', '.join(v_list)}."
        except Exception as clinical_err:
            logger.warning(
                f"Failed to fetch clinical context for AI Nurse: {clinical_err}"
            )

        system_prompt = (
            f"You are Netra AI, a high-level autonomous medical triage nurse. You are calling {patient.get('full_name', 'the patient')}. "
            "YOUR CLINICAL CONTEXT FOR THIS PATIENT:\n"
            f"- {scan_context}\n"
            f"- {vitals_context}\n"
            f"- Today's medications are: {med_list}.\n\n"
            "INSTRUCTIONS:\n"
            "1. Greet the patient warmly and explain that you are calling for a proactive health check based on their recent scan and vitals.\n"
            "2. If the scan shows Anemia, ask how their energy levels have been and if they are experiencing fatigue or shortness of breath.\n"
            "3. Ask the patient if they have taken each medication listed for today.\n"
            "4. If they report symptoms like chest pain, severe dizziness, or nausea, immediately use the `alert_doctor` tool.\n"
            "5. If they want to record a new vital (like heart rate or weight), use the `log_vital` tool.\n"
            "6. Be professional, empathetic, and concise. Speak only in the requested language: {language}."
        )

        tools = [
            {
                "type": "function",
                "name": "alert_doctor",
                "description": "Alert the doctor immediately about a severe side effect the patient mentions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "side_effect": {
                            "type": "string",
                            "description": "Description of the side effect",
                        },
                        "severity": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                        },
                    },
                    "required": ["side_effect", "severity"],
                },
            },
            {
                "type": "function",
                "name": "log_vital",
                "description": "Record a patient's vital measurement when they dictate it (like blood pressure, heart rate, or temperature).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vital_type": {
                            "type": "string",
                            "enum": [
                                "blood_pressure_systolic",
                                "blood_pressure_diastolic",
                                "heart_rate",
                                "temperature",
                                "blood_glucose",
                                "oxygen_saturation",
                            ],
                        },
                        "value": {"type": "number"},
                        "unit": {"type": "string"},
                    },
                    "required": ["vital_type", "value"],
                },
            },
        ]

        logger.info(f"Injecting autonomous nurse system prompt for {patient_id}")
        await openai_ws.send(
            json.dumps(
                {
                    "type": "session.update",
                    "session": {
                        "modalities": ["text", "audio"],
                        "instructions": system_prompt,
                        "voice": "alloy",
                        "input_audio_format": "g711_ulaw",
                        "output_audio_format": "g711_ulaw",
                        "tools": tools,
                        "tool_choice": "auto",
                    },
                }
            )
        )

        # Trigger the AI to speak first!
        await openai_ws.send(json.dumps({"type": "response.create"}))

    except Exception as e:
        logger.error(f"Error configuring medication session: {e}")


async def handle_alert_doctor(function_call, patient_id, call_sid):
    """Handle the 'alert_doctor' OpenAI tool invocation"""
    try:
        args = json.loads(function_call.get("arguments", "{}"))
        side_effect = args.get("side_effect", "Unknown side effect")
        severity = args.get("severity", "high")

        # 1. Resolve doctor via most recent appointment (schema-safe)
        patient_res = (
            supabase.table("profiles_patient")
            .select("full_name")
            .eq("id", patient_id)
            .single()
            .execute()
        )
        patient = patient_res.data or {}
        patient_name = patient.get("full_name") or "the patient"

        appt_res = (
            supabase.table("appointments")
            .select("doctor_id")
            .eq("patient_id", patient_id)
            .order("scheduled_at", desc=True)
            .limit(1)
            .execute()
        )
        doctor_id = (
            (appt_res.data or [{}])[0].get("doctor_id") if appt_res.data else None
        )

        if doctor_id:
            doctor_res = (
                supabase.table("profiles_doctor")
                .select("phone")
                .eq("id", doctor_id)
                .single()
                .execute()
            )
            doctor_phone = (doctor_res.data or {}).get("phone")

            # Send Twilio SMS Notification to Doctor
            if current_client and doctor_phone:
                current_client.messages.create(
                    body=f"🚨 NETRA AI URGENT ALERT: Your patient {patient_name} reported a {severity} severity side effect: {side_effect}. Please review their dashboard.",
                    to=doctor_phone,
                    from_=TWILIO_NUMBER,
                )
                logger.info(f"Sent Doctor SMS Alert to {doctor_phone}")

            # Send In-App Supabase Notification
            supabase.table("notifications").insert(
                {
                    "user_id": doctor_id,
                    "type": "urgent_alert",
                    "title": "Patient Side Effect Alert",
                    "message": f"{patient_name} reported: {side_effect} (Severity: {severity})",
                    "data": {
                        "patient_id": patient_id,
                        "severity": severity,
                        "source": "voice_ai",
                    },
                }
            ).execute()

        # 2. Update Voice Call Logs
        if call_sid:
            supabase.table("voice_call_logs").update(
                {"side_effects": args, "alert_sent": True}
            ).eq("call_sid", call_sid).execute()

        return {
            "status": "success",
            "message": "Doctor has been alerted successfully via SMS.",
        }

    except Exception as e:
        logger.error(f"Error handling alert_doctor function: {e}")
        return {"status": "error", "message": str(e)}


async def handle_log_vital(function_call, patient_id):
    """Handle the 'log_vital' OpenAI tool invocation"""
    try:
        args = json.loads(function_call.get("arguments", "{}"))
        vital_type = args.get("vital_type")
        value = args.get("value")
        unit = args.get("unit", "")

        if vital_type and value is not None:
            supabase.table("vitals_log").insert(
                {
                    "patient_id": patient_id,
                    "tracker_type": vital_type,
                    "value": value,
                    "unit": unit,
                    "logged_at": datetime.utcnow().isoformat(),
                }
            ).execute()
            logger.info(f"Logged vital {vital_type}={value} for {patient_id}")
            return {
                "status": "success",
                "message": f"Vital {vital_type} recorded successfully.",
            }

        return {"status": "error", "message": "Missing vital_type or value."}
    except Exception as e:
        logger.error(f"Error handling log_vital: {e}")
        return {"status": "error", "message": str(e)}


async def process_twilio_events(
    twilio_ws: WebSocket, openai_ws: websockets.ClientConnection, state: dict
):
    """Bridge messages from Twilio to OpenAI."""
    try:
        async for message in twilio_ws.iter_text():
            data = json.loads(message)
            event_type = data.get("event")

            if event_type == "media":
                audio_payload = data["media"]["payload"]
                audio_bytes = base64.b64decode(audio_payload)

                # Buffer the raw ulaw stream for offline Whispering
                call_sid = state.get("call_sid")
                if call_sid:
                    if call_sid not in audio_buffers:
                        audio_buffers[call_sid] = bytearray()
                    audio_buffers[call_sid].extend(audio_bytes)

                audio_msg = {
                    "type": "input_audio_buffer.append",
                    "audio": audio_payload,
                }
                await openai_ws.send(json.dumps(audio_msg))

            elif event_type == "start":
                state["stream_sid"] = data["start"]["streamSid"]
                call_sid = data["start"].get("callSid")
                state["call_sid"] = call_sid
                logger.info(
                    f"Incoming Twilio stream started: {state['stream_sid']} (Call: {call_sid})"
                )

                # Check for TwiML Custom Parameters!
                custom_params = data["start"].get("customParameters", {})
                patient_id = custom_params.get("patient_id")
                purpose = custom_params.get("purpose")
                language = custom_params.get("language", "hi-IN")

                if patient_id:
                    state["patient_id"] = patient_id

                if purpose == "medication_check" and patient_id:
                    # Dynamically inject the medication LLM boundary
                    await configure_medication_check_session(
                        openai_ws, patient_id, language
                    )

            elif event_type == "stop":
                logger.info(f"Twilio stream stopped: {state['stream_sid']}")
                break

    except WebSocketDisconnect:
        logger.info("Twilio client disconnected.")
    except Exception as e:
        logger.error(f"Error processing Twilio events: {str(e)}")


async def process_openai_events(
    twilio_ws: WebSocket, openai_ws: websockets.ClientConnection, state: dict
):
    """Bridge messages from OpenAI back to Twilio and handle advanced capability tools."""
    try:
        async for message in openai_ws:
            response = json.loads(message)
            resp_type = response.get("type")

            if resp_type == "response.audio.delta":
                audio_b64 = response.get("delta")
                if audio_b64 and state["stream_sid"]:
                    await twilio_ws.send_text(
                        json.dumps(
                            {
                                "event": "media",
                                "streamSid": state["stream_sid"],
                                "media": {"payload": audio_b64},
                            }
                        )
                    )

            # --- Tool Execution ---
            elif resp_type == "response.function_call_arguments.done":
                call_id = response.get("call_id")
                name = response.get("name")

                if name == "alert_doctor":
                    logger.info("Nurse Agent invoked 'alert_doctor'")
                    result = await handle_alert_doctor(
                        response, state.get("patient_id"), state.get("call_sid")
                    )

                    # Return success to the model
                    await openai_ws.send(
                        json.dumps(
                            {
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": call_id,
                                    "output": json.dumps(result),
                                },
                            }
                        )
                    )
                    # Force model logic continuation
                    await openai_ws.send(json.dumps({"type": "response.create"}))

                elif name == "log_vital":
                    logger.info("Nurse Agent invoked 'log_vital'")
                    result = await handle_log_vital(response, state.get("patient_id"))

                    await openai_ws.send(
                        json.dumps(
                            {
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": call_id,
                                    "output": json.dumps(result),
                                },
                            }
                        )
                    )
                    await openai_ws.send(json.dumps({"type": "response.create"}))

    except Exception as e:
        logger.error(f"Error processing OpenAI events: {str(e)}")


async def websocket_endpoint(websocket: WebSocket):
    """The main WebSocket entry point for the Twilio media stream."""
    await websocket.accept()

    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not found.")
        await websocket.close()
        return

    url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }

    # Shared state between concurrent tasks
    state = {"stream_sid": "", "call_sid": "", "patient_id": None}

    try:
        async with websockets.connect(url, extra_headers=headers) as openai_ws:
            # Note: For inbound "book_appointment", we would usually configure the session here.
            # But we leave it flexible for outbound "medication_check", deferring to the "start" event.

            task_tw = asyncio.create_task(
                process_twilio_events(websocket, openai_ws, state)
            )
            task_oai = asyncio.create_task(
                process_openai_events(websocket, openai_ws, state)
            )

            await asyncio.gather(task_tw, task_oai)

    except websockets.exceptions.ConnectionClosed as e:
        logger.error(f"OpenAI connection closed: {e}")
    finally:
        try:
            await websocket.close()
        except Exception as e:
            logger.warning(f"Failed to close websocket: {e}")

        # Post-Call Logging Updates
        call_sid = state.get("call_sid")
        if call_sid:
            try:
                supabase.table("voice_call_logs").update(
                    {"call_status": "completed", "ended_at": datetime.now().isoformat()}
                ).eq("call_sid", call_sid).execute()

                # Offload transcription generation to background task
                asyncio.create_task(finalize_transcription(call_sid))
            except Exception as e:
                logger.error(f"Failed to close voice call log: {e}")
