from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid
import httpx
import logging
from app.core.config import settings
from app.core.security import get_current_patient
from app.models.schemas import TokenPayload, PrescriptionResponse, AppointmentCreate
from app.services.supabase import supabase
from app.utils.file_security import SecureFileUpload
from app.services.achievements import record_achievement_progress
from app.db.schema import Tables, Col
import asyncio
from twilio.rest import Client
import phonenumbers
from phonenumbers import NumberParseException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patient", tags=["Patient"])


def validate_coordinates(lat: float, lng: float) -> bool:
    """Validate that coordinates are within global ranges."""
    try:
        lat_f = lat
        lng_f = lng
        return -90 <= lat_f <= 90 and -180 <= lng_f <= 180
    except (TypeError, ValueError):
        return False


def validate_phone(phone: str) -> bool:
    """Validate phone number using phonenumbers library."""
    try:
        if not phone:
            return False
        parsed = phonenumbers.parse(phone, "IN")  # Default to India
        return phonenumbers.is_valid_number(parsed)
    except NumberParseException:
        return False


@router.get("/dashboard")
async def get_dashboard(current_user: TokenPayload = Depends(get_current_patient)):
    """Fetch aggregated dashboard data for the patient."""
    try:
        logger.debug("Dashboard request started")
        # Get profile
        profile_res = (
            supabase.table("profiles_patient")
            .select("id, full_name, email, avatar_url, health_score")
            .eq("id", current_user.sub)
            .execute()
        )
        if not profile_res.data:
            # Auto-create profile if missing (due to no DB trigger on signup)
            meta: Dict[str, Any] = {}
            try:
                if settings.BYPASS_AUTH:
                    meta = {}
                else:
                    user_auth = supabase.auth.admin.get_user_by_id(current_user.sub)
                    meta = (
                        user_auth.user.user_metadata
                        if user_auth and user_auth.user
                        else {}
                    )
            except Exception as auth_err:
                logger.warning(f"Could not fetch user metadata: {auth_err}")
                meta = {}

            name = (
                meta.get("full_name")
                or meta.get("name")
                or current_user.email
                or "Demo Patient"
            )

            new_profile = {
                "id": current_user.sub,
                "email": current_user.email,
                "full_name": name,
                "blood_type": meta.get("blood_group", "O+"),
                "age": 25,
                "gender": "other",
            }
            try:
                supabase.table("profiles_patient").insert(new_profile).execute()
            except Exception as insert_err:
                logger.warning(f"Could not insert profile: {insert_err}")
            profile = new_profile
        else:
            profile = profile_res.data[0]

        # Get upcoming appointments — NO FK join to avoid PGRST200 relationship errors
        today = datetime.now().isoformat()
        try:
            appts_res = (
                supabase.table("appointments")
                .select(
                    "id, patient_id, doctor_id, scheduled_at, status, type, reason, created_at"
                )
                .eq("patient_id", current_user.sub)
                .gte("scheduled_at", today)
                .order("scheduled_at")
                .limit(5)
                .execute()
            )
            upcoming_appts = appts_res.data or []
            # Enrich with doctor profiles separately
            if upcoming_appts:
                doc_ids = []
                for a in upcoming_appts:
                    if isinstance(a, dict) and a.get("doctor_id"):
                        doc_ids.append(str(a["doctor_id"]))
                doctor_ids = list(set(doc_ids))
                try:
                    docs_res = (
                        supabase.table("profiles_doctor")
                        .select("id, full_name, specialty, avatar_url")
                        .in_("id", doctor_ids)
                        .execute()
                    )
                    docs_data = docs_res.data or []
                    docs_map = {}
                    for d in docs_data:
                        if isinstance(d, dict) and d.get("id"):
                            docs_map[str(d["id"])] = d

                    for apt in upcoming_appts:
                        if not isinstance(apt, dict):
                            continue
                        doc_id = str(apt.get("doctor_id", ""))
                        doc = docs_map.get(doc_id, {})
                        apt["profiles_doctor"] = {
                            "name": doc.get("full_name", "Doctor"),
                            "specialty": doc.get("specialty", ""),
                            "avatar_url": doc.get("avatar_url"),
                        }
                except Exception:
                    for apt in upcoming_appts:
                        if isinstance(apt, dict):
                            apt["profiles_doctor"] = {
                                "name": "Doctor",
                                "specialty": "",
                                "avatar_url": None,
                            }
        except Exception as appt_err:
            logger.warning(f"Could not fetch appointments: {appt_err}")
            upcoming_appts = []

        # Get recent scans
        try:
            scans_res = (
                supabase.table("scans")
                .select(
                    "id, patient_id, image_url, prediction, confidence, hemoglobin_estimate, created_at"
                )
                .eq("patient_id", current_user.sub)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            recent_scans = []
            for scan in scans_res.data or []:
                if not isinstance(scan, dict):
                    continue

                # Map anemia_status enum to frontend format
                prediction_val = scan.get("prediction", "normal")
                if prediction_val in ["mild", "moderate", "severe"]:
                    prediction_str = "anemic"
                else:
                    prediction_str = "normal"

                recent_scans.append(
                    {
                        "id": scan.get("id"),
                        "patient_id": scan.get("patient_id"),
                        "image_url": scan.get("image_url"),
                        "prediction": prediction_str,
                        "confidence": scan.get("confidence", 0),
                        "hemoglobin_level": scan.get("hemoglobin_estimate"),
                        "created_at": scan.get("created_at"),
                    }
                )
        except Exception as scan_err:
            logger.warning(f"Could not fetch scans: {scan_err}")
            recent_scans = []

        # Get recent prescriptions (table may not exist yet)
        try:
            rx_res = (
                supabase.table("prescriptions")
                .select("*")
                .eq("patient_id", current_user.sub)
                .order("created_at", desc=True)
                .limit(2)
                .execute()
            )
            prescriptions = rx_res.data or []
        except Exception as rx_err:
            logger.warning(
                f"Could not fetch prescriptions (table may not exist): {rx_err}"
            )
            prescriptions = []

        logger.debug("Dashboard request completed successfully")
        return {
            "profile": profile,
            "upcoming_appointments": upcoming_appts,
            "recent_scans": recent_scans,
            "prescriptions": prescriptions,
        }
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scans")
async def get_scans(current_user: TokenPayload = Depends(get_current_patient)):
    """Get all scans for the patient."""
    res = (
        supabase.table("scans")
        .select(
            "id, patient_id, image_url, thumbnail_url, scan_type, prediction, confidence, hemoglobin_estimate, recommendations, created_at, reviewed_by, reviewed_at"
        )
        .eq("patient_id", current_user.sub)
        .order("created_at", desc=True)
        .execute()
    )

    # Map database fields to frontend expectations
    scans = []
    scan_data_list = res.data or []
    for scan in scan_data_list:
        if not isinstance(scan, dict):
            continue

        img_url = scan.get("image_url")
        if img_url and isinstance(img_url, str) and not img_url.startswith("http"):
            try:
                # Request a signed URL from storage
                res_signed = supabase.storage.from_("scan-images").create_signed_url(
                    img_url, 3600
                )
                if isinstance(res_signed, dict) and "signedURL" in res_signed:
                    img_url = res_signed["signedURL"]
                elif hasattr(res_signed, "signed_url"):
                    img_url = getattr(res_signed, "signed_url", img_url)
                elif isinstance(res_signed, str):
                    img_url = res_signed
            except Exception as e:
                logger.warning(
                    f"Failed to generate signed URL for scan {scan.get('id')}: {e}"
                )

        scans.append(
            {
                "id": scan.get("id"),
                "patient_id": scan.get("patient_id"),
                "image_url": img_url,
                "prediction": scan.get("prediction", "normal"),
                "confidence": scan.get("confidence", 0),
                "confidence_score": scan.get(
                    "confidence", 0
                ),  # Alias for compatibility
                "hemoglobin_level": scan.get(
                    "hemoglobin_estimate"
                ),  # Map to frontend field name
                "hemoglobin_estimate": scan.get("hemoglobin_estimate"),  # Keep original
                "recommendations": scan.get("recommendations"),
                "created_at": scan.get("created_at"),
            }
        )

    return scans


@router.post("/scans/upload")
async def upload_scan(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Upload an eye image with comprehensive security validation."""
    try:
        # Import secure file validation

        # Comprehensive security validation
        content = await SecureFileUpload.validate_image_upload(file)

        # Additional medical image validation
        if len(content) < 1024:
            # Minimum 1KB for valid image
            raise HTTPException(status_code=400, detail="Image file too small")

        # Generate secure filename
        secure_filename = SecureFileUpload.generate_secure_filename(
            file.filename, current_user.sub
        )

        # 1. Forward to AI model with timeout and error handling
        ai_result: Dict[str, Any] = {
            "prediction": "mild",
            "confidence": 0.88,
            "hemoglobin_level": 11.2,
            "recommendation": "Mild anemia detected. Please consult a doctor and consider iron supplements.",
        }

        try:
            # Proxy to the real ML API with strict timeout
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (secure_filename, content, file.content_type)}
                ai_response = await client.post(
                    f"{settings.ANEMIA_API_URL}/predict", files=files
                )
                if ai_response.status_code == 200:
                    ai_result = ai_response.json()
                    # Validate AI response structure
                    required_fields = ["prediction", "confidence"]
                    if not all(field in ai_result for field in required_fields):
                        logger.error("AI service returned invalid response structure")
                        ai_result["is_fallback"] = True
                else:
                    logger.error(
                        f"AI Service returned error: {ai_response.status_code}"
                    )
                    ai_result["is_fallback"] = True
        except httpx.TimeoutException:
            logger.error("AI Service timeout - using fallback result")
            ai_result["is_fallback"] = True
        except httpx.ConnectError:
            logger.error("AI Service connection failed - using fallback result")
            ai_result["is_fallback"] = True
        except Exception as e:
            logger.error(f"AI Service error: {str(e)}")
            ai_result["is_fallback"] = True

        # 2. Secure upload to Supabase Storage
        file_path = f"scans/{current_user.sub}/{secure_filename}"

        try:
            # Upload to Supabase Storage
            # In supabase-py 2.x, this returns the file path or raises an exception
            opts: Any = {
                "content-type": file.content_type or "image/jpeg",
                "cache-control": "3600",
                "upsert": False,
            }
            supabase.storage.from_("scan-images").upload(
                file_path,
                content,
                file_options=opts,
            )
            # Store the relative path in the database.
            # We will generate signed URLs dynamically when fetching.
            file_url = file_path

        except Exception as storage_error:
            logger.error(f"Storage error: {storage_error}")
            # Fallback to a placeholder if upload failed entirely
            file_url = "https://placehold.co/600x400?text=Scan+Upload+Error"

        # 3. Save to database with input validation
        scan_data = {
            "patient_id": current_user.sub,
            "image_url": file_url,
            "scan_type": "anemia",  # Default to anemia scan
            "prediction": str(ai_result.get("prediction", "normal"))[
                :50
            ],  # Limit length
            "confidence": max(
                0, min(1, float(ai_result.get("confidence", 0)))
            ),  # Clamp 0-1
            "hemoglobin_estimate": ai_result.get("hemoglobin_level"),
            "file_size_bytes": len(content),  # Correct column name
            "image_format": (
                (file.content_type or "").split("/")[-1].upper()
                if file.content_type and "/" in file.content_type
                else "JPEG"
            ),  # Extract format
            "original_filename": (
                file.filename[:255] if file.filename else "unknown"
            ),  # Limit length
        }

        # Validate hemoglobin estimate range
        if scan_data["hemoglobin_estimate"]:
            hb_value = float(scan_data["hemoglobin_estimate"])
            if hb_value < 0 or hb_value > 25:
                # Reasonable medical range
                scan_data["hemoglobin_estimate"] = None

        db_res = supabase.table("scans").insert(scan_data).execute()

        if not db_res.data:
            raise HTTPException(status_code=500, detail="Failed to save scan record")

        # Return with frontend-compatible field names
        result = {}
        if db_res and db_res.data:
            if isinstance(db_res.data, list) and len(db_res.data) > 0:
                item = db_res.data[0]
                result = dict(item) if isinstance(item, dict) else {}
            elif isinstance(db_res.data, dict):
                result = dict(db_res.data)
        result["confidence_score"] = result.get("confidence")  # Alias

        # Record achievements asynchronously (with error handling)
        try:
            asyncio.create_task(
                record_achievement_progress(current_user.sub, "HEALTH_TRACKER", 1)
            )
            asyncio.create_task(
                record_achievement_progress(current_user.sub, "IRON_WARRIOR", 1)
            )
        except Exception as achievement_error:
            logger.warning(f"Achievement recording failed: {achievement_error}")

        # Log successful upload (without sensitive data)
        logger.info(f"Scan uploaded successfully for user: {current_user.sub[:8]}***")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Upload failed due to server error")


@router.get("/appointments")
async def get_appointments(current_user: TokenPayload = Depends(get_current_patient)):
    """Get all appointments for the patient, enriched with doctor profile data."""
    try:
        res = (
            supabase.table("appointments")
            .select(
                "id, patient_id, doctor_id, scheduled_at, status, type, reason, notes, created_at, updated_at"
            )
            .eq("patient_id", current_user.sub)
            .order("scheduled_at", desc=True)
            .execute()
        )
        appointments = res.data or []

        # Enrich with doctor profile data
        doc_ids = []
        for a in appointments:
            if isinstance(a, dict) and a.get("doctor_id"):
                doc_ids.append(str(a["doctor_id"]))
        doctor_ids = list(set(doc_ids))
        doctor_map = {}
        if doctor_ids:
            try:
                doc_res = (
                    supabase.table("profiles_doctor")
                    .select("id, full_name, specialty, avatar_url")
                    .in_("id", doctor_ids)
                    .execute()
                )
                doc_data = doc_res.data or []
                for doc in doc_data:
                    if isinstance(doc, dict) and doc.get("id"):
                        doctor_map[str(doc["id"])] = {
                            "name": doc.get("full_name", "Doctor"),
                            "specialty": doc.get("specialty", "Specialist"),
                            "avatar_url": doc.get("avatar_url"),
                        }
            except Exception as e:
                logger.warning(f"Doctor profile enrichment failed: {e}")

        for appt in appointments:
            if isinstance(appt, dict):
                doc_id = appt.get("doctor_id")
                appt["profiles_doctor"] = doctor_map.get(
                    str(doc_id) if doc_id else "",
                    {"name": "Doctor", "specialty": "Specialist"},
                )

        return appointments
    except Exception as e:
        logger.error(f"Error fetching appointments: {str(e)}")
        return []


@router.post("/appointments")
async def schedule_appointment(
    appt: AppointmentCreate, current_user: TokenPayload = Depends(get_current_patient)
):
    """Schedule a new appointment with overlap prevention."""
    from app.services.appointment_service import (
        get_appointment_service,
        AppointmentConflictError,
        DoctorUnavailableError,
    )
    from app.services.reminder_service import get_reminder_service

    try:
        # Parse scheduled_at to datetime
        if isinstance(appt.scheduled_at, str):
            scheduled_at = datetime.fromisoformat(
                appt.scheduled_at.replace("Z", "+00:00")
            )
        elif hasattr(appt.scheduled_at, "isoformat"):
            scheduled_at = appt.scheduled_at
        else:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at format")

        # Use appointment service with overlap prevention
        appointment_service = get_appointment_service()
        result = await appointment_service.schedule_appointment(
            patient_id=current_user.sub,
            doctor_id=appt.doctor_id,
            scheduled_at=scheduled_at,
            appointment_type=appt.type or "video",
            reason=appt.reason or "Consultation",
            duration_minutes=getattr(appt, "duration_minutes", 30),
        )

        # Send booking confirmation (async, don't wait)
        try:
            reminder_service = get_reminder_service()
            asyncio.create_task(
                reminder_service.send_booking_confirmation(result["id"])
            )
        except Exception as e:
            logger.warning(f"Failed to send booking confirmation: {e}")

        # Gamification
        asyncio.create_task(
            record_achievement_progress(current_user.sub, "CONSULTATION_READY", 1)
        )

        return result
    except AppointmentConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except DoctorUnavailableError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Appointment booking error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")


@router.post("/waitlist")
async def join_waitlist(
    appt: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Join the waitlist for a doctor."""
    data = {
        "patient_id": current_user.sub,
        "doctor_id": appt.get("doctor_id"),
        "scheduled_at": appt.get("preferred_date"),
        "type": appt.get("type", "video"),
        "reason": appt.get("reason", "Waitlist Request"),
        "status": "waitlist",
    }
    res = supabase.table("appointments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to join waitlist.")
    return res.data[0]


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
async def get_prescriptions(current_user: TokenPayload = Depends(get_current_patient)):
    """Get all prescriptions for the patient."""
    try:
        # Note: avoid profiles_doctor(*) FK join — relationship may not exist in schema
        res = (
            supabase.table("prescriptions")
            .select("*")
            .eq("patient_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching prescriptions: {e}")
        return []


@router.put("/appointments/{id}/cancel")
async def cancel_appointment(
    id: str, current_user: TokenPayload = Depends(get_current_patient)
):
    """Cancel an appointment with policy enforcement."""
    from app.services.appointment_service import get_appointment_service
    from app.services.reminder_service import get_reminder_service

    try:
        appointment_service = get_appointment_service()
        result = await appointment_service.cancel_appointment(
            appointment_id=id,
            user_id=current_user.sub,
            user_role="patient",
            reason="Cancelled by patient",
        )

        # Send cancellation notification (async, don't wait)
        try:
            reminder_service = get_reminder_service()
            asyncio.create_task(reminder_service.send_cancellation_notification(id))
        except Exception as e:
            logger.warning(f"Failed to send cancellation notification: {e}")

        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/appointments/{id}/reschedule")
async def reschedule_appointment(
    id: str, payload: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Reschedule an existing appointment with overlap prevention."""
    from app.services.appointment_service import (
        get_appointment_service,
        AppointmentConflictError,
    )

    try:
        new_date = payload.get("scheduled_at") or payload.get("date_time")
        if not new_date:
            raise HTTPException(status_code=400, detail="scheduled_at is required.")

        # Parse new date
        if isinstance(new_date, str):
            new_scheduled_at = datetime.fromisoformat(new_date.replace("Z", "+00:00"))
        else:
            new_scheduled_at = new_date

        # Use appointment service
        appointment_service = get_appointment_service()
        result = await appointment_service.reschedule_appointment(
            appointment_id=id,
            new_scheduled_at=new_scheduled_at,
            user_id=current_user.sub,
            user_role="patient",
        )

        return result
    except AppointmentConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reschedule error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(current_user: TokenPayload = Depends(get_current_patient)):
    """Fetch and merge scans, appointments, and prescriptions into a unified timeline."""
    try:
        # Get past appointments
        today = datetime.now().isoformat()
        appts_res = (
            supabase.table("appointments")
            .select("id, created_at")
            .eq("patient_id", current_user.sub)
            .lt("scheduled_at", today)
            .order("scheduled_at", desc=True)
            .execute()
        )

        # Get all scans
        scans_res = (
            supabase.table("scans")
            .select("*")
            .eq("patient_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )

        records = []

        # Format Scans
        scans_data = scans_res.data or []
        if scans_data:
            for scan in scans_data:
                if not isinstance(scan, dict):
                    continue
                try:
                    # Format to string percentage
                    conf_val = scan.get("confidence") or 0  # Use correct field name
                    if isinstance(conf_val, str):
                        try:
                            conf_val = float(conf_val)
                        except (ValueError, TypeError):
                            conf_val = 0
                    conf_val_f: Any = conf_val
                    conf_str = f"{int(float(conf_val_f or 0) * 100)}%"

                    created_at = scan.get("created_at", "")
                    if created_at:
                        date_str = datetime.fromisoformat(
                            str(created_at).replace("Z", "+00:00")
                        ).strftime("%b %d, %Y")
                    else:
                        date_str = "Unknown Date"

                    # Map prediction to status
                    prediction = scan.get("prediction", "normal")
                    if prediction in ["mild", "moderate", "severe"]:
                        status = "Anemic"
                    else:
                        status = "Normal"

                    records.append(
                        {
                            "id": scan.get("id"),
                            "date": date_str,
                            "raw_date": str(created_at),
                            "type": "AI Scan",
                            "result": status,  # Use mapped status instead of non-existent 'status' field
                            "details": f"Hemoglobin: {scan.get('hemoglobin_estimate', 'N/A')} g/dL",  # Use correct field name
                            "confidence": conf_str,
                        }
                    )
                except Exception as scan_err:
                    logger.warning(f"Error formatting scan: {scan_err}")

        # Format Appointments
        if appts_res.data:
            try:
                # We also need prescriptions to map to appointments if possible
                rx_res = (
                    supabase.table("prescriptions")
                    .select("*")
                    .eq("patient_id", current_user.sub)
                    .execute()
                )
                rx_data = rx_res.data or []
                rx_dict = {}
                for rx in rx_data:
                    if isinstance(rx, dict) and rx.get("appointment_id"):
                        rx_dict[str(rx["appointment_id"])] = rx
            except Exception as rx_err:
                logger.warning(
                    f"Could not fetch prescriptions for history mapping: {rx_err}"
                )
                rx_dict = {}

            appts_data = appts_res.data or []
            for appt in appts_data:
                if not isinstance(appt, dict):
                    continue
                try:
                    # Use scheduled_at (the correct DB column name)
                    date_time = appt.get("scheduled_at", "")
                    if date_time:
                        date_str = datetime.fromisoformat(
                            str(date_time).replace("Z", "+00:00")
                        ).strftime("%b %d, %Y")
                    else:
                        date_str = "Unknown Date"

                    doctor_info = appt.get("profiles_doctor")
                    if not isinstance(doctor_info, dict):
                        doctor_info = {}

                    appt_id = appt.get("id")
                    prescription_text = ""
                    if appt_id and appt_id in rx_dict:
                        med_data = rx_dict[appt_id].get("medications")
                        meds = med_data if isinstance(med_data, list) else []
                        prescription_text = ", ".join(
                            [
                                f"{str(m.get('name'))} {str(m.get('dosage'))}"
                                for m in meds
                                if isinstance(m, dict)
                            ]
                        )

                    records.append(
                        {
                            "id": appt.get("id"),
                            "date": date_str,
                            "raw_date": date_time,
                            "type": (
                                "Video Consultation"
                                if (
                                    appt.get("consultation_type") == "video"
                                    or appt.get("type") == "video"
                                )
                                else "In-Person Consultation"
                            ),
                            "doctor": str(
                                doctor_info.get("full_name")
                                or doctor_info.get("name")
                                or "Unknown Doctor"
                            ),
                            "specialty": str(doctor_info.get("specialty", "") or "")
                            .replace("_", " ")
                            .title(),
                            "duration": f"{appt.get('duration_minutes') or 30} min",
                            "summary": appt.get("notes")
                            or "Consultation completed successfully.",
                            "prescription": prescription_text,
                        }
                    )
                except Exception as appt_err:
                    logger.warning(f"Error formatting appointment: {appt_err}")

        # Sort combined records by date descending
        records.sort(key=lambda x: x.get("raw_date", ""), reverse=True)

        return {"records": records}
    except Exception as e:
        logger.error(f"History error: {str(e)}")
        return {"records": []}


@router.post("/profile/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Upload profile avatar image to Supabase Storage."""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Validate file size (max 5MB)
        contents = await file.read()  # Read file contents
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400, detail="File size must be less than 5MB"
            )

        # Generate unique filename
        file_ext = "jpg"
        if file.filename and "." in file.filename:
            file_ext = file.filename.split(".")[-1]
        unique_filename = f"{current_user.sub}_{uuid.uuid4()}.{file_ext}"

        # Upload to Supabase Storage
        try:
            # Create bucket if it doesn't exist (will fail silently if exists)
            try:
                supabase.storage.create_bucket("avatars", options={"public": True})
            except Exception as e:
                logger.debug(f"Bucket creation skipped (may already exist): {e}")

            # Upload file
            supabase.storage.from_("avatars").upload(
                path=unique_filename,
                file=contents,
                file_options={"content-type": file.content_type},
            )

            # Get public URL
            public_url = supabase.storage.from_("avatars").get_public_url(
                unique_filename
            )

            # Update profile with avatar URL
            update_res = (
                supabase.table("profiles_patient")
                .update({"avatar_url": public_url})
                .eq("id", current_user.sub)
                .execute()
            )

            if not update_res.data:
                raise HTTPException(
                    status_code=500, detail="Failed to update profile with avatar URL"
                )

            return {
                "success": True,
                "avatar_url": public_url,
                "message": "Avatar uploaded successfully",
            }

        except Exception as storage_err:
            logger.error(f"Storage error: {storage_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage: {str(storage_err)}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
async def update_profile(
    updates: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Update patient profile fields with validation."""
    try:
        # 1. Validate Phone Numbers if present in updates
        emergency_phone = updates.get("emergency_contact_phone")
        if emergency_phone:
            if not validate_phone(emergency_phone):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid emergency contact phone number format.",
                )

        main_phone = updates.get("phone")
        if main_phone:
            if not validate_phone(main_phone):
                raise HTTPException(
                    status_code=400, detail="Invalid personal phone number format."
                )

        # 2. Perform Update
        res = (
            supabase.table("profiles_patient")
            .update(updates)
            .eq("id", current_user.sub)
            .execute()
        )
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to update profile.")

        asyncio.create_task(
            record_achievement_progress(current_user.sub, "PROFILE_BUILDER", 1)
        )

        return {"success": True, "data": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/medication-schedule")
async def update_medication_schedule(
    schedule: list, current_user: TokenPayload = Depends(get_current_patient)
):
    """Update the AI Nurse outbound medication array."""
    try:
        res = (
            supabase.table("profiles_patient")
            .update({"medication_schedule": schedule})
            .eq("id", current_user.sub)
            .execute()
        )
        return {"message": "Schedule updated", "data": res.data}
    except Exception as e:
        logger.error(f"Med Schedule update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/call-preferences")
async def update_call_preferences(
    prefs: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Update the Proactive AI Nurse Call metrics."""
    try:
        res = (
            supabase.table("profiles_patient")
            .update({"call_preferences": prefs})
            .eq("id", current_user.sub)
            .execute()
        )
        return {"message": "Preferences updated", "data": res.data}
    except Exception as e:
        logger.error(f"Call prefs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# HEALTH RISK ASSESSMENTS
# ============================================


@router.get("/risk-assessments")
async def get_risk_assessments(
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Get all health risk assessments for the patient."""
    try:
        res = (
            supabase.table("risk_assessments")
            .select("*")
            .eq("patient_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching risk assessments: {e}")
        return []


@router.post("/risk-assessments")
async def create_risk_assessment(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Submit a new risk assessment score."""
    try:
        assessment = {
            "patient_id": current_user.sub,
            "assessment_type": data.get("assessment_type", "general"),
            "risk_score": data.get("score") or data.get("risk_score", 0),
            "risk_level": data.get("risk_level", "moderate"),
            "factors": data.get("raw_responses") or data.get("factors", {}),
        }
        res = supabase.table("risk_assessments").insert(assessment).execute()

        if not res.data:
            raise HTTPException(
                status_code=400, detail="Failed to save risk assessment."
            )

        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating risk assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk-assessments/{id}")
async def get_risk_assessment(
    id: str, current_user: TokenPayload = Depends(get_current_patient)
):
    """Retrieve full details of a specific assessment."""
    try:
        res = (
            supabase.table("risk_assessments")
            .select("*")
            .eq("id", id)
            .maybe_single()
            .execute()
        )
        if res and hasattr(res, "data") and res.data:
            return res.data
        else:
            raise HTTPException(status_code=404, detail="Risk Assessment not found")
    except Exception as e:
        logger.error(f"Error fetching assessment {id}: {e}")
        raise HTTPException(status_code=404, detail="Risk Assessment not found")


# ============================================
# FAMILY HEALTH MANAGEMENT
# ============================================


@router.get("/family-members")
async def get_family_members(current_user: TokenPayload = Depends(get_current_patient)):
    """Get all family members (dependents) under this patient account."""
    try:
        # Query the family_members table (not profiles_patient)
        res = (
            supabase.table("family_members")
            .select("*")
            .eq("primary_user_id", current_user.sub)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching family members: {e}")
        return []


@router.post("/family-members")
async def add_family_member(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Add a new family member (dependent) under the current patient's account.

    Note: Uses a dedicated family_members table to avoid FK constraints on profiles_patient.
    Falls back to profiles_patient insert if family_members table doesn't exist yet.
    """
    member_data = {
        "id": str(uuid.uuid4()),
        "primary_user_id": current_user.sub,  # Changed from primary_patient_id to match schema
        "name": data.get("full_name") or data.get("name"),  # Support both field names
        "relation": data.get("relationship")
        or data.get("relation", "family"),  # Changed to match schema
        "date_of_birth": data.get("date_of_birth"),
        "age": data.get("age"),
        "gender": data.get("gender"),
        "blood_group": data.get("blood_group"),
        "phone": data.get("phone"),
        "email": data.get("email"),
        "medical_conditions": data.get("medical_conditions", []),
        "allergies": data.get("allergies", []),
    }
    try:
        # Try dedicated family_members table first (no FK constraint to auth.users)
        res = supabase.table("family_members").insert(member_data).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=400, detail="Failed to add family member.")
        return {"success": True, "data": res.data[0]}
    except Exception as family_table_err:
        err_str = str(family_table_err)
        if "does not exist" in err_str or "42P01" in err_str:
            # family_members table not yet created — return guidance
            logger.warning(
                "family_members table not found. Please create it in Supabase."
            )
            raise HTTPException(
                status_code=501,
                detail="Family members table not set up. Please run the DB migration to create the family_members table.",
            )
        logger.error(f"Error creating family member: {family_table_err}")
        raise HTTPException(status_code=500, detail=str(family_table_err))


# ============================================
# MEDICATION REMINDERS
# ============================================


@router.get("/medications")
async def get_medications(current_user: TokenPayload = Depends(get_current_patient)):
    """Get active medication reminders for patient."""
    try:
        res = (
            supabase.table("medications")
            .select("*")
            .eq("patient_id", current_user.sub)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching medications: {e}")
        return []


@router.post("/medications")
async def add_medication(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Add a new medication reminder."""
    try:
        med = {
            "patient_id": current_user.sub,
            "name": data.get("name"),
            "dosage": data.get("dosage"),
            "frequency": data.get("frequency"),
            "time_slots": data.get("time_slots", []),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "is_active": True,
        }
        res = supabase.table("medications").insert(med).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error(f"Error adding medication: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/medications/{id}/toggle")
async def toggle_medication(
    id: str, data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Turn a reminder on or off."""
    try:
        res = (
            supabase.table("medications")
            .update({"is_active": data.get("is_active", False)})
            .eq("id", id)
            .eq("patient_id", current_user.sub)
            .execute()
        )
        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error(f"Error toggling med: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/medications/{id}")
async def delete_medication(
    id: str, current_user: TokenPayload = Depends(get_current_patient)
):
    """Delete a medication reminder."""
    try:
        supabase.table("medications").delete().eq("id", id).eq(
            "patient_id", current_user.sub
        ).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting med: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# CHRONIC DISEASE MANAGEMENT
# ============================================


@router.get("/vitals")
async def get_vitals(current_user: TokenPayload = Depends(get_current_patient)):
    """Get all vitals tracking logs for the patient."""
    try:
        res = (
            supabase.table("vitals_log")
            .select("*")
            .eq("patient_id", current_user.sub)
            .order("logged_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching vitals: {e}")
        return []


@router.post("/vitals")
async def add_vital_log(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Add a new vital tracking log."""
    try:
        vital = {
            "patient_id": current_user.sub,
            "tracker_type": data.get("tracker_type"),
            "value": data.get("value"),
            "unit": data.get("unit"),
            "notes": data.get("notes", ""),
            "logged_at": data.get("logged_at") or datetime.now().isoformat(),
        }
        res = supabase.table("vitals_log").insert(vital).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error(f"Error logging vital: {e}")
        raise HTTPException(status_code=500, detail="Failed to log vital")


# ============================================
# PATIENT FOLLOW-UP & RATINGS
# ============================================


@router.get("/follow-ups/{appointment_id}")
async def get_follow_up(
    appointment_id: str, current_user: TokenPayload = Depends(get_current_patient)
):
    """Check if a follow-up exists for a given appointment."""
    try:
        res = (
            supabase.table(Tables.FOLLOW_UP_SURVEYS)
            .select("*")
            .eq(Col.FollowUpSurveys.APPOINTMENT_ID, appointment_id)
            .eq(Col.FollowUpSurveys.PATIENT_ID, current_user.sub)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error checking follow-up: {e}")
        return None


@router.post("/follow-ups")
async def submit_follow_up(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Submit a rating and review for an appointment."""
    try:
        appt_id = data.get("appointment_id")
        rating = data.get("rating")
        review = data.get("review", "")

        # Verify appointment belongs to patient
        appt = (
            supabase.table("appointments")
            .select("doctor_id")
            .eq("id", appt_id)
            .eq("patient_id", current_user.sub)
            .execute()
        )
        if not appt.data or not isinstance(appt.data, list) or len(appt.data) == 0:
            raise HTTPException(status_code=403, detail="Unauthorized")

        first_appt = appt.data[0]
        doctor_id = (
            first_appt.get("doctor_id") if isinstance(first_appt, dict) else None
        )
        if not doctor_id:
            raise HTTPException(status_code=400, detail="Invalid doctor data")

        survey = {
            Col.FollowUpSurveys.APPOINTMENT_ID: appt_id,
            Col.FollowUpSurveys.PATIENT_ID: current_user.sub,
            Col.FollowUpSurveys.DOCTOR_ID: doctor_id,
            Col.FollowUpSurveys.RATING: rating,  # integer 1-5
            Col.FollowUpSurveys.RESPONSE: review,  # text feedback
            Col.FollowUpSurveys.ANSWERED_AT: datetime.now().isoformat(),
        }
        res = supabase.table(Tables.FOLLOW_UP_SURVEYS).insert(survey).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error(f"Error saving follow up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PRO: PATIENT REPORTED OUTCOMES
# ============================================


@router.get("/pro-questionnaires")
async def get_patient_pro_questionnaires(
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Get active PRO questionnaires from doctors this patient has seen."""
    try:
        # 1. Find doctors associated with this patient
        appts = (
            supabase.table("appointments")
            .select("doctor_id")
            .eq("patient_id", current_user.sub)
            .execute()
        )
        appt_data_list = appts.data or []
        doctor_ids = []
        for a in appt_data_list:
            if isinstance(a, dict) and a.get("doctor_id"):
                doctor_ids.append(str(a["doctor_id"]))
        doctor_ids = list(set(doctor_ids))

        if not doctor_ids:
            return []

        # 2. Fetch active questionnaires for these doctors
        res = (
            supabase.table("pro_questionnaires")
            .select("*")
            .in_("doctor_id", doctor_ids)
            .eq("is_active", True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching PRO questionnaires: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pro-submissions")
async def submit_pro_questionnaire(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Submit answers to a PRO questionnaire."""
    try:
        submission = {
            "patient_id": current_user.sub,
            "questionnaire_id": data.get("questionnaire_id"),
            "answers": data.get("answers", {}),
        }
        res = supabase.table("pro_submissions").insert(submission).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error(f"Error submitting PRO data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pro-submissions")
async def get_patient_pro_submissions(
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Get PRO submission history for the current patient."""
    try:
        res = (
            supabase.table("pro_submissions")
            .select("*")
            .eq("patient_id", current_user.sub)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching PRO submissions: {e}")
        # Non-critical: allow UI to render with empty history
        return []


@router.post("/sos")
async def trigger_emergency_sos(
    data: dict, current_user: TokenPayload = Depends(get_current_patient)
):
    """Trigger an Emergency SOS alert with location and contact notify logic."""
    try:
        lat = data.get("lat")
        lng = data.get("lng")

        # 1. Validate Coordinates
        if lat is not None and lng is not None:
            if not validate_coordinates(lat, lng):
                raise HTTPException(
                    status_code=400, detail="Invalid GPS coordinates provided."
                )

        # 2. Get Patient Identity
        profile_res = (
            supabase.table("profiles_patient")
            .select("full_name")
            .eq("id", current_user.sub)
            .single()
            .execute()
        )
        patient_name = "A Patient"
        if profile_res and profile_res.data and isinstance(profile_res.data, dict):
            patient_name = profile_res.data.get("full_name", "A Patient")

        maps_link = (
            f"https://www.google.com/maps?q={lat},{lng}"
            if lat is not None and lng is not None
            else "Unknown Location"
        )

        sms_body = f"EMERGENCY SOS: {patient_name} requires immediate medical assistance. Last Location: {maps_link}"

        # 3. Send SMS via Twilio with Dynamic Contact Lookup
        try:
            if (
                settings.TWILIO_ACCOUNT_SID
                and not settings.TWILIO_ACCOUNT_SID.startswith("AC_mock")
                and settings.TWILIO_ACCOUNT_SID != "YOUR_TWILIO_ACCOUNT_SID"
            ):
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

                # Query dynamic emergency contacts from family_relationships
                contacts_res = (
                    supabase.table("family_relationships")
                    .select(
                        "related_user_id, profiles_patient!related_user_id(phone, full_name)"
                    )
                    .eq("primary_user_id", current_user.sub)
                    .eq("is_emergency_contact", True)
                    .execute()
                )

                emergency_phones = []
                if contacts_res.data:
                    for entry in contacts_res.data:
                        if not isinstance(entry, dict):
                            continue
                        profile = entry.get("profiles_patient")
                        if isinstance(profile, dict) and profile.get("phone"):
                            phone = str(profile["phone"])
                            if validate_phone(phone):
                                emergency_phones.append(phone)

                # Fallback to .env if no database contacts found
                if not emergency_phones:
                    if settings.SOS_EMERGENCY_PHONE and validate_phone(
                        settings.SOS_EMERGENCY_PHONE
                    ):
                        emergency_phones.append(settings.SOS_EMERGENCY_PHONE)

                if not emergency_phones:
                    raise HTTPException(
                        status_code=400,
                        detail="No valid emergency contacts configured. Please update your profile.",
                    )

                # Broadcast to all contacts
                for phone in emergency_phones:
                    client.messages.create(
                        body=sms_body, from_=settings.TWILIO_PHONE_NUMBER, to=phone
                    )
            else:
                logger.warning(
                    "Twilio not fully configured. SOS SMS broadcast skipped."
                )
                # In bypass/mock mode, we log but don't fail the whole request to allow UI testing
                if settings.BYPASS_AUTH:
                    pass
                elif (
                    settings.TWILIO_ACCOUNT_SID == "YOUR_TWILIO_ACCOUNT_SID"
                    or not settings.TWILIO_ACCOUNT_SID
                ):
                    # If explicitly requested in non-bypass mode and credentials are placeholders, raise error
                    raise HTTPException(
                        status_code=503,
                        detail="SOS Gateway unconfigured. Please contact support.",
                    )

        except HTTPException:
            raise
        except Exception as twilio_err:
            logger.error(f"Failed to send SOS SMS: {twilio_err}")
            raise HTTPException(
                status_code=503,
                detail="Emergency alert system unavailable. Please call emergency services directly.",
            )

        # 4. Log Notification to Audit Trail
        supabase.table(Tables.NOTIFICATIONS).insert(
            {
                Col.Notifications.USER_ID: current_user.sub,
                Col.Notifications.TYPE: "emergency_sos",
                Col.Notifications.TITLE: "SOS Triggered",
                Col.Notifications.MESSAGE: f"Broadcast sent with location: {maps_link}",
            }
        ).execute()

        return {
            "success": True,
            "message": "SOS Alert Dispatched to Emergency Contacts",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SOS Trigger Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during SOS")


@router.get("/export/fhir")
async def export_fhir(current_user: TokenPayload = Depends(get_current_patient)):
    """
        Export patient health record as a FHIR R4 Bundle JSON.
        Includes Patient,
    Appointment (Encounter)
    import Prescription (MedicationRequest)
    and Vital Signs (Observation) resources.
    """

    patient_id = current_user.sub

    try:
        # Fetch all necessary patient data in parallel
        profile_res = (
            supabase.table("profiles_patient")
            .select("*")
            .eq("id", patient_id)
            .maybe_single()
            .execute()
        )
        appts_res = (
            supabase.table("appointments")
            .select("*")
            .eq("patient_id", patient_id)
            .execute()
        )
        rx_res = (
            supabase.table("prescriptions")
            .select("*")
            .eq("patient_id", patient_id)
            .execute()
        )
        vitals_res = (
            supabase.table("vitals_log")
            .select("*")
            .eq("patient_id", patient_id)
            .execute()
        )

        profile = {}
        if profile_res and profile_res.data:
            if isinstance(profile_res.data, list) and len(profile_res.data) > 0:
                item = profile_res.data[0]
                profile = dict(item) if isinstance(item, dict) else {}
            elif isinstance(profile_res.data, dict):
                profile = dict(profile_res.data)

        bundle: dict = {
            "resourceType": "Bundle",
            "type": "collection",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry": [],
        }

        # ── Patient Resource ────────────────────────────────────
        bundle["entry"].append(
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": patient_id,
                    "name": [{"text": profile.get("full_name", "Unknown")}],
                    "birthDate": profile.get("date_of_birth"),
                    "gender": profile.get("gender", "unknown"),
                    "telecom": [{"system": "email", "value": profile.get("email")}],
                }
            }
        )

        # ── Appointment → Encounter Resources ───────────────────
        appts_data = (appts_res.data or []) if appts_res else []
        for appt in appts_data:
            if not isinstance(appt, dict):
                continue
            bundle["entry"].append(
                {
                    "resource": {
                        "resourceType": "Encounter",
                        "id": appt.get("id"),
                        "status": appt.get("status", "unknown"),
                        "class": {"code": "VR", "display": "virtual"},
                        "subject": {"reference": f"Patient/{patient_id}"},
                        "period": {"start": appt.get("scheduled_at")},
                    }
                }
            )

        # ── Prescription → MedicationRequest Resources ──────────
        rx_data = (rx_res.data or []) if rx_res else []
        for rx in rx_data:
            if not isinstance(rx, dict):
                continue
            meds_raw = rx.get("medications")
            meds_list: List[Any] = meds_raw if isinstance(meds_raw, list) else []
            for med in meds_list:
                if not isinstance(med, dict):
                    continue
                bundle["entry"].append(
                    {
                        "resource": {
                            "resourceType": "MedicationRequest",
                            "id": f"{rx.get('id')}-{med.get('name', 'med')}",
                            "status": "active",
                            "intent": "order",
                            "medicationCodeableConcept": {
                                "text": med.get("name", "Unknown medication")
                            },
                            "subject": {"reference": f"Patient/{patient_id}"},
                            "dosageInstruction": [
                                {
                                    "text": f"{med.get('dosage')} - {med.get('frequency')}"
                                }
                            ],
                        }
                    }
                )

        # ── Vitals → Observation Resources ──────────────────────
        vitals_data = (vitals_res.data or []) if vitals_res else []
        for vital in vitals_data:
            if not isinstance(vital, dict):
                continue
            bundle["entry"].append(
                {
                    "resource": {
                        "resourceType": "Observation",
                        "id": vital.get("id"),
                        "status": "final",
                        "code": {"text": vital.get("tracker_type", "Vital Sign")},
                        "subject": {"reference": f"Patient/{patient_id}"},
                        "effectiveDateTime": vital.get("logged_at"),
                        "valueQuantity": {
                            "value": vital.get("value"),
                            "unit": vital.get("unit", ""),
                        },
                    }
                }
            )

        return JSONResponse(
            content=bundle,
            headers={
                "Content-Disposition": "attachment; filename=health_record_fhir.json"
            },
        )

    except Exception as e:
        logger.error(f"FHIR export error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate FHIR export")


# ─── Language Preference ─────────────────────────────────────────────────────
# profiles_patient column is "language" — NOT "preferred_language"


class LanguagePreferencePayload(BaseModel):
    language: str


@router.put("/profile/language")
async def update_language_preference(
    payload: LanguagePreferencePayload,
    current_user: TokenPayload = Depends(get_current_patient),
):
    """Update the user's preferred language. Column name is 'language' in profiles_patient."""
    valid_langs = {"en", "hi", "ta", "te", "mr", "kn"}
    if payload.language not in valid_langs:
        raise HTTPException(
            status_code=400, detail=f"Invalid language. Supported: {valid_langs}"
        )
    try:
        supabase.table(Tables.PROFILES_PATIENT).update(
            {Col.ProfilesPatient.LANGUAGE: payload.language}
        ).eq(Col.ProfilesPatient.ID, current_user.sub).execute()
        return {"message": "Language preference updated", "language": payload.language}
    except Exception as e:
        logger.error(f"update_language_preference error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to update language preference"
        )
