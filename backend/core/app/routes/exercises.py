"""
AR Physical Therapy — Exercise Management & Session Tracking.

Provides:
  - CRUD for exercises (admin/doctor)
  - Exercise assignment to patients
  - Session logging and progress tracking
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.security import get_current_user
from app.services.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exercises", tags=["AR Physical Therapy"])


# ─── Schemas ─────────────────────────────────────────────


class ExerciseCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = "general"
    target_joints: Optional[list] = []
    difficulty: Optional[str] = "beginner"
    duration_seconds: Optional[int] = 60
    instructions: Optional[str] = ""


class ExerciseAssign(BaseModel):
    patient_id: str
    exercise_id: str
    prescribed_reps: Optional[int] = 10
    prescribed_sets: Optional[int] = 3
    notes: Optional[str] = ""


class SessionLog(BaseModel):
    patient_exercise_id: str
    reps_completed: int = 0
    sets_completed: int = 0
    duration_seconds: int = 0
    accuracy_percent: Optional[float] = 0.0
    pain_level: Optional[int] = 0
    notes: Optional[str] = ""
    joint_data: Optional[dict] = None


# ─── Exercise CRUD (Doctor/Admin) ────────────────────────


@router.get("")
async def list_exercises(user=Depends(get_current_user)):
    """List all available exercises."""
    try:
        res = (
            supabase.table("exercises")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error listing exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_exercise(body: ExerciseCreate, user=Depends(get_current_user)):
    """Create a new exercise definition."""
    role = user.get("role") if isinstance(user, dict) else getattr(user, "role", None)
    if role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=403, detail="Only doctors and admins can create exercises"
        )
    try:
        data = {
            "name": body.name,
            "description": body.description,
            "category": body.category,
            "target_joints": body.target_joints,
            "difficulty": body.difficulty,
            "duration_seconds": body.duration_seconds,
            "instructions": body.instructions,
            "created_by": (
                user.get("sub")
                if isinstance(user, dict)
                else getattr(user, "sub", None)
            ),
        }
        res = supabase.table("exercises").insert(data).execute()
        return res.data[0] if res.data else data
    except Exception as e:
        logger.error(f"Error creating exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{exercise_id}")
async def update_exercise(
    exercise_id: str, body: ExerciseCreate, user=Depends(get_current_user)
):
    """Update an existing exercise."""
    role = user.get("role") if isinstance(user, dict) else getattr(user, "role", None)
    if role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=403, detail="Only doctors and admins can update exercises"
        )
    try:
        data = body.model_dump(exclude_unset=True)
        res = supabase.table("exercises").update(data).eq("id", exercise_id).execute()
        return res.data[0] if res.data else {"id": exercise_id, **data}
    except Exception as e:
        logger.error(f"Error updating exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{exercise_id}")
async def delete_exercise(exercise_id: str, user=Depends(get_current_user)):
    """Delete an exercise."""
    role = user.get("role") if isinstance(user, dict) else getattr(user, "role", None)
    if role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=403, detail="Only doctors and admins can delete exercises"
        )
    try:
        supabase.table("exercises").delete().eq("id", exercise_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Exercise Assignments ────────────────────────────────


@router.post("/assign")
async def assign_exercise(body: ExerciseAssign, user=Depends(get_current_user)):
    """Assign an exercise to a patient."""
    role = user.get("role") if isinstance(user, dict) else getattr(user, "role", None)
    if role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors can assign exercises")
    try:
        data = {
            "patient_id": body.patient_id,
            "exercise_id": body.exercise_id,
            "prescribed_reps": body.prescribed_reps,
            "prescribed_sets": body.prescribed_sets,
            "notes": body.notes,
            "assigned_by": (
                user.get("sub")
                if isinstance(user, dict)
                else getattr(user, "sub", None)
            ),
            "status": "active",
        }
        res = supabase.table("patient_exercises").insert(data).execute()
        return res.data[0] if res.data else data
    except Exception as e:
        logger.error(f"Error assigning exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-exercises")
async def get_my_exercises(user=Depends(get_current_user)):
    """Get exercises assigned to the current patient."""
    uid = user.get("sub") if isinstance(user, dict) else getattr(user, "sub", None)
    try:
        # Prefer joined payload (requires FK relationship in Supabase).
        try:
            res = (
                supabase.table("patient_exercises")
                .select("*, exercises(*)")
                .eq("patient_id", uid)
                .eq("status", "active")
                .execute()
            )
            return res.data or []
        except Exception:
            # Fallback: return assignments only (schema-safe until DB is rebuilt)
            res = (
                supabase.table("patient_exercises")
                .select("*")
                .eq("patient_id", uid)
                .eq("status", "active")
                .execute()
            )
            return res.data or []
    except Exception as e:
        logger.error(f"Error fetching patient exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient/{patient_id}")
async def get_patient_exercises(patient_id: str, user=Depends(get_current_user)):
    """Get exercises assigned to a specific patient (doctor view)."""
    try:
        try:
            res = (
                supabase.table("patient_exercises")
                .select("*, exercises(*)")
                .eq("patient_id", patient_id)
                .execute()
            )
            return res.data or []
        except Exception:
            res = (
                supabase.table("patient_exercises")
                .select("*")
                .eq("patient_id", patient_id)
                .execute()
            )
            return res.data or []
    except Exception as e:
        logger.error(f"Error fetching patient exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Session Logging ─────────────────────────────────────


@router.post("/sessions")
async def log_session(body: SessionLog, user=Depends(get_current_user)):
    """Log a completed exercise session."""
    uid = user.get("sub") if isinstance(user, dict) else getattr(user, "sub", None)
    try:
        data = {
            "patient_exercise_id": body.patient_exercise_id,
            "patient_id": uid,
            "reps_completed": body.reps_completed,
            "sets_completed": body.sets_completed,
            "duration_seconds": body.duration_seconds,
            "accuracy_percent": body.accuracy_percent,
            "pain_level": body.pain_level,
            "notes": body.notes,
            "joint_data": body.joint_data,
        }
        res = supabase.table("exercise_sessions").insert(data).execute()
        return res.data[0] if res.data else data
    except Exception as e:
        logger.error(f"Error logging session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{patient_exercise_id}")
async def get_sessions(patient_exercise_id: str, user=Depends(get_current_user)):
    """Get all sessions for a specific exercise assignment."""
    try:
        res = (
            supabase.table("exercise_sessions")
            .select("*")
            .eq("patient_exercise_id", patient_exercise_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress")
async def get_progress(user=Depends(get_current_user)):
    """Get overall exercise progress for the current patient."""
    uid = user.get("sub") if isinstance(user, dict) else getattr(user, "sub", None)
    try:
        # Get all sessions
        sessions_res = (
            supabase.table("exercise_sessions")
            .select("*")
            .eq("patient_id", uid)
            .order("created_at", desc=True)
            .limit(100)
            .execute()
        )
        sessions = sessions_res.data or []

        total_sessions = len(sessions)
        total_duration = sum(s.get("duration_seconds", 0) for s in sessions)
        avg_accuracy = (
            (sum(s.get("accuracy_percent", 0) for s in sessions) / total_sessions)
            if total_sessions > 0
            else 0
        )

        return {
            "total_sessions": total_sessions,
            "total_duration_minutes": round(total_duration / 60, 1),
            "average_accuracy": round(avg_accuracy, 1),
            "recent_sessions": sessions[:10],
        }
    except Exception as e:
        logger.error(f"Error fetching progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))
