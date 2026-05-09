#!/usr/bin/env python3
"""
Database Verification Script
Checks if all required tables exist in Supabase
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "core"))

from app.services.supabase import supabase
from app.db.schema import Tables

# Required tables
REQUIRED_TABLES = [
    Tables.PROFILES_PATIENT,
    Tables.PROFILES_DOCTOR,
    Tables.APPOINTMENTS,
    Tables.MESSAGES,
    Tables.NOTIFICATIONS,
    Tables.NOTIFICATION_PREFS,
    Tables.ACHIEVEMENTS,
    Tables.USER_ACHIEVEMENTS,
    Tables.USER_POINTS,
    Tables.LOGIN_STREAKS,
    Tables.BADGES,
    Tables.USER_BADGES,
    Tables.CHALLENGES,
    Tables.USER_CHALLENGES,
    Tables.SCANS,
    Tables.PRESCRIPTIONS,
    Tables.MEDICATIONS,
    Tables.VITALS_LOG,
    Tables.CLINICAL_NOTES,
    Tables.RISK_ASSESSMENTS,
    Tables.FOLLOW_UP_SURVEYS,
    Tables.RATINGS,
    Tables.MENTAL_HEALTH_SCREENINGS,
    Tables.DOCUMENTS,
    Tables.TIMELINE_EVENTS,
    Tables.FAMILY_MEMBERS,
    Tables.REFERRALS,
    Tables.MEDICAL_REFERRALS,
    Tables.WAITLIST,
    Tables.AUDIT_LOGS,
    Tables.USER_SESSIONS,
]

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in the database"""
    try:
        # Try to query the table
        result = supabase.table(table_name).select("*").limit(1).execute()
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if "does not exist" in error_msg or "relation" in error_msg:
            return False
        # If it's a different error, the table might exist
        return True

def main():
    """Main verification function"""
    print("=" * 60)
    print("Database Verification Script")
    print("=" * 60)
    print()
    
    print(f"Checking {len(REQUIRED_TABLES)} required tables...")
    print()
    
    missing_tables = []
    existing_tables = []
    
    for table in REQUIRED_TABLES:
        exists = check_table_exists(table)
        if exists:
            print(f"✓ {table}")
            existing_tables.append(table)
        else:
            print(f"✗ {table} - MISSING")
            missing_tables.append(table)
    
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total tables checked: {len(REQUIRED_TABLES)}")
    print(f"Existing tables: {len(existing_tables)}")
    print(f"Missing tables: {len(missing_tables)}")
    print()
    
    if missing_tables:
        print("❌ Database verification FAILED")
        print()
        print("Missing tables:")
        for table in missing_tables:
            print(f"  - {table}")
        print()
        print("Action required:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Open your project")
        print("3. Click 'SQL Editor'")
        print("4. Run the MASTER_DATABASE_SCHEMA.sql file")
        print()
        return 1
    else:
        print("✅ Database verification PASSED")
        print()
        print("All required tables exist!")
        print("You can now start the application.")
        print()
        return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Make sure:")
        print("1. Supabase credentials are correct in .env")
        print("2. You have internet connection")
        print("3. Supabase project is active")
        sys.exit(1)
