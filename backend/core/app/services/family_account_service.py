"""
Family Account Service

Manages family accounts and access control:
- Add and manage family members
- Control access permissions
- Switch between accounts
- Family health dashboard
"""

from datetime import datetime
from typing import Dict, Optional, Any
from uuid import uuid4

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class FamilyAccountService:
    """Service for managing family accounts"""

    def __init__(self):
        self.supabase = supabase

    async def get_family_members(self, primary_user_id: str) -> Dict[str, Any]:
        """
        Get all family members for a primary user

        Args:
            primary_user_id: Primary user's ID

        Returns:
            Dictionary with family members
        """
        response = (
            self.supabase.table(Tables.FAMILY_MEMBERS)
            .select("*")
            .eq(Col.FamilyMembers.PRIMARY_USER_ID, primary_user_id)
            .order(Col.FamilyMembers.CREATED_AT, desc=True)
            .execute()
        )

        members = response.data if response.data else []

        # Enrich with member user data if member_user_id exists
        enriched_members = []
        for member in members:
            member_user_id = member.get(Col.FamilyMembers.MEMBER_USER_ID)

            if member_user_id:
                # Get member user profile
                user_response = (
                    self.supabase.table(Tables.PROFILES_PATIENT)
                    .select("*")
                    .eq(Col.ProfilesPatient.ID, member_user_id)
                    .execute()
                )

                if user_response.data:
                    member["member"] = {
                        "id": user_response.data[0][Col.ProfilesPatient.ID],
                        "name": user_response.data[0][Col.ProfilesPatient.FULL_NAME],
                        "email": user_response.data[0][Col.ProfilesPatient.EMAIL],
                        "age": user_response.data[0].get(Col.ProfilesPatient.AGE),
                        "gender": user_response.data[0].get(Col.ProfilesPatient.GENDER),
                    }

            enriched_members.append(member)

        return {"members": enriched_members, "total": len(enriched_members)}

    async def get_family_member(
        self, member_id: str, primary_user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single family member

        Args:
            member_id: Family member ID
            primary_user_id: Primary user's ID (for authorization)

        Returns:
            Family member data or None
        """
        response = (
            self.supabase.table(Tables.FAMILY_MEMBERS)
            .select("*")
            .eq(Col.FamilyMembers.ID, member_id)
            .eq(Col.FamilyMembers.PRIMARY_USER_ID, primary_user_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def add_family_member(
        self, primary_user_id: str, member_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Add a family member

        Args:
            primary_user_id: Primary user's ID
            member_data: Family member data

        Returns:
            Created family member data
        """
        # Check if adding existing user or creating dependent
        member_email = member_data.get("member_email")
        member_user_id = None

        if member_email:
            # Look up existing user by email
            user_response = (
                self.supabase.table(Tables.PROFILES_PATIENT)
                .select("*")
                .eq(Col.ProfilesPatient.EMAIL, member_email)
                .execute()
            )

            if user_response.data:
                member_user_id = user_response.data[0][Col.ProfilesPatient.ID]

        # Create family member record
        family_member = {
            Col.FamilyMembers.ID: str(uuid4()),
            Col.FamilyMembers.PRIMARY_USER_ID: primary_user_id,
            Col.FamilyMembers.MEMBER_USER_ID: member_user_id,
            Col.FamilyMembers.NAME: member_data.get("member_name", ""),
            Col.FamilyMembers.RELATIONSHIP: member_data["relationship"],
            Col.FamilyMembers.CAN_VIEW_RECORDS: member_data.get(
                "can_view_records", False
            ),
            Col.FamilyMembers.CAN_BOOK_APPOINTMENTS: member_data.get(
                "can_book_appointments", False
            ),
            Col.FamilyMembers.DATE_OF_BIRTH: member_data.get("date_of_birth"),
            Col.FamilyMembers.GENDER: member_data.get("gender"),
            Col.FamilyMembers.EMAIL: member_email,
            Col.FamilyMembers.CREATED_AT: datetime.now().isoformat(),
            Col.FamilyMembers.UPDATED_AT: datetime.now().isoformat(),
        }

        response = (
            self.supabase.table(Tables.FAMILY_MEMBERS).insert(family_member).execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to add family member")

    async def update_family_member(
        self, member_id: str, primary_user_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update family member permissions

        Args:
            member_id: Family member ID
            primary_user_id: Primary user's ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated family member data
        """
        update_data[Col.FamilyMembers.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.FAMILY_MEMBERS)
            .update(update_data)
            .eq(Col.FamilyMembers.ID, member_id)
            .eq(Col.FamilyMembers.PRIMARY_USER_ID, primary_user_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update family member")

    async def remove_family_member(self, member_id: str, primary_user_id: str) -> bool:
        """
        Remove a family member

        Args:
            member_id: Family member ID
            primary_user_id: Primary user's ID (for authorization)

        Returns:
            True if removed successfully
        """
        response = (
            self.supabase.table(Tables.FAMILY_MEMBERS)
            .delete()
            .eq(Col.FamilyMembers.ID, member_id)
            .eq(Col.FamilyMembers.PRIMARY_USER_ID, primary_user_id)
            .execute()
        )

        return bool(response.data)

    async def get_family_health_dashboard(self, primary_user_id: str) -> Dict[str, Any]:
        """
        Get family health dashboard with overview

        Args:
            primary_user_id: Primary user's ID

        Returns:
            Dictionary with family health data
        """
        # Get family members
        family_response = await self.get_family_members(primary_user_id)
        members = family_response["members"]

        family_data = []
        total_appointments = 0
        total_medications = 0

        for member in members:
            member_user_id = member.get(Col.FamilyMembers.MEMBER_USER_ID)

            if member_user_id:
                # Get upcoming appointments
                appointments_response = (
                    self.supabase.table(Tables.APPOINTMENTS)
                    .select("*", count="exact")
                    .eq(Col.Appointments.PATIENT_ID, member_user_id)
                    .eq(Col.Appointments.STATUS, "scheduled")
                    .gte(Col.Appointments.SCHEDULED_AT, datetime.now().isoformat())
                    .execute()
                )
                upcoming_appointments = appointments_response.count or 0

                # Get active medications
                medications_response = (
                    self.supabase.table(Tables.MEDICATIONS)
                    .select("*", count="exact")
                    .eq(Col.Medications.PATIENT_ID, member_user_id)
                    .eq(Col.Medications.IS_ACTIVE, True)
                    .execute()
                )
                active_medications = medications_response.count or 0

                # Get active health goals
                goals_response = (
                    self.supabase.table(Tables.HEALTH_GOALS)
                    .select("*", count="exact")
                    .eq(Col.HealthGoals.PATIENT_ID, member_user_id)
                    .eq(Col.HealthGoals.STATUS, "active")
                    .execute()
                )
                active_goals = goals_response.count or 0

                # Get last checkup
                last_appointment_response = (
                    self.supabase.table(Tables.APPOINTMENTS)
                    .select(Col.Appointments.SCHEDULED_AT)
                    .eq(Col.Appointments.PATIENT_ID, member_user_id)
                    .eq(Col.Appointments.STATUS, "completed")
                    .order(Col.Appointments.SCHEDULED_AT, desc=True)
                    .limit(1)
                    .execute()
                )
                last_checkup = None
                if last_appointment_response.data:
                    last_checkup = last_appointment_response.data[0][
                        Col.Appointments.SCHEDULED_AT
                    ]

                total_appointments += upcoming_appointments
                total_medications += active_medications

                family_data.append(
                    {
                        "member": member,
                        "upcoming_appointments": upcoming_appointments,
                        "active_medications": active_medications,
                        "active_goals": active_goals,
                        "last_checkup": last_checkup,
                    }
                )
            else:
                # Dependent without user account
                family_data.append(
                    {
                        "member": member,
                        "upcoming_appointments": 0,
                        "active_medications": 0,
                        "active_goals": 0,
                        "last_checkup": None,
                    }
                )

        return {
            "family_members": family_data,
            "total_members": len(members),
            "total_appointments": total_appointments,
            "total_medications": total_medications,
        }

    async def switch_to_family_member(
        self, member_id: str, primary_user_id: str
    ) -> Dict[str, Any]:
        """
        Switch to family member account (for authorized users)

        Args:
            member_id: Family member ID
            primary_user_id: Primary user's ID (for authorization)

        Returns:
            Dictionary with member data and access token
        """
        # Get family member
        member = await self.get_family_member(member_id, primary_user_id)

        if not member:
            raise Exception("Family member not found")

        # Check if user has permission to switch
        if not member.get(Col.FamilyMembers.CAN_VIEW_RECORDS):
            raise Exception("No permission to access this family member's records")

        member_user_id = member.get(Col.FamilyMembers.MEMBER_USER_ID)

        if not member_user_id:
            raise Exception("Family member does not have a user account")

        # In production, generate a temporary access token
        # For now, return member data
        return {
            "member": member,
            "access_token": f"temp_token_{member_user_id}",  # Replace with real token generation
        }


# Singleton instance
_family_account_service = None


def get_family_account_service() -> FamilyAccountService:
    """Get or create family account service instance"""
    global _family_account_service
    if _family_account_service is None:
        _family_account_service = FamilyAccountService()
    return _family_account_service
