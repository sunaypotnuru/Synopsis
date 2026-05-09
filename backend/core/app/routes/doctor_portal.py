"""
Doctor Portal Routes

API endpoints for doctor portal features:
- Earnings dashboard
- Clinical notes (SOAP format)
- Prescription templates
- Doctor analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.doctor_analytics_service import get_doctor_analytics_service
from app.services.clinical_notes_service import get_clinical_notes_service
from app.services.prescription_template_service import get_prescription_template_service

router = APIRouter(prefix="/api/v1/doctor", tags=["Doctor Portal"])


# ============================================================================
# Request/Response Models
# ============================================================================


class EarningsRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period: str = Field(default="month", pattern="^(day|week|month|year)$")


class ClinicalNoteCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    note_type: str = Field(default="soap", pattern="^(soap|progress|consultation)$")
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    content: Optional[str] = None
    template_id: Optional[str] = None
    is_ai_generated: bool = False


class ClinicalNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    content: Optional[str] = None


class NoteTemplateCreate(BaseModel):
    name: str
    note_type: str = Field(pattern="^(soap|progress|consultation)$")
    template_content: Dict[str, Any]
    is_favorite: bool = False


class PrescriptionTemplateCreate(BaseModel):
    name: str
    medication_name: str
    dosage: str
    frequency: str
    duration: Optional[str] = None
    instructions: Optional[str] = None
    is_favorite: bool = False


class PrescriptionTemplateUpdate(BaseModel):
    name: Optional[str] = None
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    is_favorite: Optional[bool] = None


class PrescriptionFromTemplate(BaseModel):
    template_id: str
    patient_id: str
    appointment_id: Optional[str] = None


# ============================================================================
# Earnings Dashboard Endpoints
# ============================================================================


@router.get("/earnings")
async def get_earnings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: str = Query(default="month", pattern="^(day|week|month|year)$"),
    current_user: dict = Depends(get_current_user),
):
    """Get earnings summary for doctor"""
    if current_user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access earnings")

    service = get_doctor_analytics_service()
    earnings = await service.get_earnings_summary(
        doctor_id=current_user["id"],
        start_date=start_date,
        end_date=end_date,
        period=period,
    )

    return earnings


@router.get("/statistics")
async def get_statistics(current_user: dict = Depends(get_current_user)):
    """Get overall statistics for doctor"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access statistics"
        )

    service = get_doctor_analytics_service()
    stats = await service.get_doctor_statistics(doctor_id=current_user["id"])

    return stats


# ============================================================================
# Clinical Notes Endpoints
# ============================================================================


@router.post("/clinical-notes")
async def create_clinical_note(
    note_data: ClinicalNoteCreate, current_user: dict = Depends(get_current_user)
):
    """Create a new clinical note"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can create clinical notes"
        )

    service = get_clinical_notes_service()
    note = await service.create_note(
        doctor_id=current_user["id"],
        patient_id=note_data.patient_id,
        note_data=note_data.dict(),
    )

    return note


@router.get("/clinical-notes")
async def get_clinical_notes(
    patient_id: Optional[str] = None,
    appointment_id: Optional[str] = None,
    note_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get clinical notes with filters"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access clinical notes"
        )

    service = get_clinical_notes_service()
    notes = await service.get_notes(
        doctor_id=current_user["id"],
        patient_id=patient_id,
        appointment_id=appointment_id,
        note_type=note_type,
        limit=limit,
        offset=offset,
    )

    return notes


@router.get("/clinical-notes/{note_id}")
async def get_clinical_note(
    note_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single clinical note"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access clinical notes"
        )

    service = get_clinical_notes_service()
    note = await service.get_note(note_id=note_id, doctor_id=current_user["id"])

    if not note:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    return note


@router.put("/clinical-notes/{note_id}")
async def update_clinical_note(
    note_id: str,
    update_data: ClinicalNoteUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a clinical note"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can update clinical notes"
        )

    service = get_clinical_notes_service()
    note = await service.update_note(
        note_id=note_id,
        doctor_id=current_user["id"],
        update_data=update_data.dict(exclude_unset=True),
    )

    return note


@router.delete("/clinical-notes/{note_id}")
async def delete_clinical_note(
    note_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a clinical note"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can delete clinical notes"
        )

    service = get_clinical_notes_service()
    success = await service.delete_note(note_id=note_id, doctor_id=current_user["id"])

    if not success:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    return {"message": "Clinical note deleted successfully"}


@router.get("/clinical-notes/search")
async def search_clinical_notes(
    query: str = Query(..., min_length=1),
    limit: int = Query(default=50, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Search clinical notes"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can search clinical notes"
        )

    service = get_clinical_notes_service()
    notes = await service.search_notes(
        doctor_id=current_user["id"], query=query, limit=limit
    )

    return {"notes": notes}


# ============================================================================
# Note Templates Endpoints
# ============================================================================


@router.post("/note-templates")
async def create_note_template(
    template_data: NoteTemplateCreate, current_user: dict = Depends(get_current_user)
):
    """Create a note template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can create note templates"
        )

    service = get_clinical_notes_service()
    template = await service.create_template(
        doctor_id=current_user["id"], template_data=template_data.dict()
    )

    return template


@router.get("/note-templates")
async def get_note_templates(
    note_type: Optional[str] = None, current_user: dict = Depends(get_current_user)
):
    """Get note templates"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access note templates"
        )

    service = get_clinical_notes_service()
    templates = await service.get_templates(
        doctor_id=current_user["id"], note_type=note_type
    )

    return {"templates": templates}


@router.put("/note-templates/{template_id}")
async def update_note_template(
    template_id: str, update_data: dict, current_user: dict = Depends(get_current_user)
):
    """Update a note template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can update note templates"
        )

    service = get_clinical_notes_service()
    template = await service.update_template(
        template_id=template_id, doctor_id=current_user["id"], update_data=update_data
    )

    return template


@router.delete("/note-templates/{template_id}")
async def delete_note_template(
    template_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a note template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can delete note templates"
        )

    service = get_clinical_notes_service()
    success = await service.delete_template(
        template_id=template_id, doctor_id=current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Note template not found")

    return {"message": "Note template deleted successfully"}


# ============================================================================
# Prescription Templates Endpoints
# ============================================================================


@router.post("/prescription-templates")
async def create_prescription_template(
    template_data: PrescriptionTemplateCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a prescription template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can create prescription templates"
        )

    service = get_prescription_template_service()
    template = await service.create_template(
        doctor_id=current_user["id"], template_data=template_data.dict()
    )

    return template


@router.get("/prescription-templates")
async def get_prescription_templates(
    is_favorite: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get prescription templates"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access prescription templates"
        )

    service = get_prescription_template_service()
    templates = await service.get_templates(
        doctor_id=current_user["id"],
        is_favorite=is_favorite,
        search=search,
        limit=limit,
        offset=offset,
    )

    return templates


@router.get("/prescription-templates/{template_id}")
async def get_prescription_template(
    template_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single prescription template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access prescription templates"
        )

    service = get_prescription_template_service()
    template = await service.get_template(
        template_id=template_id, doctor_id=current_user["id"]
    )

    if not template:
        raise HTTPException(status_code=404, detail="Prescription template not found")

    return template


@router.put("/prescription-templates/{template_id}")
async def update_prescription_template(
    template_id: str,
    update_data: PrescriptionTemplateUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a prescription template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can update prescription templates"
        )

    service = get_prescription_template_service()
    template = await service.update_template(
        template_id=template_id,
        doctor_id=current_user["id"],
        update_data=update_data.dict(exclude_unset=True),
    )

    return template


@router.delete("/prescription-templates/{template_id}")
async def delete_prescription_template(
    template_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a prescription template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can delete prescription templates"
        )

    service = get_prescription_template_service()
    success = await service.delete_template(
        template_id=template_id, doctor_id=current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Prescription template not found")

    return {"message": "Prescription template deleted successfully"}


@router.post("/prescription-templates/{template_id}/toggle-favorite")
async def toggle_template_favorite(
    template_id: str, current_user: dict = Depends(get_current_user)
):
    """Toggle favorite status of a template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can toggle template favorites"
        )

    service = get_prescription_template_service()
    template = await service.toggle_favorite(
        template_id=template_id, doctor_id=current_user["id"]
    )

    return template


@router.post("/prescriptions/from-template")
async def create_prescription_from_template(
    prescription_data: PrescriptionFromTemplate,
    current_user: dict = Depends(get_current_user),
):
    """Create a prescription from a template"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can create prescriptions"
        )

    service = get_prescription_template_service()
    prescription = await service.create_prescription_from_template(
        template_id=prescription_data.template_id,
        doctor_id=current_user["id"],
        patient_id=prescription_data.patient_id,
        appointment_id=prescription_data.appointment_id,
    )

    return prescription


# ============================================================================
# Doctor Analytics Endpoints
# ============================================================================


@router.get("/analytics")
async def get_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get comprehensive doctor analytics"""
    if current_user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access analytics")

    service = get_doctor_analytics_service()

    # Get all analytics data
    earnings = await service.get_earnings_summary(
        doctor_id=current_user["id"], start_date=start_date, end_date=end_date
    )

    statistics = await service.get_doctor_statistics(doctor_id=current_user["id"])
    demographics = await service.get_patient_demographics(doctor_id=current_user["id"])
    trends = await service.get_appointment_trends(doctor_id=current_user["id"])
    diagnoses = await service.get_common_diagnoses(doctor_id=current_user["id"])
    prescriptions = await service.get_prescription_patterns(
        doctor_id=current_user["id"]
    )

    return {
        "earnings": earnings,
        "statistics": statistics,
        "patient_demographics": demographics,
        "appointment_trends": trends,
        "common_diagnoses": diagnoses,
        "prescription_patterns": prescriptions,
    }


@router.get("/analytics/demographics")
async def get_patient_demographics(current_user: dict = Depends(get_current_user)):
    """Get patient demographics"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access demographics"
        )

    service = get_doctor_analytics_service()
    demographics = await service.get_patient_demographics(doctor_id=current_user["id"])

    return demographics


@router.get("/analytics/appointment-trends")
async def get_appointment_trends(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    """Get appointment trends"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access appointment trends"
        )

    service = get_doctor_analytics_service()
    trends = await service.get_appointment_trends(
        doctor_id=current_user["id"], days=days
    )

    return {"trends": trends}


@router.get("/analytics/common-diagnoses")
async def get_common_diagnoses(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get common diagnoses"""
    if current_user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access diagnoses")

    service = get_doctor_analytics_service()
    diagnoses = await service.get_common_diagnoses(
        doctor_id=current_user["id"], limit=limit
    )

    return {"diagnoses": diagnoses}


@router.get("/analytics/prescription-patterns")
async def get_prescription_patterns(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get prescription patterns"""
    if current_user.get("role") != "doctor":
        raise HTTPException(
            status_code=403, detail="Only doctors can access prescription patterns"
        )

    service = get_doctor_analytics_service()
    patterns = await service.get_prescription_patterns(
        doctor_id=current_user["id"], limit=limit
    )

    return {"patterns": patterns}
