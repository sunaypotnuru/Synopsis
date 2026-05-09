"""
Prescription Template Service

Manages prescription templates for quick prescribing:
- Create and manage templates
- Quick prescribe from templates
- Track template usage
- Favorite templates
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class PrescriptionTemplateService:
    """Service for managing prescription templates"""

    def __init__(self):
        self.supabase = supabase

    async def create_template(
        self, doctor_id: str, template_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a prescription template

        Args:
            doctor_id: Doctor's user ID
            template_data: Template data

        Returns:
            Created template data
        """
        template = {
            Col.PrescriptionTemplates.ID: str(uuid4()),
            Col.PrescriptionTemplates.DOCTOR_ID: doctor_id,
            Col.PrescriptionTemplates.NAME: template_data["name"],
            Col.PrescriptionTemplates.MEDICATION_NAME: template_data["medication_name"],
            Col.PrescriptionTemplates.DOSAGE: template_data["dosage"],
            Col.PrescriptionTemplates.FREQUENCY: template_data["frequency"],
            Col.PrescriptionTemplates.DURATION: template_data.get("duration"),
            Col.PrescriptionTemplates.INSTRUCTIONS: template_data.get("instructions"),
            Col.PrescriptionTemplates.IS_FAVORITE: template_data.get(
                "is_favorite", False
            ),
            Col.PrescriptionTemplates.USE_COUNT: 0,
            Col.PrescriptionTemplates.CREATED_AT: datetime.now().isoformat(),
            Col.PrescriptionTemplates.UPDATED_AT: datetime.now().isoformat(),
        }

        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .insert(template)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to create prescription template")

    async def get_template(
        self, template_id: str, doctor_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a prescription template by ID

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            Template data or None
        """
        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .select("*")
            .eq(Col.PrescriptionTemplates.ID, template_id)
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def get_templates(
        self,
        doctor_id: str,
        is_favorite: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get prescription templates with filters

        Args:
            doctor_id: Doctor's user ID
            is_favorite: Filter by favorite status
            search: Search by medication name
            limit: Maximum number of templates to return
            offset: Number of templates to skip

        Returns:
            Dictionary with templates and pagination info
        """
        query = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .select("*", count="exact")
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
        )

        if is_favorite is not None:
            query = query.eq(Col.PrescriptionTemplates.IS_FAVORITE, is_favorite)

        if search:
            query = query.ilike(
                Col.PrescriptionTemplates.MEDICATION_NAME, f"%{search}%"
            )

        query = query.order(Col.PrescriptionTemplates.IS_FAVORITE, desc=True)
        query = query.order(Col.PrescriptionTemplates.USE_COUNT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "templates": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def update_template(
        self, template_id: str, doctor_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a prescription template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated template data
        """
        update_data[Col.PrescriptionTemplates.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .update(update_data)
            .eq(Col.PrescriptionTemplates.ID, template_id)
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update prescription template")

    async def delete_template(self, template_id: str, doctor_id: str) -> bool:
        """
        Delete a prescription template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .delete()
            .eq(Col.PrescriptionTemplates.ID, template_id)
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
            .execute()
        )

        return bool(response.data)

    async def toggle_favorite(self, template_id: str, doctor_id: str) -> Dict[str, Any]:
        """
        Toggle favorite status of a template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID (for authorization)

        Returns:
            Updated template data
        """
        # Get current favorite status
        template = await self.get_template(template_id, doctor_id)

        if not template:
            raise Exception("Template not found")

        new_favorite_status = not template.get(
            Col.PrescriptionTemplates.IS_FAVORITE, False
        )

        return await self.update_template(
            template_id,
            doctor_id,
            {Col.PrescriptionTemplates.IS_FAVORITE: new_favorite_status},
        )

    async def increment_usage(self, template_id: str) -> None:
        """
        Increment template use count

        Args:
            template_id: Template ID
        """
        # Get current count
        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .select(Col.PrescriptionTemplates.USE_COUNT)
            .eq(Col.PrescriptionTemplates.ID, template_id)
            .execute()
        )

        if response.data:
            current_count = response.data[0].get(Col.PrescriptionTemplates.USE_COUNT, 0)

            # Update count
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES).update(
                {
                    Col.PrescriptionTemplates.USE_COUNT: current_count + 1,
                    Col.PrescriptionTemplates.UPDATED_AT: datetime.now().isoformat(),
                }
            ).eq(Col.PrescriptionTemplates.ID, template_id).execute()

    async def create_prescription_from_template(
        self,
        template_id: str,
        doctor_id: str,
        patient_id: str,
        appointment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a prescription from a template

        Args:
            template_id: Template ID
            doctor_id: Doctor's user ID
            patient_id: Patient's user ID
            appointment_id: Optional appointment ID

        Returns:
            Created prescription data
        """
        # Get template
        template = await self.get_template(template_id, doctor_id)

        if not template:
            raise Exception("Template not found")

        # Create prescription
        prescription = {
            Col.Prescriptions.ID: str(uuid4()),
            Col.Prescriptions.DOCTOR_ID: doctor_id,
            Col.Prescriptions.PATIENT_ID: patient_id,
            Col.Prescriptions.APPOINTMENT_ID: appointment_id,
            Col.Prescriptions.MEDICATIONS: [
                {
                    "name": template[Col.PrescriptionTemplates.MEDICATION_NAME],
                    "dosage": template[Col.PrescriptionTemplates.DOSAGE],
                    "frequency": template[Col.PrescriptionTemplates.FREQUENCY],
                    "duration": template.get(Col.PrescriptionTemplates.DURATION),
                    "instructions": template.get(
                        Col.PrescriptionTemplates.INSTRUCTIONS
                    ),
                }
            ],
            Col.Prescriptions.STATUS: "active",
            Col.Prescriptions.CREATED_AT: datetime.now().isoformat(),
            Col.Prescriptions.UPDATED_AT: datetime.now().isoformat(),
        }

        response = (
            self.supabase.table(Tables.PRESCRIPTIONS).insert(prescription).execute()
        )

        if response.data:
            # Increment template usage
            await self.increment_usage(template_id)
            return response.data[0]

        raise Exception("Failed to create prescription from template")

    async def get_popular_templates(
        self, doctor_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get most used templates

        Args:
            doctor_id: Doctor's user ID
            limit: Number of templates to return

        Returns:
            List of popular templates
        """
        response = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .select("*")
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
            .order(Col.PrescriptionTemplates.USE_COUNT, desc=True)
            .limit(limit)
            .execute()
        )

        return response.data if response.data else []


# Singleton instance
_prescription_template_service = None


def get_prescription_template_service() -> PrescriptionTemplateService:
    """Get or create prescription template service instance"""
    global _prescription_template_service
    if _prescription_template_service is None:
        _prescription_template_service = PrescriptionTemplateService()
    return _prescription_template_service
