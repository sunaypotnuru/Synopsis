import os
import sys
import logging

# Add the backend directory to path
sys.path.append(os.path.join(os.getcwd(), "backend", "core"))

from app.services.supabase import supabase as supabase_admin
from app.db.schema import Tables

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The three test accounts to KEEP
KEEP_EMAILS = [
    "sunaysujsy@gmail.com",  # Patient
    "rohitpanduru8@gmail.com",  # Doctor
    "sunaypotnuru@gmail.com",  # Admin
]


def cleanup_database():
    logger.info("🧹 Starting database cleanup (keeping only 3 test accounts)...")

    try:
        # 1. Get all auth users
        users_res = supabase_admin.auth.admin.list_users()
        all_users = users_res.users if hasattr(users_res, "users") else users_res

        # 2. Identify users to delete
        to_delete = [u for u in all_users if u.email not in KEEP_EMAILS]

        if not to_delete:
            logger.info("✅ No extra users found in Auth.")
        else:
            logger.info(f"Found {len(to_delete)} users to remove from Auth.")
            for u in to_delete:
                logger.info(f"Deleting user: {u.email} ({u.id})")
                supabase_admin.auth.admin.delete_user(u.id)

        # 3. Clean up Profile Tables
        for table in [Tables.PROFILES_PATIENT, Tables.PROFILES_DOCTOR]:
            logger.info(f"Cleaning {table}...")
            # Delete where email is not in the keep list
            # We iterate to be safe with the filter syntax
            res = supabase_admin.table(table).select("id, email").execute()
            to_del_profiles = [p for p in res.data if p["email"] not in KEEP_EMAILS]
            for p in to_del_profiles:
                supabase_admin.table(table).delete().eq("id", p["id"]).execute()

        # 4. Clean up other data tables
        tables_to_wipe = [
            Tables.APPOINTMENTS,
            Tables.SCANS,
            Tables.VITALS_LOG,
            Tables.DOCUMENTS,
            Tables.NOTIFICATIONS,
            Tables.MESSAGES,
            "pro_submissions",
            "medical_imaging_studies",
            "fhir_patients",
            "fhir_practitioners",
        ]

        for table in tables_to_wipe:
            try:
                logger.info(f"Wiping {table}...")
                # We fetch IDs and delete to avoid filter issues on potentially missing columns
                res = supabase_admin.table(table).select("id").limit(1000).execute()
                if res.data:
                    ids = [r["id"] for r in res.data]
                    for batch_start in range(0, len(ids), 100):
                        batch = ids[batch_start : batch_start + 100]
                        supabase_admin.table(table).delete().in_("id", batch).execute()
            except Exception as e:
                logger.warning(f"Could not wipe {table}: {e}")

        logger.info("✨ Database cleaned successfully!")

    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")


if __name__ == "__main__":
    cleanup_database()
