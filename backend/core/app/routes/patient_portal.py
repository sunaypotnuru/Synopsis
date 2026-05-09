"""
Patient Portal Routes

API endpoints for patient portal features:
- Medication reminders
- Health goals
- Family accounts
- Document upload
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel, Field
from io import BytesIO

from app.core.security import get_current_user
from app.services.medication_reminder_service import get_medication_reminder_service
from app.services.health_goals_service import get_health_goals_service
from app.services.family_account_service import get_family_account_service
from app.services.document_service import get_document_service

router = APIRouter(prefix="/api/v1/patient", tags=["Patient Portal"])


# ============================================================================
# Request/Response Models
# ============================================================================


class MedicationCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    reminder_times: List[str] = []
    reminder_enabled: bool = True


class MedicationUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reminder_times: Optional[List[str]] = None
    reminder_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class MedicationLogCreate(BaseModel):
    medication_id: str
    scheduled_at: str
    status: str = Field(pattern="^(taken|missed|skipped)$")
    taken_at: Optional[str] = None
    notes: Optional[str] = None


class HealthGoalCreate(BaseModel):
    goal_type: str = Field(
        pattern="^(weight|exercise|diet|sleep|blood_pressure|blood_sugar|custom)$"
    )
    title: str
    description: Optional[str] = None
    target_value: float
    current_value: float
    unit: str
    start_date: str
    target_date: str


class HealthGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    target_date: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|abandoned)$")


class GoalProgressCreate(BaseModel):
    goal_id: str
    value: float
    notes: Optional[str] = None


class FamilyMemberAdd(BaseModel):
    member_email: Optional[str] = None
    member_name: Optional[str] = None
    relationship: str = Field(pattern="^(spouse|child|parent|sibling|other)$")
    can_view_records: bool = False
    can_book_appointments: bool = False
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None


class FamilyMemberUpdate(BaseModel):
    relationship: Optional[str] = Field(
        None, pattern="^(spouse|child|parent|sibling|other)$"
    )
    can_view_records: Optional[bool] = None
    can_book_appointments: Optional[bool] = None


class DocumentShare(BaseModel):
    document_id: str
    doctor_id: str


# ============================================================================
# Medication Reminders Endpoints
# ============================================================================


@router.post("/medications")
async def create_medication(
    medication_data: MedicationCreate, current_user: dict = Depends(get_current_user)
):
    """Create a medication reminder"""
    service = get_medication_reminder_service()
    medication = await service.create_medication(
        patient_id=current_user["id"], medication_data=medication_data.dict()
    )

    return medication


@router.get("/medications")
async def get_medications(
    is_active: Optional[bool] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get medications for patient"""
    service = get_medication_reminder_service()
    medications = await service.get_medications(
        patient_id=current_user["id"], is_active=is_active, limit=limit, offset=offset
    )

    return medications


@router.get("/medications/{medication_id}")
async def get_medication(
    medication_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single medication"""
    service = get_medication_reminder_service()
    medication = await service.get_medication(
        medication_id=medication_id, patient_id=current_user["id"]
    )

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    return medication


@router.put("/medications/{medication_id}")
async def update_medication(
    medication_id: str,
    update_data: MedicationUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a medication"""
    service = get_medication_reminder_service()
    medication = await service.update_medication(
        medication_id=medication_id,
        patient_id=current_user["id"],
        update_data=update_data.dict(exclude_unset=True),
    )

    return medication


@router.delete("/medications/{medication_id}")
async def delete_medication(
    medication_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a medication"""
    service = get_medication_reminder_service()
    success = await service.delete_medication(
        medication_id=medication_id, patient_id=current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Medication not found")

    return {"message": "Medication deleted successfully"}


@router.post("/medication-logs")
async def log_medication(
    log_data: MedicationLogCreate, current_user: dict = Depends(get_current_user)
):
    """Log medication intake"""
    service = get_medication_reminder_service()
    log = await service.log_medication(
        patient_id=current_user["id"], log_data=log_data.dict()
    )

    return log


@router.get("/medication-logs")
async def get_medication_logs(
    medication_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get medication logs"""
    service = get_medication_reminder_service()
    logs = await service.get_medication_logs(
        patient_id=current_user["id"],
        medication_id=medication_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        limit=limit,
        offset=offset,
    )

    return logs


@router.get("/medication-adherence")
async def get_medication_adherence(
    medication_id: Optional[str] = None, current_user: dict = Depends(get_current_user)
):
    """Get medication adherence statistics"""
    service = get_medication_reminder_service()
    adherence = await service.get_adherence_statistics(
        patient_id=current_user["id"], medication_id=medication_id
    )

    return {"adherence": adherence}


@router.get("/medications/upcoming")
async def get_upcoming_reminders(
    hours: int = Query(default=24, ge=1, le=168),
    current_user: dict = Depends(get_current_user),
):
    """Get upcoming medication reminders"""
    service = get_medication_reminder_service()
    reminders = await service.get_upcoming_reminders(
        patient_id=current_user["id"], hours=hours
    )

    return {"reminders": reminders}


# ============================================================================
# Health Goals Endpoints
# ============================================================================


@router.post("/health-goals")
async def create_health_goal(
    goal_data: HealthGoalCreate, current_user: dict = Depends(get_current_user)
):
    """Create a health goal"""
    service = get_health_goals_service()
    goal = await service.create_goal(
        patient_id=current_user["id"], goal_data=goal_data.dict()
    )

    return goal


@router.get("/health-goals")
async def get_health_goals(
    status: Optional[str] = None,
    goal_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get health goals"""
    service = get_health_goals_service()
    goals = await service.get_goals(
        patient_id=current_user["id"],
        status=status,
        goal_type=goal_type,
        limit=limit,
        offset=offset,
    )

    return goals


@router.get("/health-goals/{goal_id}")
async def get_health_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single health goal"""
    service = get_health_goals_service()
    goal = await service.get_goal(goal_id=goal_id, patient_id=current_user["id"])

    if not goal:
        raise HTTPException(status_code=404, detail="Health goal not found")

    return goal


@router.put("/health-goals/{goal_id}")
async def update_health_goal(
    goal_id: str,
    update_data: HealthGoalUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a health goal"""
    service = get_health_goals_service()
    goal = await service.update_goal(
        goal_id=goal_id,
        patient_id=current_user["id"],
        update_data=update_data.dict(exclude_unset=True),
    )

    return goal


@router.delete("/health-goals/{goal_id}")
async def delete_health_goal(
    goal_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a health goal"""
    service = get_health_goals_service()
    success = await service.delete_goal(goal_id=goal_id, patient_id=current_user["id"])

    if not success:
        raise HTTPException(status_code=404, detail="Health goal not found")

    return {"message": "Health goal deleted successfully"}


@router.post("/goal-progress")
async def log_goal_progress(
    progress_data: GoalProgressCreate, current_user: dict = Depends(get_current_user)
):
    """Log progress for a health goal"""
    service = get_health_goals_service()
    progress = await service.log_progress(
        patient_id=current_user["id"], progress_data=progress_data.dict()
    )

    return progress


@router.get("/goal-progress")
async def get_goal_progress(
    goal_id: str = Query(...),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get progress history for a goal"""
    service = get_health_goals_service()
    progress = await service.get_progress(
        goal_id=goal_id,
        patient_id=current_user["id"],
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return progress


@router.get("/goal-achievements")
async def get_goal_achievements(current_user: dict = Depends(get_current_user)):
    """Get all achievements"""
    service = get_health_goals_service()
    achievements = await service.get_achievements(patient_id=current_user["id"])

    return {"achievements": achievements}


@router.get("/health-goals/statistics")
async def get_goal_statistics(current_user: dict = Depends(get_current_user)):
    """Get goal statistics"""
    service = get_health_goals_service()
    statistics = await service.get_statistics(patient_id=current_user["id"])

    return statistics


# ============================================================================
# Family Accounts Endpoints
# ============================================================================


@router.get("/family-members")
async def get_family_members(current_user: dict = Depends(get_current_user)):
    """Get all family members"""
    service = get_family_account_service()
    members = await service.get_family_members(primary_user_id=current_user["id"])

    return members


@router.get("/family-members/{member_id}")
async def get_family_member(
    member_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single family member"""
    service = get_family_account_service()
    member = await service.get_family_member(
        member_id=member_id, primary_user_id=current_user["id"]
    )

    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    return member


@router.post("/family-members")
async def add_family_member(
    member_data: FamilyMemberAdd, current_user: dict = Depends(get_current_user)
):
    """Add a family member"""
    service = get_family_account_service()
    member = await service.add_family_member(
        primary_user_id=current_user["id"], member_data=member_data.dict()
    )

    return member


@router.put("/family-members/{member_id}")
async def update_family_member(
    member_id: str,
    update_data: FamilyMemberUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update family member permissions"""
    service = get_family_account_service()
    member = await service.update_family_member(
        member_id=member_id,
        primary_user_id=current_user["id"],
        update_data=update_data.dict(exclude_unset=True),
    )

    return member


@router.delete("/family-members/{member_id}")
async def remove_family_member(
    member_id: str, current_user: dict = Depends(get_current_user)
):
    """Remove a family member"""
    service = get_family_account_service()
    success = await service.remove_family_member(
        member_id=member_id, primary_user_id=current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Family member not found")

    return {"message": "Family member removed successfully"}


@router.get("/family-dashboard")
async def get_family_health_dashboard(current_user: dict = Depends(get_current_user)):
    """Get family health dashboard"""
    service = get_family_account_service()
    dashboard = await service.get_family_health_dashboard(
        primary_user_id=current_user["id"]
    )

    return dashboard


@router.post("/family-members/{member_id}/switch")
async def switch_to_family_member(
    member_id: str, current_user: dict = Depends(get_current_user)
):
    """Switch to family member account"""
    service = get_family_account_service()
    result = await service.switch_to_family_member(
        member_id=member_id, primary_user_id=current_user["id"]
    )

    return result


# ============================================================================
# Document Upload Endpoints
# ============================================================================


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Query(...),
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Upload a document"""
    service = get_document_service()

    # Read file content
    file_content = await file.read()
    file_obj = BytesIO(file_content)

    document = await service.upload_document(
        patient_id=current_user["id"],
        file=file_obj,
        file_name=file.filename,
        document_type=document_type,
        notes=notes,
    )

    return document


@router.get("/documents")
async def get_documents(
    document_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Get documents"""
    service = get_document_service()
    documents = await service.get_documents(
        patient_id=current_user["id"],
        document_type=document_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return documents


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    """Get a single document"""
    service = get_document_service()
    document = await service.get_document(
        document_id=document_id, patient_id=current_user["id"]
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.put("/documents/{document_id}")
async def update_document(
    document_id: str, update_data: dict, current_user: dict = Depends(get_current_user)
):
    """Update document metadata"""
    service = get_document_service()
    document = await service.update_document(
        document_id=document_id, patient_id=current_user["id"], update_data=update_data
    )

    return document


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    service = get_document_service()
    success = await service.delete_document(
        document_id=document_id, patient_id=current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"message": "Document deleted successfully"}


@router.post("/documents/share")
async def share_document(
    share_data: DocumentShare, current_user: dict = Depends(get_current_user)
):
    """Share document with doctor"""
    service = get_document_service()
    document = await service.share_document(
        document_id=share_data.document_id,
        patient_id=current_user["id"],
        doctor_id=share_data.doctor_id,
    )

    return document


@router.post("/documents/{document_id}/unshare")
async def unshare_document(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    """Unshare a document"""
    service = get_document_service()
    document = await service.unshare_document(
        document_id=document_id, patient_id=current_user["id"]
    )

    return document


@router.get("/documents/categories")
async def get_document_categories(current_user: dict = Depends(get_current_user)):
    """Get document categories with counts"""
    service = get_document_service()
    categories = await service.get_document_categories(patient_id=current_user["id"])

    return {"categories": categories}


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str, current_user: dict = Depends(get_current_user)
):
    """Download a document"""
    service = get_document_service()

    # Get document metadata
    document = await service.get_document(
        document_id=document_id, patient_id=current_user["id"]
    )

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Download file
    file_data = await service.download_document(
        document_id=document_id, patient_id=current_user["id"]
    )

    return StreamingResponse(
        BytesIO(file_data),
        media_type=document.get("file_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f"attachment; filename={document.get('file_name', 'document')}"
        },
    )


@router.get("/documents/statistics")
async def get_document_statistics(current_user: dict = Depends(get_current_user)):
    """Get document storage statistics"""
    service = get_document_service()
    statistics = await service.get_storage_statistics(patient_id=current_user["id"])

    return statistics
