import os
import logging
from datetime import datetime, timedelta
import sys

# Mock app environment to reuse the Supabase client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase import supabase as supabase_admin
from app.db.schema import Tables

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SECURITY: Use the password requested by the user
PASSWORD = "naraYANA8861*"

USERS = [
    {
        "email": "sunaysujsy@gmail.com",
        "role": "patient",
        "full_name": "Sunay Sujsy",
        "table": Tables.PROFILES_PATIENT,
        "data": {
            "age": 28,
            "blood_type": "O+",
            "gender": "male",
            "phone": "+918125914593",
            "health_score": 85,
            "points": 1250,
            "login_streak": 5,
            "language": "en",  # Short code for VARCHAR(5)
            "date_of_birth": "1996-05-15",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sunay",
        },
    },
    {
        "email": "rohitpanduru8@gmail.com",
        "role": "doctor",
        "full_name": "Dr. Rohit Panduru",
        "table": Tables.PROFILES_DOCTOR,
        "data": {
            "specialty": "Hematology & AI Diagnostics",
            "rating": 4.9,
            "is_verified": True,
            "consultation_fee": 500,
            "experience_years": 12,
            "license_number": "MED-HYD-8861",
            "bio": "Specialist in AI-powered anemia detection and blood disorders with over 12 years of clinical experience.",
            "phone": "+918125914594",
            "availability": {
                "Monday": ["09:00 AM", "11:00 AM", "02:00 PM"],
                "Wednesday": ["10:00 AM", "01:00 PM", "04:00 PM"],
                "Friday": ["09:00 AM", "12:00 PM", "03:00 PM"],
            },
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit",
        },
    },
    {
        "email": "sunaypotnuru@gmail.com",
        "role": "admin",
        "full_name": "Sunay Potnuru",
        "table": None,
        "data": {},
    },
]


def seed():
    logger.info("Starting industrial-grade database seeding...")

    # Get all users to check existence
    try:
        users_res = supabase_admin.auth.admin.list_users()
        auth_users = users_res.users if hasattr(users_res, "users") else users_res
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        return

    user_ids = {}

    for u in USERS:
        logger.info(f"Processing user: {u['email']} ({u['role']})")

        existing_user = next((x for x in auth_users if x.email == u["email"]), None)

        try:
            if existing_user:
                user_id = existing_user.id
                logger.info(
                    f"User exists: {user_id}. Updating password and metadata..."
                )
                supabase_admin.auth.admin.update_user_by_id(
                    user_id,
                    {
                        "password": PASSWORD,
                        "user_metadata": {
                            "role": u["role"],
                            "full_name": u["full_name"],
                        },
                        "email_confirm": True,
                    },
                )
            else:
                logger.info("Creating new user...")
                res = supabase_admin.auth.admin.create_user(
                    {
                        "email": u["email"],
                        "password": PASSWORD,
                        "user_metadata": {
                            "role": u["role"],
                            "full_name": u["full_name"],
                        },
                        "email_confirm": True,
                    }
                )
                user_id = res.user.id

            user_ids[u["email"]] = user_id

            # 2. Create/Update Profile
            if u["table"]:
                profile_data = {
                    "id": user_id,
                    "email": u["email"],
                    "full_name": u["full_name"],
                    **u["data"],
                }
                supabase_admin.table(u["table"]).upsert(profile_data).execute()
                logger.info(f"Profile updated in {u['table']}")

        except Exception as e:
            logger.error(f"Error seeding user {u['email']}: {e}")

    # 3. Seed additional data for the patient and doctor
    p_email = "sunaysujsy@gmail.com"
    d_email = "rohitpanduru8@gmail.com"

    if p_email in user_ids and d_email in user_ids:
        patient_id = user_ids[p_email]
        doctor_id = user_ids[d_email]

        try:
            # Seed Appointment
            supabase_admin.table(Tables.APPOINTMENTS).upsert(
                {
                    "patient_id": patient_id,
                    "doctor_id": doctor_id,
                    "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat(),
                    "status": "booked",
                    "type": "video",
                    "reason": "Anemia screening follow-up and dietary consultation",
                    "notes": "Patient reports mild fatigue and is looking for AI-driven health insights.",
                }
            ).execute()
            logger.info("Appointment seeded.")

            # Seed Document
            supabase_admin.table(Tables.DOCUMENTS).upsert(
                {
                    "patient_id": patient_id,
                    "uploaded_by": patient_id,
                    "title": "Comprehensive Blood Profile",
                    "description": "Full CBC and Vitamin levels from Apollo Diagnostics",
                    "category": "lab_report",
                    "file_url": "demo/blood_test.pdf",
                    "file_size": 2048,
                    "file_type": "application/pdf",
                }
            ).execute()
            logger.info("Document seeded.")

            # Seed Vitals Log
            vitals = [
                {"type": "heart_rate", "val": 72, "u": "bpm"},
                {"type": "blood_pressure_sys", "val": 120, "u": "mmHg"},
                {"type": "blood_pressure_dia", "val": 80, "u": "mmHg"},
                {"type": "spO2", "val": 98, "u": "%"},
                {"type": "weight", "val": 70.5, "u": "kg"},
            ]
            for v in vitals:
                supabase_admin.table(Tables.VITALS_LOG).upsert(
                    {
                        "patient_id": patient_id,
                        "tracker_type": v["type"],
                        "value": v["val"],
                        "unit": v["u"],
                        "notes": "Initial assessment data",
                    }
                ).execute()
            logger.info("Vitals logs seeded.")

            # Seed a Scan Result
            supabase_admin.table(Tables.SCANS).upsert(
                {
                    "patient_id": patient_id,
                    "doctor_id": doctor_id,
                    "prediction": "Anemic",
                    "confidence": 0.94,
                    "hemoglobin_estimate": 10.2,
                    "scan_type": "anemia",
                    "status": "completed",
                    "recommendations": "Follow up with a specialist for iron supplement planning.",
                    "image_url": "demo/scan_result_1.jpg",
                }
            ).execute()
            logger.info("Scan result seeded.")

        except Exception as e:
            logger.error(f"Error seeding related data: {e}")

    logger.info("Industrial-grade seeding complete!")


if __name__ == "__main__":
    seed()
