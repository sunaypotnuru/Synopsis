import os
import sys

# Add the app directory to the python path so it can import app.config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.supabase import supabase

try:
    print("Testing follow_up_templates...")
    supabase.table("follow_up_templates").select("id").limit(1).execute()
    print("SUCCESS: follow_up_templates exists")

    print("Testing pro_questionnaires...")
    supabase.table("pro_questionnaires").select("id").limit(1).execute()
    print("SUCCESS: pro_questionnaires exists")

    print("Testing pro_submissions...")
    supabase.table("pro_submissions").select("id").limit(1).execute()
    print("SUCCESS: pro_submissions exists")
except Exception as e:
    print(f"Error checking tables: {e}")
