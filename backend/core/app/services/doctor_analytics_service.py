"""
Doctor Analytics Service

Provides analytics and insights for doctor portal including:
- Earnings dashboard
- Patient statistics
- Appointment trends
- Performance metrics
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class DoctorAnalyticsService:
    """Service for doctor analytics and earnings tracking"""

    def __init__(self):
        self.supabase = supabase

    async def get_earnings_summary(
        self,
        doctor_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        period: str = "month",  # 'day', 'week', 'month', 'year'
    ) -> Dict[str, Any]:
        """
        Get earnings summary for a doctor

        Args:
            doctor_id: Doctor's user ID
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            period: Time period for grouping

        Returns:
            Dictionary with earnings data
        """
        # Set default date range if not provided
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            if period == "day":
                start_date = (datetime.now() - timedelta(days=1)).isoformat()
            elif period == "week":
                start_date = (datetime.now() - timedelta(weeks=1)).isoformat()
            elif period == "month":
                start_date = (datetime.now() - timedelta(days=30)).isoformat()
            else:  # year
                start_date = (datetime.now() - timedelta(days=365)).isoformat()

        # Get paid appointments
        query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select("*")
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
            .eq(Col.Appointments.PAYMENT_STATUS, "paid")
            .gte(Col.Appointments.SCHEDULED_AT, start_date)
            .lte(Col.Appointments.SCHEDULED_AT, end_date)
        )

        response = query.execute()
        appointments = response.data if response.data else []

        # Calculate earnings
        total_earnings = sum(
            float(apt.get(Col.Appointments.CONSULTATION_FEE, 0) or 0)
            for apt in appointments
        )

        total_appointments = len(appointments)
        average_fee = (
            total_earnings / total_appointments if total_appointments > 0 else 0
        )

        # Group by appointment type
        earnings_by_type = {}
        for apt in appointments:
            apt_type = apt.get(Col.Appointments.TYPE, "consultation")
            fee = float(apt.get(Col.Appointments.CONSULTATION_FEE, 0) or 0)

            if apt_type not in earnings_by_type:
                earnings_by_type[apt_type] = {"count": 0, "total": 0}

            earnings_by_type[apt_type]["count"] += 1
            earnings_by_type[apt_type]["total"] += fee

        # Get pending payments
        pending_query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select("*")
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
            .eq(Col.Appointments.PAYMENT_STATUS, "pending")
            .gte(Col.Appointments.SCHEDULED_AT, start_date)
            .lte(Col.Appointments.SCHEDULED_AT, end_date)
        )

        pending_response = pending_query.execute()
        pending_appointments = pending_response.data if pending_response.data else []

        pending_earnings = sum(
            float(apt.get(Col.Appointments.CONSULTATION_FEE, 0) or 0)
            for apt in pending_appointments
        )

        return {
            "total_earnings": round(total_earnings, 2),
            "total_appointments": total_appointments,
            "average_consultation_fee": round(average_fee, 2),
            "pending_earnings": round(pending_earnings, 2),
            "pending_appointments": len(pending_appointments),
            "earnings_by_type": earnings_by_type,
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
        }

    async def get_doctor_statistics(self, doctor_id: str) -> Dict[str, Any]:
        """
        Get overall statistics for a doctor

        Args:
            doctor_id: Doctor's user ID

        Returns:
            Dictionary with doctor statistics
        """
        # Get total patients (unique)
        appointments_query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select(Col.Appointments.PATIENT_ID)
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
        )

        appointments_response = appointments_query.execute()
        appointments = appointments_response.data if appointments_response.data else []

        unique_patients = len(
            set(apt[Col.Appointments.PATIENT_ID] for apt in appointments)
        )

        # Get total appointments
        total_appointments = len(appointments)

        # Get completed appointments
        completed_query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select("*", count="exact")
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
            .eq(Col.Appointments.STATUS, "completed")
        )

        completed_response = completed_query.execute()
        completed_appointments = completed_response.count or 0

        # Get average rating
        ratings_query = (
            self.supabase.table(Tables.RATINGS)
            .select(Col.Ratings.RATING)
            .eq(Col.Ratings.DOCTOR_ID, doctor_id)
        )

        ratings_response = ratings_query.execute()
        ratings = ratings_response.data if ratings_response.data else []

        average_rating = (
            sum(r[Col.Ratings.RATING] for r in ratings) / len(ratings) if ratings else 0
        )

        # Get total clinical notes
        notes_query = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .select("*", count="exact")
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
        )

        notes_response = notes_query.execute()
        total_notes = notes_response.count or 0

        # Get total prescriptions
        prescriptions_query = (
            self.supabase.table(Tables.PRESCRIPTIONS)
            .select("*", count="exact")
            .eq(Col.Prescriptions.DOCTOR_ID, doctor_id)
        )

        prescriptions_response = prescriptions_query.execute()
        total_prescriptions = prescriptions_response.count or 0

        return {
            "total_patients": unique_patients,
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "average_rating": round(average_rating, 2),
            "total_clinical_notes": total_notes,
            "total_prescriptions": total_prescriptions,
        }

    async def get_appointment_trends(
        self, doctor_id: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get appointment trends over time

        Args:
            doctor_id: Doctor's user ID
            days: Number of days to analyze

        Returns:
            List of daily appointment counts
        """
        start_date = (datetime.now() - timedelta(days=days)).isoformat()

        query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select("*")
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
            .gte(Col.Appointments.SCHEDULED_AT, start_date)
            .order(Col.Appointments.SCHEDULED_AT)
        )

        response = query.execute()
        appointments = response.data if response.data else []

        # Group by date
        trends = {}
        for apt in appointments:
            date = apt[Col.Appointments.SCHEDULED_AT][:10]  # Get date part
            if date not in trends:
                trends[date] = {
                    "date": date,
                    "count": 0,
                    "completed": 0,
                    "cancelled": 0,
                }

            trends[date]["count"] += 1

            status = apt.get(Col.Appointments.STATUS, "")
            if status == "completed":
                trends[date]["completed"] += 1
            elif status == "cancelled":
                trends[date]["cancelled"] += 1

        return list(trends.values())

    async def get_patient_demographics(self, doctor_id: str) -> Dict[str, Any]:
        """
        Get patient demographics for a doctor

        Args:
            doctor_id: Doctor's user ID

        Returns:
            Dictionary with demographic data
        """
        # Get unique patient IDs
        appointments_query = (
            self.supabase.table(Tables.APPOINTMENTS)
            .select(Col.Appointments.PATIENT_ID)
            .eq(Col.Appointments.DOCTOR_ID, doctor_id)
        )

        appointments_response = appointments_query.execute()
        appointments = appointments_response.data if appointments_response.data else []

        patient_ids = list(
            set(apt[Col.Appointments.PATIENT_ID] for apt in appointments)
        )

        if not patient_ids:
            return {
                "total_patients": 0,
                "age_distribution": {},
                "gender_distribution": {},
            }

        # Get patient profiles
        patients_query = (
            self.supabase.table(Tables.PROFILES_PATIENT)
            .select("*")
            .in_(Col.ProfilesPatient.ID, patient_ids)
        )

        patients_response = patients_query.execute()
        patients = patients_response.data if patients_response.data else []

        # Analyze demographics
        age_distribution = {"0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0}
        gender_distribution = {"male": 0, "female": 0, "other": 0}

        for patient in patients:
            # Age distribution
            age = patient.get(Col.ProfilesPatient.AGE, 0)
            if age <= 18:
                age_distribution["0-18"] += 1
            elif age <= 35:
                age_distribution["19-35"] += 1
            elif age <= 50:
                age_distribution["36-50"] += 1
            elif age <= 65:
                age_distribution["51-65"] += 1
            else:
                age_distribution["65+"] += 1

            # Gender distribution
            gender = patient.get(Col.ProfilesPatient.GENDER, "other").lower()
            if gender in gender_distribution:
                gender_distribution[gender] += 1
            else:
                gender_distribution["other"] += 1

        return {
            "total_patients": len(patients),
            "age_distribution": age_distribution,
            "gender_distribution": gender_distribution,
        }

    async def get_common_diagnoses(
        self, doctor_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get most common diagnoses from clinical notes

        Args:
            doctor_id: Doctor's user ID
            limit: Number of top diagnoses to return

        Returns:
            List of common diagnoses with counts
        """
        # Get clinical notes with assessments
        query = (
            self.supabase.table(Tables.CLINICAL_NOTES)
            .select(Col.ClinicalNotes.ASSESSMENT)
            .eq(Col.ClinicalNotes.DOCTOR_ID, doctor_id)
            .not_.is_(Col.ClinicalNotes.ASSESSMENT, "null")
        )

        response = query.execute()
        notes = response.data if response.data else []

        # Count diagnoses (simplified - in production, use NLP)
        diagnoses = {}
        for note in notes:
            assessment = note.get(Col.ClinicalNotes.ASSESSMENT, "")
            if assessment:
                # Simple keyword extraction (in production, use proper NLP)
                keywords = assessment.lower().split()
                for keyword in keywords:
                    if len(keyword) > 4:  # Filter short words
                        diagnoses[keyword] = diagnoses.get(keyword, 0) + 1

        # Sort and limit
        sorted_diagnoses = sorted(diagnoses.items(), key=lambda x: x[1], reverse=True)[
            :limit
        ]

        return [
            {"diagnosis": diagnosis, "count": count}
            for diagnosis, count in sorted_diagnoses
        ]

    async def get_prescription_patterns(
        self, doctor_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get most commonly prescribed medications

        Args:
            doctor_id: Doctor's user ID
            limit: Number of top medications to return

        Returns:
            List of common medications with counts
        """
        # Get prescription templates
        query = (
            self.supabase.table(Tables.PRESCRIPTION_TEMPLATES)
            .select("*")
            .eq(Col.PrescriptionTemplates.DOCTOR_ID, doctor_id)
            .order(Col.PrescriptionTemplates.USE_COUNT, desc=True)
            .limit(limit)
        )

        response = query.execute()
        templates = response.data if response.data else []

        return [
            {
                "medication_name": template[Col.PrescriptionTemplates.MEDICATION_NAME],
                "use_count": template[Col.PrescriptionTemplates.USE_COUNT],
                "dosage": template[Col.PrescriptionTemplates.DOSAGE],
                "frequency": template[Col.PrescriptionTemplates.FREQUENCY],
            }
            for template in templates
        ]


# Singleton instance
_doctor_analytics_service = None


def get_doctor_analytics_service() -> DoctorAnalyticsService:
    """Get or create doctor analytics service instance"""
    global _doctor_analytics_service
    if _doctor_analytics_service is None:
        _doctor_analytics_service = DoctorAnalyticsService()
    return _doctor_analytics_service
