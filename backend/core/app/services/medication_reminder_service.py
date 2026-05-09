"""
Medication Reminder Service

Manages medication reminders and adherence tracking:
- Create and manage medication schedules
- Track medication intake
- Calculate adherence rates
- Send reminder notifications
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class MedicationReminderService:
    """Service for managing medication reminders"""

    def __init__(self):
        self.supabase = supabase

    async def create_medication(
        self, patient_id: str, medication_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a medication reminder

        Args:
            patient_id: Patient's user ID
            medication_data: Medication data

        Returns:
            Created medication data
        """
        medication = {
            Col.Medications.ID: str(uuid4()),
            Col.Medications.PATIENT_ID: patient_id,
            Col.Medications.NAME: medication_data["medication_name"],
            Col.Medications.DOSAGE: medication_data["dosage"],
            Col.Medications.FREQUENCY: medication_data["frequency"],
            Col.Medications.START_DATE: medication_data["start_date"],
            Col.Medications.END_DATE: medication_data.get("end_date"),
            Col.Medications.REMINDER_TIMES: medication_data.get("reminder_times", []),
            Col.Medications.REMINDER_ENABLED: medication_data.get(
                "reminder_enabled", True
            ),
            Col.Medications.IS_ACTIVE: True,
            Col.Medications.ADHERENCE_RATE: 0.0,
            Col.Medications.CREATED_AT: datetime.now().isoformat(),
            Col.Medications.UPDATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.MEDICATIONS).insert(medication).execute()

        if response.data:
            return response.data[0]

        raise Exception("Failed to create medication")

    async def get_medication(
        self, medication_id: str, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a medication by ID

        Args:
            medication_id: Medication ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            Medication data or None
        """
        response = (
            self.supabase.table(Tables.MEDICATIONS)
            .select("*")
            .eq(Col.Medications.ID, medication_id)
            .eq(Col.Medications.PATIENT_ID, patient_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def get_medications(
        self,
        patient_id: str,
        is_active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get medications for a patient

        Args:
            patient_id: Patient's user ID
            is_active: Filter by active status
            limit: Maximum number of medications to return
            offset: Number of medications to skip

        Returns:
            Dictionary with medications and pagination info
        """
        query = (
            self.supabase.table(Tables.MEDICATIONS)
            .select("*", count="exact")
            .eq(Col.Medications.PATIENT_ID, patient_id)
        )

        if is_active is not None:
            query = query.eq(Col.Medications.IS_ACTIVE, is_active)

        query = query.order(Col.Medications.CREATED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "medications": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def update_medication(
        self, medication_id: str, patient_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a medication

        Args:
            medication_id: Medication ID
            patient_id: Patient's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated medication data
        """
        update_data[Col.Medications.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.MEDICATIONS)
            .update(update_data)
            .eq(Col.Medications.ID, medication_id)
            .eq(Col.Medications.PATIENT_ID, patient_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update medication")

    async def delete_medication(self, medication_id: str, patient_id: str) -> bool:
        """
        Delete a medication

        Args:
            medication_id: Medication ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        response = (
            self.supabase.table(Tables.MEDICATIONS)
            .delete()
            .eq(Col.Medications.ID, medication_id)
            .eq(Col.Medications.PATIENT_ID, patient_id)
            .execute()
        )

        return bool(response.data)

    # ─── Medication Logs ────────────────────────────────────────────────────

    async def log_medication(
        self, patient_id: str, log_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Log medication intake

        Args:
            patient_id: Patient's user ID
            log_data: Log data

        Returns:
            Created log data
        """
        log = {
            Col.MedicationLogs.ID: str(uuid4()),
            Col.MedicationLogs.MEDICATION_ID: log_data["medication_id"],
            Col.MedicationLogs.PATIENT_ID: patient_id,
            Col.MedicationLogs.SCHEDULED_AT: log_data["scheduled_at"],
            Col.MedicationLogs.TAKEN_AT: log_data.get("taken_at"),
            Col.MedicationLogs.STATUS: log_data[
                "status"
            ],  # 'taken', 'missed', 'skipped'
            Col.MedicationLogs.NOTES: log_data.get("notes"),
            Col.MedicationLogs.CREATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.MEDICATION_LOGS).insert(log).execute()

        if response.data:
            # Adherence rate will be updated by database trigger
            return response.data[0]

        raise Exception("Failed to log medication")

    async def get_medication_logs(
        self,
        patient_id: str,
        medication_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get medication logs

        Args:
            patient_id: Patient's user ID
            medication_id: Filter by medication ID
            start_date: Filter by start date
            end_date: Filter by end date
            status: Filter by status
            limit: Maximum number of logs to return
            offset: Number of logs to skip

        Returns:
            Dictionary with logs and pagination info
        """
        query = (
            self.supabase.table(Tables.MEDICATION_LOGS)
            .select("*", count="exact")
            .eq(Col.MedicationLogs.PATIENT_ID, patient_id)
        )

        if medication_id:
            query = query.eq(Col.MedicationLogs.MEDICATION_ID, medication_id)

        if start_date:
            query = query.gte(Col.MedicationLogs.SCHEDULED_AT, start_date)

        if end_date:
            query = query.lte(Col.MedicationLogs.SCHEDULED_AT, end_date)

        if status:
            query = query.eq(Col.MedicationLogs.STATUS, status)

        query = query.order(Col.MedicationLogs.SCHEDULED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "logs": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def get_adherence_statistics(
        self, patient_id: str, medication_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get medication adherence statistics

        Args:
            patient_id: Patient's user ID
            medication_id: Optional medication ID to filter

        Returns:
            List of adherence statistics per medication
        """
        # Get medications
        medications_query = (
            self.supabase.table(Tables.MEDICATIONS)
            .select("*")
            .eq(Col.Medications.PATIENT_ID, patient_id)
            .eq(Col.Medications.IS_ACTIVE, True)
        )

        if medication_id:
            medications_query = medications_query.eq(Col.Medications.ID, medication_id)

        medications_response = medications_query.execute()
        medications = medications_response.data if medications_response.data else []

        adherence_stats = []

        for medication in medications:
            med_id = medication[Col.Medications.ID]

            # Get logs for this medication
            logs_query = (
                self.supabase.table(Tables.MEDICATION_LOGS)
                .select("*")
                .eq(Col.MedicationLogs.MEDICATION_ID, med_id)
            )

            logs_response = logs_query.execute()
            logs = logs_response.data if logs_response.data else []

            total_doses = len(logs)
            taken_doses = sum(
                1 for log in logs if log[Col.MedicationLogs.STATUS] == "taken"
            )
            missed_doses = sum(
                1 for log in logs if log[Col.MedicationLogs.STATUS] == "missed"
            )
            skipped_doses = sum(
                1 for log in logs if log[Col.MedicationLogs.STATUS] == "skipped"
            )

            adherence_rate = (taken_doses / total_doses * 100) if total_doses > 0 else 0

            # Calculate streak
            streak_days = await self._calculate_streak(med_id)

            adherence_stats.append(
                {
                    "medication_id": med_id,
                    "medication_name": medication[Col.Medications.NAME],
                    "total_doses": total_doses,
                    "taken_doses": taken_doses,
                    "missed_doses": missed_doses,
                    "skipped_doses": skipped_doses,
                    "adherence_rate": round(adherence_rate, 2),
                    "streak_days": streak_days,
                }
            )

        return adherence_stats

    async def _calculate_streak(self, medication_id: str) -> int:
        """
        Calculate consecutive days of medication adherence

        Args:
            medication_id: Medication ID

        Returns:
            Number of consecutive days
        """
        # Get recent logs ordered by date
        logs_query = (
            self.supabase.table(Tables.MEDICATION_LOGS)
            .select("*")
            .eq(Col.MedicationLogs.MEDICATION_ID, medication_id)
            .order(Col.MedicationLogs.SCHEDULED_AT, desc=True)
            .limit(30)  # Check last 30 days
        )

        logs_response = logs_query.execute()
        logs = logs_response.data if logs_response.data else []

        if not logs:
            return 0

        # Group by date and check if all doses were taken
        dates = {}
        for log in logs:
            date = log[Col.MedicationLogs.SCHEDULED_AT][:10]
            if date not in dates:
                dates[date] = []
            dates[date].append(log[Col.MedicationLogs.STATUS])

        # Count consecutive days with all doses taken
        streak = 0
        sorted_dates = sorted(dates.keys(), reverse=True)

        for date in sorted_dates:
            if all(status == "taken" for status in dates[date]):
                streak += 1
            else:
                break

        return streak

    async def get_upcoming_reminders(
        self, patient_id: str, hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming medication reminders

        Args:
            patient_id: Patient's user ID
            hours: Number of hours to look ahead

        Returns:
            List of upcoming reminders
        """
        # Get active medications with reminders enabled
        medications_query = (
            self.supabase.table(Tables.MEDICATIONS)
            .select("*")
            .eq(Col.Medications.PATIENT_ID, patient_id)
            .eq(Col.Medications.IS_ACTIVE, True)
            .eq(Col.Medications.REMINDER_ENABLED, True)
        )

        medications_response = medications_query.execute()
        medications = medications_response.data if medications_response.data else []

        reminders = []
        now = datetime.now()
        end_time = now + timedelta(hours=hours)

        for medication in medications:
            reminder_times = medication.get(Col.Medications.REMINDER_TIMES, [])

            for reminder_time in reminder_times:
                # Parse reminder time (format: "HH:MM")
                try:
                    hour, minute = map(int, reminder_time.split(":"))
                    reminder_datetime = now.replace(
                        hour=hour, minute=minute, second=0, microsecond=0
                    )

                    # If time has passed today, check tomorrow
                    if reminder_datetime < now:
                        reminder_datetime += timedelta(days=1)

                    if reminder_datetime <= end_time:
                        reminders.append(
                            {
                                "medication": medication,
                                "next_dose": reminder_datetime.isoformat(),
                            }
                        )
                except ValueError:
                    continue

        # Sort by next dose time
        reminders.sort(key=lambda x: x["next_dose"])

        return reminders


# Singleton instance
_medication_reminder_service = None


def get_medication_reminder_service() -> MedicationReminderService:
    """Get or create medication reminder service instance"""
    global _medication_reminder_service
    if _medication_reminder_service is None:
        _medication_reminder_service = MedicationReminderService()
    return _medication_reminder_service
