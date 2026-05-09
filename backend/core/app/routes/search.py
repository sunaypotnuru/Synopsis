from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, List, Any
import logging
from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase as supabase_client
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class AdvancedSearchFilters(BaseModel):
    entity_type: Optional[str] = (
        None  # doctors, patients, appointments, scans, documents
    )
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"
    limit: Optional[int] = 50


@router.get("/global")
async def global_search(
    q: str = Query(..., min_length=2),
    current_user: TokenPayload = Depends(get_current_user),
):
    try:
        supabase = supabase_client
        user_id = current_user.sub
        role = current_user.role or "patient"

        # Determine user role if not in token
        if not role or role not in ["patient", "doctor", "admin"]:
            user_response = (
                supabase.table("profiles_patient")
                .select("id")
                .eq("id", user_id)
                .execute()
            )
            is_patient = len(user_response.data) > 0

            if not is_patient:
                doctor_response = (
                    supabase.table("profiles_doctor")
                    .select("id")
                    .eq("id", user_id)
                    .execute()
                )
                is_doctor = len(doctor_response.data) > 0
                if not is_doctor:
                    raise HTTPException(status_code=403, detail="User role not found")
                role = "doctor"
            else:
                role = "patient"

        results: Dict[str, List[Any]] = {
            "doctors": [],
            "patients": [],
            "appointments": [],
            "scans": [],
            "documents": [],
        }

        # Save search to search_history if table exists (optional based on schema)
        try:
            supabase.table("search_history").insert(
                {"user_id": user_id, "query": q, "role": role}
            ).execute()
        except Exception as e:
            logger.debug(f"Search history logging skipped (table may not exist): {e}")

        # Perform searches based on role
        if role == "patient":
            # 1. Search Doctors
            doc_query = (
                supabase.table("profiles_doctor")
                .select("*")
                .ilike("name", f"%{q}%")
                .execute()
            )
            results["doctors"] = doc_query.data

            # 2. Search Appointments
            appt_query = (
                supabase.table("appointments")
                .select("*, profiles_doctor(name)")
                .eq("patient_id", user_id)
                .execute()
            )
            # Filter in-memory for related fields since ilike on joined tables can be tricky in postgrest
            # OR we can try direct if Supabase supports it, but in-memory is safer for now.
            results["appointments"] = [
                a
                for a in appt_query.data
                if q.lower()
                in (a.get("profiles_doctor", {}).get("name", "") or "").lower()
                or q.lower() in (a.get("status", "") or "").lower()
            ]

            # 3. Search Scans
            scan_query = (
                supabase.table("scans")
                .select("*")
                .eq("patient_id", user_id)
                .ilike("prediction", f"%{q}%")
                .execute()
            )
            results["scans"] = scan_query.data

            # 4. Search Documents
            doc_files = (
                supabase.table("documents")
                .select("*")
                .eq("patient_id", user_id)
                .ilike("title", f"%{q}%")
                .execute()
            )
            results["documents"] = doc_files.data

        elif role == "doctor":
            # 1. Search Patients in appointments or just all patients they have access to
            # For simplicity, search all appointments of this doctor for patient name
            appt_query = (
                supabase.table("appointments")
                .select("*, profiles_patient(full_name)")
                .eq("doctor_id", user_id)
                .execute()
            )

            # Filter appointments
            results["appointments"] = [
                a
                for a in appt_query.data
                if q.lower()
                in (a.get("profiles_patient", {}).get("full_name", "") or "").lower()
                or q.lower() in (a.get("status", "") or "").lower()
            ]

            # Extract unique patients from these appointments that match query
            patients = {}
            for a in appt_query.data:
                patient = a.get("profiles_patient", {})
                if (
                    patient
                    and q.lower() in (patient.get("full_name", "") or "").lower()
                ):
                    patients[patient.get("id", "")] = patient
            results["patients"] = list(patients.values())

            # 3. Search Scans
            # Needs patient mapping or we just fetch all scans and filter if we have access
            scan_query = (
                supabase.table("scans")
                .select("*, profiles_patient(full_name)")
                .execute()
            )
            # In a real app we'd strict filter by doctor_id, let's assume no doctor_id in scans but we do it via patients
            results["scans"] = [
                s
                for s in scan_query.data
                if q.lower()
                in (s.get("profiles_patient", {}).get("full_name", "") or "").lower()
            ]

            # 4. Search Documents
            doc_files = (
                supabase.table("documents")
                .select("*")
                .eq("doctor_id", user_id)
                .ilike("title", f"%{q}%")
                .execute()
            )
            results["documents"] = doc_files.data

        return {"status": "success", "data": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/advanced")
async def advanced_search(
    q: str,
    filters: AdvancedSearchFilters,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Advanced search with filters for date range, status, category, sorting.
    """
    try:
        supabase = supabase_client
        user_id = current_user.sub
        role = current_user.role or "patient"

        results = {
            "doctors": [],
            "patients": [],
            "appointments": [],
            "scans": [],
            "documents": [],
            "total": 0,
        }

        # Apply entity type filter
        entity_types = (
            [filters.entity_type]
            if filters.entity_type
            else ["doctors", "patients", "appointments", "scans", "documents"]
        )

        for entity_type in entity_types:
            if entity_type == "doctors" and role in ["patient", "admin"]:
                query = supabase.table("profiles_doctor").select("*")
                if q:
                    query = query.or_(
                        f"full_name.ilike.%{q}%, specialization.ilike.%{q}%, bio.ilike.%{q}%"
                    )
                if filters.status:
                    query = query.eq("status", filters.status)
                query = query.order(
                    filters.sort_by, desc=(filters.sort_order == "desc")
                )
                query = query.limit(filters.limit)
                response = query.execute()
                results["doctors"] = response.data

            elif entity_type == "patients" and role in ["doctor", "admin"]:
                query = supabase.table("profiles_patient").select("*")
                if q:
                    query = query.ilike("full_name", f"%{q}%")
                query = query.order(
                    filters.sort_by, desc=(filters.sort_order == "desc")
                )
                query = query.limit(filters.limit)
                response = query.execute()
                results["patients"] = response.data

            elif entity_type == "appointments":
                query = supabase.table("appointments").select(
                    "*, profiles_doctor(full_name), profiles_patient(full_name)"
                )
                if role == "patient":
                    query = query.eq("patient_id", user_id)
                elif role == "doctor":
                    query = query.eq("doctor_id", user_id)

                if filters.status:
                    query = query.eq("status", filters.status)
                if filters.date_from:
                    query = query.gte("scheduled_at", filters.date_from)
                if filters.date_to:
                    query = query.lte("scheduled_at", filters.date_to)

                query = query.order(
                    filters.sort_by, desc=(filters.sort_order == "desc")
                )
                query = query.limit(filters.limit)
                response = query.execute()

                # Filter by search query in memory
                if q:
                    results["appointments"] = [
                        a for a in response.data if q.lower() in str(a).lower()
                    ]
                else:
                    results["appointments"] = response.data

            elif entity_type == "scans":
                query = supabase.table("scans").select("*, profiles_patient(full_name)")
                if role == "patient":
                    query = query.eq("patient_id", user_id)

                if filters.date_from:
                    query = query.gte("created_at", filters.date_from)
                if filters.date_to:
                    query = query.lte("created_at", filters.date_to)
                if filters.status:
                    query = query.eq("prediction", filters.status)

                query = query.order(
                    filters.sort_by, desc=(filters.sort_order == "desc")
                )
                query = query.limit(filters.limit)
                response = query.execute()

                if q:
                    results["scans"] = [
                        s for s in response.data if q.lower() in str(s).lower()
                    ]
                else:
                    results["scans"] = response.data

            elif entity_type == "documents":
                query = supabase.table("documents").select("*")
                if role == "patient":
                    query = query.eq("patient_id", user_id)
                elif role == "doctor":
                    query = query.eq("doctor_id", user_id)

                if q:
                    query = query.ilike("title", f"%{q}%")
                if filters.category:
                    query = query.eq("category", filters.category)
                if filters.date_from:
                    query = query.gte("created_at", filters.date_from)
                if filters.date_to:
                    query = query.lte("created_at", filters.date_to)

                query = query.order(
                    filters.sort_by, desc=(filters.sort_order == "desc")
                )
                query = query.limit(filters.limit)
                response = query.execute()
                results["documents"] = response.data

        # Calculate total — explicit loop avoids mypy generator/len typing issues
        total = 0
        for key in ["doctors", "patients", "appointments", "scans", "documents"]:
            val = results[key]
            if isinstance(val, list):
                total += len(val)
        results["total"] = total

        # Save search to history
        try:
            supabase.table("search_history").insert(
                {
                    "user_id": user_id,
                    "query": q,
                    "role": role,
                    "filters": filters.dict(),
                    "results_count": results["total"],
                }
            ).execute()
        except Exception as e:
            logger.debug(f"Search history logging skipped (table may not exist): {e}")

        return {"status": "success", "data": results, "filters_applied": filters.dict()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_search_history(
    limit: int = 10, current_user: TokenPayload = Depends(get_current_user)
):
    """Get user's search history."""
    try:
        supabase = supabase_client
        user_id = current_user.sub
        response = (
            supabase.table("search_history")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "success", "data": []}


@router.delete("/history/{search_id}")
async def delete_search_history(
    search_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Delete a search history entry."""
    try:
        supabase = supabase_client
        user_id = current_user.sub

        supabase.table("search_history").delete().eq("id", search_id).eq(
            "user_id", user_id
        ).execute()

        return {"status": "success", "message": "Search history deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/saved")
async def save_search(
    name: str,
    query: str,
    filters: AdvancedSearchFilters,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Save a search for quick access later."""
    try:
        supabase = supabase_client
        user_id = current_user.sub
        response = (
            supabase.table("saved_searches")
            .insert(
                {
                    "user_id": user_id,
                    "name": name,
                    "query": query,
                    "filters": filters.dict(),
                }
            )
            .execute()
        )

        return {
            "status": "success",
            "data": response.data[0] if response.data else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved")
async def get_saved_searches(current_user: TokenPayload = Depends(get_current_user)):
    """Get user's saved searches."""
    try:
        supabase = supabase_client
        user_id = current_user.sub
        response = (
            supabase.table("saved_searches")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return {"status": "success", "data": response.data}
    except Exception:
        return {"status": "success", "data": []}
