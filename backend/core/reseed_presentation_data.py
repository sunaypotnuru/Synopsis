import os
import random
from datetime import datetime, timedelta
import sys

# Local path for Windows
sys.path.append(os.getcwd())

# Import from app
try:
    from app.services.supabase import supabase as supabase_admin
    from app.db.schema import Tables
except ImportError:
    # If running from backend/core
    sys.path.append(os.path.join(os.getcwd(), "app"))
    from app.services.supabase import supabase as supabase_admin
    from app.db.schema import Tables

import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# CONFIGURATION
PASSWORD = "NetraAI2024!"  # Default password for all presentation accounts
PRIMARY_ADMIN = "sunaypotnuru@gmail.com"
PRIMARY_DOCTOR = "rohithpanduru8@gmail.com"
PRIMARY_PATIENT = "sunaysujsy@gmail.com"
PRIMARY_PATIENT_NAME = "Sunay Sujsy"

# Mock Bypass Accounts
MOCK_DOCTOR = "doctor_1@example.com"
MOCK_PATIENT = "patient_1@example.com"

# FAKE DATA GENERATORS
DOCTOR_SPECIALTIES = [
    "Hematology",
    "Ophthalmology",
    "Neurology",
    "Cardiology",
    "General Medicine",
]
DOCTOR_NAMES = [
    "Dr. Sameer Deshmukh",
    "Dr. Kavita Reddy",
    "Dr. Rajesh Iyer",
    "Dr. Meera Nair",
    "Dr. Sanjay Kapoor",
]
PATIENT_NAMES = [
    "Rahul Sharma",
    "Priya Patel",
    "Amit Kumar",
    "Sneha Rao",
    "Vikram Singh",
    "Anjali Gupta",
]

SCAN_TYPES = ["anemia", "cataract", "diabetic-retinopathy", "parkinsons"]
SCAN_RESULTS = {
    "anemia": ["anemic", "normal"],
    "cataract": ["Early", "Mature", "No Cataract"],
    "diabetic-retinopathy": ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR"],
    "parkinsons": ["Low Risk", "Moderate Risk", "High Risk"],
}


def get_auth_users():
    try:
        res = supabase_admin.auth.admin.list_users()
        return res.users if hasattr(res, "users") else res
    except Exception as e:
        logger.error(f"Failed to list auth users: {e}")
        return []


def cleanup_presentation_accounts(auth_users):
    logger.info("Cleaning up and enforcing presentation account roles...")
    for user in auth_users:
        # Enforce PRIMARY_ADMIN is only Admin
        if user.email == PRIMARY_ADMIN:
            supabase_admin.auth.admin.update_user_by_id(
                user.id,
                {
                    "user_metadata": {
                        "role": "admin",
                        "full_name": "Sunay Potnuru (Admin)",
                    }
                },
            )
            supabase_admin.table(Tables.PROFILES_PATIENT).delete().eq(
                "id", user.id
            ).execute()
            supabase_admin.table(Tables.PROFILES_DOCTOR).delete().eq(
                "id", user.id
            ).execute()

        # Enforce PRIMARY_DOCTOR is only Doctor
        elif user.email == PRIMARY_DOCTOR:
            supabase_admin.auth.admin.update_user_by_id(
                user.id,
                {
                    "user_metadata": {
                        "role": "doctor",
                        "full_name": "Dr. Rohith Panduru",
                    }
                },
            )
            supabase_admin.table(Tables.PROFILES_PATIENT).delete().eq(
                "id", user.id
            ).execute()

        # Enforce PRIMARY_PATIENT is only Patient
        elif user.email == PRIMARY_PATIENT:
            supabase_admin.auth.admin.update_user_by_id(
                user.id,
                {
                    "user_metadata": {
                        "role": "patient",
                        "full_name": PRIMARY_PATIENT_NAME,
                    }
                },
            )
            supabase_admin.table(Tables.PROFILES_DOCTOR).delete().eq(
                "id", user.id
            ).execute()

        # Demote any other admins
        else:
            role = user.user_metadata.get("role")
            if role == "admin":
                logger.info(f"Demoting non-primary admin: {user.email}")
                supabase_admin.auth.admin.update_user_by_id(
                    user.id,
                    {"user_metadata": {**user.user_metadata, "role": "patient"}},
                )


def create_or_update_user(email, role, full_name):
    logger.info(f"Processing user: {email} ({role})")
    users = get_auth_users()
    existing = next((u for u in users if u.email == email), None)

    try:
        if existing:
            res = supabase_admin.auth.admin.update_user_by_id(
                existing.id,
                {
                    "password": PASSWORD,
                    "user_metadata": {"role": role, "full_name": full_name},
                    "email_confirm": True,
                },
            )
            user_id = existing.id
        else:
            res = supabase_admin.auth.admin.create_user(
                {
                    "email": email,
                    "password": PASSWORD,
                    "user_metadata": {"role": role, "full_name": full_name},
                    "email_confirm": True,
                }
            )
            user_id = res.user.id
        return user_id
    except Exception as e:
        logger.error(f"Error managing user {email}: {e}")
        return None


def seed_rich_data_for_patient(patient_id, doctor_ids):
    """Adds scans, appointments, and vitals for a patient."""
    logger.info(f"Seeding rich data for patient {patient_id}...")

    # 1. Scans (3-5 unique scans)
    num_scans = random.randint(3, 5)
    for _ in range(num_scans):
        scan_type = random.choice(SCAN_TYPES)
        prediction = random.choice(SCAN_RESULTS[scan_type])
        confidence = random.uniform(0.75, 0.98)

        supabase_admin.table(Tables.SCANS).insert(
            {
                "patient_id": patient_id,
                "doctor_id": random.choice(doctor_ids),
                "image_url": f"https://images.unsplash.com/photo-{random.randint(1500000000000, 1600000000000)}?w=400",
                "scan_type": scan_type,
                "prediction": prediction,
                "confidence": confidence,
                "hemoglobin_estimate": (
                    random.uniform(8.0, 15.0) if scan_type == "anemia" else None
                ),
                "recommendations": f"Follow-up required for {scan_type} assessment. Consultation recommended.",
                # Omit status and timestamps to avoid schema cache issues; DB defaults will handle it
            }
        ).execute()

    # 2. Appointments (2-4 unique appointments)
    num_apps = random.randint(2, 4)
    for i in range(num_apps):
        supabase_admin.table(Tables.APPOINTMENTS).insert(
            {
                "patient_id": patient_id,
                "doctor_id": random.choice(doctor_ids),
                "scheduled_at": (
                    datetime.now() + timedelta(days=random.randint(1, 10))
                ).isoformat(),
                "status": "booked",
                "type": random.choice(["video", "in-person"]),
                "reason": f"Routine checkup and review of {random.choice(SCAN_TYPES)} results.",
            }
        ).execute()

    # 3. Vitals
    vitals = [
        {"type": "blood_pressure", "val": random.randint(110, 140), "unit": "mmHg"},
        {"type": "heart_rate", "val": random.randint(65, 90), "unit": "bpm"},
        {"type": "blood_glucose", "val": random.randint(85, 120), "unit": "mg/dL"},
        {"type": "oxygen_saturation", "val": random.randint(95, 99), "unit": "%"},
    ]
    for v in vitals:
        supabase_admin.table(Tables.VITALS_LOG).insert(
            {
                "patient_id": patient_id,
                "tracker_type": v["type"],
                "value": v["val"],
                "unit": v["unit"],
                "logged_at": (
                    datetime.now() - timedelta(hours=random.randint(1, 48))
                ).isoformat(),
            }
        ).execute()


def seed_documents_for_patient(patient_id, doctor_id):
    """Adds mock medical documents for a patient."""
    logger.info(f"Seeding documents for patient {patient_id}...")
    docs = [
        {
            "title": "Initial Lab Results",
            "cat": "Lab Report",
            "type": "application/pdf",
        },
        {
            "title": "Medical History Form",
            "cat": "Onboarding",
            "type": "application/pdf",
        },
        {
            "title": "Prescription - Vitamin D",
            "cat": "Prescription",
            "type": "application/pdf",
        },
    ]
    for doc in docs:
        supabase_admin.table(Tables.DOCUMENTS).insert(
            {
                "patient_id": patient_id,
                "uploaded_by": doctor_id,
                "title": doc["title"],
                "category": doc["cat"],
                "file_type": doc["type"],
                "file_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                "file_size": random.randint(100000, 500000),
                "is_shared": True,
            }
        ).execute()


def seed_timeline_for_patient(patient_id):
    """Adds historical timeline events for a patient."""
    logger.info(f"Seeding timeline for patient {patient_id}...")
    events = [
        {
            "title": "Joined NetraAI",
            "desc": "Patient successfully onboarded to the platform.",
            "type": "registration",
            "days": 30,
        },
        {
            "title": "Initial Profile Completed",
            "desc": "Medical history and profile details updated.",
            "type": "profile",
            "days": 28,
        },
        {
            "title": "First Consultation",
            "desc": "Met with primary doctor for initial screening.",
            "type": "consultation",
            "days": 25,
        },
        {
            "title": "Anemia Screening",
            "desc": "Digital eye-scan performed for anemia detection.",
            "type": "scan",
            "days": 15,
        },
    ]
    for ev in events:
        supabase_admin.table(Tables.TIMELINE_EVENTS).insert(
            {
                "user_id": patient_id,
                "title": ev["title"],
                "description": ev["desc"],
                "event_type": ev["type"],
                "event_date": (datetime.now() - timedelta(days=ev["days"])).isoformat(),
            }
        ).execute()


def seed_presentation():
    # 1. Clean up and Enforce Roles
    auth_users = get_auth_users()
    cleanup_presentation_accounts(auth_users)

    # Clear existing activity data for a clean seed
    # Note: We delete by patient/doctor IDs to avoid clearing the whole DB if other data exists
    # But for a presentation reset, we usually want a fresh start.
    logger.info("Cleaning up old activity records...")
    supabase_admin.table(Tables.SCANS).delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    supabase_admin.table(Tables.APPOINTMENTS).delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    supabase_admin.table(Tables.VITALS_LOG).delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()

    # Create primary accounts
    _ = create_or_update_user(PRIMARY_ADMIN, "admin", "Sunay Potnuru (Admin)")
    _ = create_or_update_user(PRIMARY_DOCTOR, "doctor", "Dr. Rohith Panduru")
    _ = create_or_update_user(PRIMARY_PATIENT, "patient", PRIMARY_PATIENT_NAME)

    # 3. Setup Doctors
    all_doctor_ids = []

    # Primary Doctor
    doc_id = create_or_update_user(PRIMARY_DOCTOR, "doctor", "Dr. Rohith Panduru")
    if doc_id:
        all_doctor_ids.append(doc_id)
        supabase_admin.table(Tables.PROFILES_DOCTOR).upsert(
            {
                "id": doc_id,
                "email": PRIMARY_DOCTOR,
                "full_name": "Dr. Rohith Panduru",
                "specialty": "Hematology",
                "is_verified": True,
                "experience_years": 15,
                "consultation_fee": 800,
                "bio": "Leading expert in AI diagnostics and hematological disorders. Chief Medical Officer at Netra AI.",
                "phone": "+918125914594",
            }
        ).execute()

    # Random Doctors
    for i, name in enumerate(DOCTOR_NAMES):
        email = f"doctor_{i+1}@example.com"
        d_id = create_or_update_user(email, "doctor", name)
        if d_id:
            all_doctor_ids.append(d_id)
            supabase_admin.table(Tables.PROFILES_DOCTOR).upsert(
                {
                    "id": d_id,
                    "email": email,
                    "full_name": name,
                    "specialty": random.choice(DOCTOR_SPECIALTIES),
                    "is_verified": True,
                    "experience_years": random.randint(5, 20),
                    "consultation_fee": random.choice([400, 500, 600, 1000]),
                    "phone": f"+9198765{i}4321",
                }
            ).execute()

    # 4. Setup Patients
    all_patient_ids = []

    # Primary Patient (Sunay Sujsy)
    pat_id = create_or_update_user(PRIMARY_PATIENT, "patient", PRIMARY_PATIENT_NAME)
    if pat_id:
        all_patient_ids.append(pat_id)
        supabase_admin.table(Tables.PROFILES_PATIENT).upsert(
            {
                "id": pat_id,
                "email": PRIMARY_PATIENT,
                "full_name": PRIMARY_PATIENT_NAME,
                "age": 28,
                "gender": "male",
                "blood_type": "O+",
                "phone": "+918125914593",
                "health_score": 85,
                "points": 2450,
            }
        ).execute()
        seed_rich_data_for_patient(pat_id, all_doctor_ids)
        seed_documents_for_patient(pat_id, all_doctor_ids[0])
        seed_timeline_for_patient(pat_id)

    # Random Patients
    for i, name in enumerate(PATIENT_NAMES):
        email = f"patient_{i+1}@example.com"
        p_id = create_or_update_user(email, "patient", name)
        if p_id:
            all_patient_ids.append(p_id)
            supabase_admin.table(Tables.PROFILES_PATIENT).upsert(
                {
                    "id": p_id,
                    "email": email,
                    "full_name": name,
                    "age": random.randint(18, 75),
                    "gender": random.choice(["male", "female"]),
                    "blood_type": random.choice(["A+", "B+", "O+", "AB+"]),
                    "phone": f"+91998877{i}654",
                    "health_score": random.randint(60, 95),
                }
            ).execute()
            seed_rich_data_for_patient(p_id, all_doctor_ids)
            seed_documents_for_patient(p_id, random.choice(all_doctor_ids))
            seed_timeline_for_patient(p_id)

    # 5. Seed Activity Data for ALL Patients
    for p_id in all_patient_ids:
        seed_rich_data_for_patient(p_id, all_doctor_ids)

    # 6. Seed Admin Feedback
    logger.info("Seeding feedback and reports...")
    for i in range(10):
        supabase_admin.table(Tables.FOLLOW_UP_SURVEYS).insert(
            {
                "patient_id": random.choice(all_patient_ids),
                "doctor_id": random.choice(all_doctor_ids),
                "rating": random.randint(4, 5),
                "response": f"The {random.choice(SCAN_TYPES)} analysis was incredibly accurate and fast. Highly recommend!",
                "answered_at": datetime.now().isoformat(),
            }
        ).execute()

    logger.info("✅ DEEP SEED COMPLETE! All accounts enriched with unique data.")
    logger.info(f"Primary Patient renamed to: {PRIMARY_PATIENT_NAME}")
    logger.info(f"Total Doctors: {len(all_doctor_ids)}")
    logger.info(f"Total Patients: {len(all_patient_ids)}")


if __name__ == "__main__":
    seed_presentation()
