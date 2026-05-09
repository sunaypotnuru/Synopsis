from pydantic import BaseModel, EmailStr, Field, model_validator, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum


# ─────────────────────────────────────────────────────────────
# Enums corresponding to DB Types
# ─────────────────────────────────────────────────────────────
class AppointmentStatus(str, Enum):
    BOOKED = "booked"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AppointmentType(str, Enum):
    VIDEO = "video"
    IN_PERSON = "in-person"


class AnemiaStatus(str, Enum):
    NORMAL = "Normal"
    MILD = "Mild Anemia"
    MODERATE = "Moderate Anemia"
    SEVERE = "Severe Anemia"


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class TokenPayload(BaseModel):
    sub: str  # User ID
    email: Optional[str] = None
    role: UserRole = UserRole.PATIENT


# ─────────────────────────────────────────────────────────────
# Profile Schemas
# ─────────────────────────────────────────────────────────────
class PatientProfileBase(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    email: EmailStr
    avatar_url: Optional[str] = None


class PatientProfileCreate(PatientProfileBase):
    pass


class PatientProfileResponse(PatientProfileBase):
    id: str
    health_score: int = 72
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DoctorProfileBase(BaseModel):
    name: str
    specialty: str
    email: EmailStr
    avatar_url: Optional[str] = None
    availability: Optional[Any] = Field(default_factory=dict)
    consultation_fee: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class DoctorProfileCreate(DoctorProfileBase):
    pass


class DoctorProfileResponse(DoctorProfileBase):
    id: str
    rating: float
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────
# Appointment Schemas
# ─────────────────────────────────────────────────────────────
class AppointmentBase(BaseModel):
    doctor_id: str
    scheduled_at: Optional[datetime] = None
    date_time: Optional[datetime] = None  # Alias for legacy support
    type: Optional[str] = None  # 'video' or 'in-person'
    consultation_type: Optional[str] = None  # alias for type from frontend
    reason: Optional[str] = None
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, values):
        # Prefer 'scheduled_at' but accept 'date_time'
        if values.get("date_time") and not values.get("scheduled_at"):
            values["scheduled_at"] = values["date_time"]

        # Ensure both are set if one is
        if values.get("scheduled_at") and not values.get("date_time"):
            values["date_time"] = values["scheduled_at"]

        # Accept 'consultation_type' as 'type'
        if values.get("consultation_type") and not values.get("type"):
            values["type"] = values["consultation_type"]
        # Default type
        if not values.get("type"):
            values["type"] = "video"
        return values


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdateStatus(BaseModel):
    status: AppointmentStatus


class AppointmentResponse(AppointmentBase):
    id: str
    patient_id: str
    status: AppointmentStatus
    notes: Optional[str] = None
    meeting_url: Optional[str] = None
    video_room_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────
# Scans & AI Schemas
# ─────────────────────────────────────────────────────────────
class ScanBase(BaseModel):
    image_url: str
    notes: Optional[str] = None


class ScanCreateRequest(ScanBase):
    pass


class AIAnalyzeRequest(BaseModel):
    image_url: str
    patient_id: str
    scan_id: str


class AIAnalyzeResponse(BaseModel):
    hemoglobin_level: float
    status: AnemiaStatus
    confidence: float
    processing_time_ms: int


class ScanResponse(ScanBase):
    id: str
    patient_id: str
    hemoglobin_estimate: Optional[float] = None
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    diagnosis: Optional[str] = None
    severity: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────
# Prescription Schemas
# ─────────────────────────────────────────────────────────────
class MedicationItem(BaseModel):
    name: str
    dosage: str
    duration: str
    instructions: str


class PrescriptionBase(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    diagnosis: str
    medications: List[MedicationItem]
    additional_notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class PrescriptionCreate(PrescriptionBase):
    pass


class PrescriptionResponse(PrescriptionBase):
    id: str
    doctor_id: str
    pdf_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────
# Video Consultation (LiveKit) Schemas
# ─────────────────────────────────────────────────────────────
class VideoTokenRequest(BaseModel):
    room: str
    identity: str


class VideoTokenResponse(BaseModel):
    token: str
    serverUrl: str
