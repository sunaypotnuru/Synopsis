from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional, List
from app.core.security import get_current_user
from app.models.schemas import TokenPayload, VideoTokenResponse
from app.services.livekit import (
    create_room_token,
    receive_webhook,
    start_room_recording,
    stop_room_recording,
)
from app.services.supabase import supabase
from app.services.video_consultation_service import get_video_consultation_service
from app.services.waiting_room_service import get_waiting_room_service
from app.services.webrtc_signaling import get_webrtc_signaling_service
from app.services.call_quality_monitor import get_call_quality_monitor
from app.services.recording_consent_service import get_recording_consent_service
from app.services.emergency_disconnect_service import get_emergency_disconnect_service
from app.core.config import settings

router = APIRouter(prefix="/video", tags=["Video"])


@router.get("/token", response_model=VideoTokenResponse)
async def get_video_token(
    room: str, identity: str, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Generate a LiveKit JWT token for connecting to a video consultation room.
    """
    # Verify the appointment exists
    appt_res = (
        supabase.table("appointments").select("id").eq("video_room_id", room).execute()
    )
    if not appt_res.data:
        # Creating ad-hoc or failing. We'll allow ad-hoc for demo flexibility
        pass

    token = create_room_token(room, identity)
    return {"token": token, "serverUrl": settings.LIVEKIT_URL or "ws://localhost:7880"}


@router.post("/webhook")
async def livekit_webhook(request: Request, authorization: str = Header(None)):
    """
    Handle LiveKit Webhooks (room started, participant joined, room finished).
    """
    body = await request.body()
    body_str = body.decode("utf-8")

    event = receive_webhook(body_str, authorization)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook representation")

    event_type = getattr(event, "event", None)
    room = getattr(event, "room", None)

    if event_type == "room_finished" and room:
        # Update appointment status to completed and log duration
        room_name = room.name
        duration = room.empty_timeout  # Approx metric, or compute from timestamps

        supabase.table("appointments").update(
            {"status": "completed", "duration_minutes": duration // 60}
        ).eq("video_room_id", room_name).execute()

    return {"message": "Webhook processed successfully"}


@router.get("/appointments/{appointment_id}/queue-status")
async def get_queue_status(
    appointment_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Get the current queue status for an appointment.
    """
    try:
        # Get queue entry
        queue_res = (
            supabase.table("waiting_room")
            .select("*")
            .eq("appointment_id", appointment_id)
            .single()
            .execute()
        )

        if queue_res.data:
            return {
                "position": queue_res.data.get("position", 1),
                "estimated_wait_minutes": queue_res.data.get(
                    "estimated_wait_minutes", 5
                ),
                "status": queue_res.data.get("status", "waiting"),
            }
        else:
            # No queue entry, return default
            return {"position": 1, "estimated_wait_minutes": 5, "status": "waiting"}
    except Exception:
        # Return default if table doesn't exist yet
        return {"position": 1, "estimated_wait_minutes": 5, "status": "waiting"}


@router.post("/waiting-room/call-next")
async def call_next_patient_legacy(
    doctor_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Call the next patient in the waiting queue.
    Doctor endpoint to notify the next patient.
    """
    try:
        # Get next patient in queue for this doctor
        queue_res = (
            supabase.table("waiting_room")
            .select("*")
            .eq("doctor_id", doctor_id)
            .eq("status", "waiting")
            .order("position", desc=False)
            .limit(1)
            .execute()
        )

        if not queue_res.data:
            raise HTTPException(status_code=404, detail="No patients in queue")

        next_patient = queue_res.data[0]

        # Update status to 'called'
        supabase.table("waiting_room").update({"status": "called"}).eq(
            "id", next_patient["id"]
        ).execute()

        # Update appointment status
        supabase.table("appointments").update({"status": "in_progress"}).eq(
            "id", next_patient["appointment_id"]
        ).execute()

        return {
            "message": "Patient called successfully",
            "patient_id": next_patient["patient_id"],
            "appointment_id": next_patient["appointment_id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/waiting-room/update-position")
async def update_queue_positions(
    doctor_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Recalculate queue positions after a patient is called or removed.
    """
    try:
        # Get all waiting patients for this doctor
        queue_res = (
            supabase.table("waiting_room")
            .select("*")
            .eq("doctor_id", doctor_id)
            .eq("status", "waiting")
            .order("created_at", desc=False)
            .execute()
        )

        if queue_res.data:
            # Update positions
            for idx, entry in enumerate(queue_res.data, start=1):
                supabase.table("waiting_room").update(
                    {
                        "position": idx,
                        "estimated_wait_minutes": idx * 5,  # 5 minutes per patient
                    }
                ).eq("id", entry["id"]).execute()

        return {"message": "Queue positions updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RecordStartRequest(BaseModel):
    room_name: str


class RecordStopRequest(BaseModel):
    egress_id: str


@router.post("/record/start")
async def api_start_recording(
    req: RecordStartRequest, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Start recording a LiveKit room. Only doctors can initiate recordings.
    """
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can record consultations"
        )
    try:
        egress_id = await start_room_recording(req.room_name)
        return {"success": True, "egress_id": egress_id}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start recording: {str(e)}"
        )


@router.post("/record/stop")
async def api_stop_recording(
    req: RecordStopRequest, current_user: TokenPayload = Depends(get_current_user)
):
    """
    Stop an active LiveKit room recording.
    """
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can record consultations"
        )
    try:
        success = await stop_room_recording(req.egress_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to stop recording: {str(e)}"
        )


# ==================== CATEGORY 9: VIDEO CONSULTATION ENDPOINTS ====================

# ==================== REQUEST/RESPONSE MODELS ====================


class CreateSessionRequest(BaseModel):
    appointment_id: str
    patient_id: str
    doctor_id: str


class JoinSessionRequest(BaseModel):
    user_id: str


class QualityMetricsRequest(BaseModel):
    video_bitrate: int
    audio_bitrate: int
    packet_loss: float
    jitter: int
    rtt: int
    fps: int


class ConsentResponseRequest(BaseModel):
    consent_given: bool
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class StartRecordingRequest(BaseModel):
    storage_location: str
    encryption_key_id: Optional[str] = None


class StopRecordingRequest(BaseModel):
    file_size_bytes: int
    duration_seconds: int


class EmergencyDisconnectRequest(BaseModel):
    reason: str
    description: Optional[str] = None
    requires_followup: bool = True


class SDPRequest(BaseModel):
    sdp: str
    sdp_type: str = "offer"


class ICECandidateRequest(BaseModel):
    candidate: str
    sdp_mid: Optional[str] = None
    sdp_m_line_index: Optional[int] = None


# ==================== SESSION MANAGEMENT ====================


@router.post("/sessions")
async def create_session(
    request: CreateSessionRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Create a new video consultation session"""
    service = get_video_consultation_service()
    result = service.create_session(
        appointment_id=request.appointment_id,
        patient_id=request.patient_id,
        doctor_id=request.doctor_id,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/sessions/{consultation_id}")
async def get_session(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get video consultation session details"""
    service = get_video_consultation_service()
    result = service.get_session(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


@router.post("/sessions/{consultation_id}/join")
async def join_session(
    consultation_id: str,
    request: JoinSessionRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Join a video consultation session"""
    service = get_video_consultation_service()
    result = service.join_session(consultation_id, request.user_id)

    if not result.get("success"):
        raise HTTPException(status_code=403, detail=result.get("error"))

    return result


@router.post("/sessions/{consultation_id}/leave")
async def leave_session(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Leave a video consultation session"""
    service = get_video_consultation_service()
    result = service.leave_session(consultation_id, current_user.sub)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post("/sessions/{consultation_id}/end")
async def end_session(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """End a video consultation session"""
    service = get_video_consultation_service()
    result = service.end_session(consultation_id, current_user.sub)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/sessions/{consultation_id}/status")
async def get_session_status(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get session status"""
    service = get_video_consultation_service()
    result = service.get_session_status(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


# ==================== WAITING ROOM ====================


@router.post("/waiting-room/join")
async def join_waiting_room(
    consultation_id: str,
    patient_id: str,
    doctor_id: str,
    priority: int = 0,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Add patient to waiting room"""
    service = get_waiting_room_service()
    result = service.add_to_waiting_room(
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        priority=priority,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/waiting-room/position/{consultation_id}")
async def get_queue_position(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get patient's position in waiting room queue"""
    service = get_waiting_room_service()
    result = service.get_queue_position(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


@router.post("/waiting-room/leave/{consultation_id}")
async def leave_waiting_room(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Remove patient from waiting room"""
    service = get_waiting_room_service()
    result = service.remove_from_waiting_room(consultation_id, "left")

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/waiting-room/queue/{doctor_id}")
async def get_waiting_room(
    doctor_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get waiting room queue for doctor"""
    service = get_waiting_room_service()
    result = service.get_queue(doctor_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post("/waiting-room/call-next/{doctor_id}")
async def call_next_patient(
    doctor_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Call next patient in waiting room"""
    service = get_waiting_room_service()
    result = service.call_next_patient(doctor_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


# ==================== CALL QUALITY ====================


@router.post("/quality/metrics/{consultation_id}")
async def submit_quality_metrics(
    consultation_id: str,
    request: QualityMetricsRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Submit call quality metrics"""
    monitor = get_call_quality_monitor()
    result = monitor.submit_metrics(
        consultation_id=consultation_id,
        user_id=current_user.sub,
        metrics={
            "video_bitrate": request.video_bitrate,
            "audio_bitrate": request.audio_bitrate,
            "packet_loss": request.packet_loss,
            "jitter": request.jitter,
            "rtt": request.rtt,
            "fps": request.fps,
        },
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/quality/statistics/{consultation_id}")
async def get_quality_statistics(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get quality statistics for consultation"""
    monitor = get_call_quality_monitor()
    result = monitor.get_quality_statistics(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/quality/diagnostics/{consultation_id}")
async def get_quality_diagnostics(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get quality diagnostics and recommendations"""
    monitor = get_call_quality_monitor()
    result = monitor.get_diagnostics(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


# ==================== RECORDING CONSENT ====================


@router.post("/recording/consent/request/{consultation_id}")
async def request_recording_consent(
    consultation_id: str,
    participants: List[str],
    current_user: TokenPayload = Depends(get_current_user),
):
    """Request recording consent from participants"""
    service = get_recording_consent_service()
    result = service.request_consent(
        consultation_id=consultation_id,
        requested_by=current_user.sub,
        participants=participants,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post("/recording/consent/respond/{consultation_id}")
async def respond_to_consent(
    consultation_id: str,
    request: ConsentResponseRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Respond to recording consent request"""
    service = get_recording_consent_service()
    result = service.record_consent_response(
        consultation_id=consultation_id,
        user_id=current_user.sub,
        consent_given=request.consent_given,
        ip_address=request.ip_address,
        user_agent=request.user_agent,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/recording/consent/status/{consultation_id}")
async def get_consent_status(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get consent status for all participants"""
    service = get_recording_consent_service()
    result = service.get_consent_status(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post("/recording/start/{consultation_id}")
async def start_recording(
    consultation_id: str,
    request: StartRecordingRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Start recording consultation"""
    service = get_recording_consent_service()
    result = service.start_recording(
        consultation_id=consultation_id,
        started_by=current_user.sub,
        storage_location=request.storage_location,
        encryption_key_id=request.encryption_key_id,
    )

    if not result.get("success"):
        raise HTTPException(status_code=403, detail=result.get("error"))

    return result


@router.post("/recording/stop/{consultation_id}")
async def stop_recording(
    consultation_id: str,
    request: StopRecordingRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Stop recording consultation"""
    service = get_recording_consent_service()
    result = service.stop_recording(
        consultation_id=consultation_id,
        stopped_by=current_user.sub,
        file_size_bytes=request.file_size_bytes,
        duration_seconds=request.duration_seconds,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


# ==================== EMERGENCY DISCONNECT ====================


@router.post("/emergency/disconnect/{consultation_id}")
async def emergency_disconnect(
    consultation_id: str,
    request: EmergencyDisconnectRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Perform emergency disconnect"""
    service = get_emergency_disconnect_service()
    result = service.emergency_disconnect(
        consultation_id=consultation_id,
        initiated_by=current_user.sub,
        reason=request.reason,
        description=request.description,
        requires_followup=request.requires_followup,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/emergency/incident/{incident_id}")
async def get_incident(
    incident_id: int, current_user: TokenPayload = Depends(get_current_user)
):
    """Get emergency incident details"""
    service = get_emergency_disconnect_service()
    result = service.get_incident(incident_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


@router.get("/emergency/incidents/{consultation_id}")
async def get_consultation_incidents(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get all incidents for consultation"""
    service = get_emergency_disconnect_service()
    result = service.get_consultation_incidents(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


# ==================== WEBRTC SIGNALING ====================


@router.post("/signaling/offer/{consultation_id}")
async def create_offer(
    consultation_id: str,
    request: SDPRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Create WebRTC offer"""
    service = get_webrtc_signaling_service()
    result = service.create_offer(
        consultation_id=consultation_id,
        user_id=current_user.sub,
        sdp=request.sdp,
        sdp_type=request.sdp_type,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.post("/signaling/answer/{consultation_id}")
async def create_answer(
    consultation_id: str,
    request: SDPRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Create WebRTC answer"""
    service = get_webrtc_signaling_service()
    result = service.create_answer(
        consultation_id=consultation_id,
        user_id=current_user.sub,
        sdp=request.sdp,
        sdp_type=request.sdp_type,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/signaling/offer/{consultation_id}")
async def get_offer(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get WebRTC offer"""
    service = get_webrtc_signaling_service()
    result = service.get_offer(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


@router.get("/signaling/answer/{consultation_id}")
async def get_answer(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get WebRTC answer"""
    service = get_webrtc_signaling_service()
    result = service.get_answer(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))

    return result


@router.post("/signaling/ice-candidate/{consultation_id}")
async def add_ice_candidate(
    consultation_id: str,
    request: ICECandidateRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Add ICE candidate"""
    service = get_webrtc_signaling_service()
    result = service.add_ice_candidate(
        consultation_id=consultation_id,
        user_id=current_user.sub,
        candidate=request.candidate,
        sdp_mid=request.sdp_mid,
        sdp_m_line_index=request.sdp_m_line_index,
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/signaling/ice-candidates/{consultation_id}")
async def get_ice_candidates(
    consultation_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Get ICE candidates"""
    service = get_webrtc_signaling_service()
    result = service.get_ice_candidates(consultation_id)

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))

    return result


@router.get("/signaling/config")
async def get_rtc_configuration(current_user: TokenPayload = Depends(get_current_user)):
    """Get RTC configuration (ICE servers)"""
    service = get_webrtc_signaling_service()
    config = service.get_rtc_configuration()

    return {"success": True, "config": config}

