"""
Clinical Notes Service

Manages clinical notes with SOAP format support:
- Subjective: Patient's symptoms and complaints
- Objective: Observable findings and measurements
- Assessment: Diagnosis and clinical impression
- Plan: Treatment plan and follow-up
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class ClinicalNotesService:
    """Service for managing clinical notes"""

    def __init__(self):
        self.supabase = supabase

    async def create_note(
        self, doctor_id: str, patient_id: str, note_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new clinical note

        Args:
            doctor_id: Doctor's user ID
            patient_id: Patient's user ID
            note_data: Note data including SOAP fields

        Returns:
            Created note data
        """
        note = {
            Col.ClinicalNotes.ID: str(uuid4()),
            Col.ClinicalNotes.DOCTOR_ID: doctor_id,
            Col.ClinicalNotes.PATIENT_ID: patient_id,
            Col.ClinicalNotes.APPOINTMENT_ID: note_data.get("appointment_id"),
            Col.ClinicalNotes.NOTE_TYPE: note_data.get("note_type", "soap"),
            Col.ClinicalNotes.SUBJECTIVE: note_data.get("subjective"),
            Col.ClinicalNotes.OBJECTIVE: note_data.get("objective"),
            Col.ClinicalNotes.ASSESSMENT: note_data.get("assessment"),
            Col.ClinicalNotes.PLAN: note_data.get("plan"),
            Col.ClinicalNotes.CONTENT: note_data.get("content"),
            Col.ClinicalNotes.TEMPLATE_ID: note_data.get("template_id"),
            Col.ClinicalNotes.IS_AI_GENERATED: note_data.get("is_ai_generated", False),
            Col.ClinicalNotes.CREATED_AT: datetime.now().isoformat(),
            Col.ClinicalNotes.UPDATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.CLINICAL_NOTES).insert(note).execute()

        if response.data:
            return response.data[0]

        raise Exception("Failed to create clinical note")

    async def get_note(self, note_id: str, doctor_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a clinical note by ID

        Args:
            note_id: Note ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            Note data or None
        """
        response = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .select("*")
            .eq(Col.ClinicalNotes.ID, note_id)
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def get_notes(
        self,
        doctor_id: str,
        patient_id: Optional[str] = None,
        appointment_id: Optional[str] = None,
        note_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get clinical notes with filters

        Args:
            doctor_id: Doctor's user ID
            patient_id: Filter by patient ID
            appointment_id: Filter by appointment ID
            note_type: Filter by note type
            limit: Maximum number of notes to return
            offset: Number of notes to skip

        Returns:
            Dictionary with notes and pagination info
        """
        query = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .select("*", count="exact")
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
        )

        if patient_id:
            query = query.eq(Col.ClinicalNotes.PATIENT_ID, patient_id)

        if appointment_id:
            query = query.eq(Col.ClinicalNotes.APPOINTMENT_ID, appointment_id)

        if note_type:
            query = query.eq(Col.ClinicalNotes.NOTE_TYPE, note_type)

        query = query.order(Col.ClinicalNotes.CREATED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "notes": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def update_note(
        self, note_id: str, doctor_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a clinical note

        Args:
            note_id: Note ID
            doctor_id: Doctor's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated note data
        """
        # Add updated_at timestamp
        update_data[Col.ClinicalNotes.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .update(update_data)
            .eq(Col.ClinicalNotes.ID, note_id)
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update clinical note")

    async def delete_note(self, note_id: str, doctor_id: str) -> bool:
        """
        Delete a clinical note

        Args:
            note_id: Note ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        response = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .delete()
            .eq(Col.ClinicalNotes.ID, note_id)
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
            .execute()
        )

        return bool(response.data)

    async def search_notes(
        self, doctor_id: str, query: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search clinical notes by content

        Args:
            doctor_id: Doctor's user ID
            query: Search query
            limit: Maximum number of results

        Returns:
            List of matching notes
        """
        # Search in multiple fields
        response = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .select("*")
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
            .or_(
                f"{Col.ClinicalNotes.SUBJECTIVE}.ilike.%{query}%,"
                f"{Col.ClinicalNotes.OBJECTIVE}.ilike.%{query}%,"
                f"{Col.ClinicalNotes.ASSESSMENT}.ilike.%{query}%,"
                f"{Col.ClinicalNotes.PLAN}.ilike.%{query}%,"
                f"{Col.ClinicalNotes.CONTENT}.ilike.%{query}%"
            )
            .order(Col.ClinicalNotes.CREATED_AT, desc=True)
            .limit(limit)
            .execute()
        )

        return response.data if response.data else []

    # ─── Note Templates ─────────────────────────────────────────────────────

    async def create_template(
        self, doctor_id: str, template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a note template

        Args:
            doctor_id: Doctor's user ID
            template_data: Template data

        Returns:
            Created template data
        """
        template = {
            Col.NoteTemplates.ID: str(uuid4()),
            Col.NoteTemplates.DOCTOR_ID: doctor_id,
            Col.NoteTemplates.NAME: template_data["name"],
            Col.NoteTemplates.NOTE_TYPE: template_data.get("note_type", "soap"),
            Col.NoteTemplates.TEMPLATE_CONTENT: template_data["template_content"],
            Col.NoteTemplates.IS_FAVORITE: template_data.get("is_favorite", False),
            Col.NoteTemplates.USE_COUNT: 0,
            Col.NoteTemplates.CREATED_AT: datetime.now().isoformat(),
            Col.NoteTemplates.UPDATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.NOTE_TEMPLATES).insert(template).execute()

        if response.data:
            return response.data[0]

        raise Exception("Failed to create note template")

    async def get_templates(
        self, doctor_id: str, note_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get note templates for a doctor

        Args:
            doctor_id: Doctor's user ID
            note_type: Filter by note type

        Returns:
            List of templates
        """
        query = (
            self.supabase.table(Tables.NOTE_TEMPLATES)
            .select("*")
            .eq(Col.NoteTemplates.DOCTOR_ID, doctor_id)
        )

        if note_type:
            query = query.eq(Col.NoteTemplates.NOTE_TYPE, note_type)

        query = query.order(Col.NoteTemplates.IS_FAVORITE, desc=True)
        query = query.order(Col.NoteTemplates.USE_COUNT, desc=True)

        response = query.execute()

        return response.data if response.data else []

    async def update_template(
        self, template_id: str, doctor_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a note template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated template data
        """
        update_data[Col.NoteTemplates.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.NOTE_TEMPLATES)
            .update(update_data)
            .eq(Col.NoteTemplates.ID, template_id)
            .eq(Col.NoteTemplates.DOCTOR_ID, doctor_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update note template")

    async def delete_template(self, template_id: str, doctor_id: str) -> bool:
        """
        Delete a note template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        response = (
            self.supabase.table(Tables.NOTE_TEMPLATES)
            .delete()
            .eq(Col.NoteTemplates.ID, template_id)
            .eq(Col.NoteTemplates.DOCTOR_ID, doctor_id)
            .execute()
        )

        return bool(response.data)

    async def increment_template_usage(self, template_id: str) -> None:
        """
        Increment template use count

        Args:
            template_id: Template ID
        """
        # Get current count
        response = (
            self.supabase.table(Tables.NOTE_TEMPLATES)
            .select(Col.NoteTemplates.USE_COUNT)
            .eq(Col.NoteTemplates.ID, template_id)
            .execute()
        )

        if response.data:
            current_count = response.data[0].get(Col.NoteTemplates.USE_COUNT, 0)

            # Update count
            self.supabase.table(Tables.NOTE_TEMPLATES).update(
                {Col.NoteTemplates.USE_COUNT: current_count + 1}
            ).eq(Col.NoteTemplates.ID, template_id).execute()


# Singleton instance
_clinical_notes_service = None


def get_clinical_notes_service() -> ClinicalNotesService:
    """Get or create clinical notes service instance"""
    global _clinical_notes_service
    if _clinical_notes_service is None:
        _clinical_notes_service = ClinicalNotesService()
    return _clinical_notes_service
