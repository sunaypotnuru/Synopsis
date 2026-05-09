import os
import requests
from supabase import create_client
import jwt
import time
import pytest

# SECURITY: Load from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@pytest.mark.skipif(
    not SUPABASE_URL or not SUPABASE_KEY,
    reason="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment",
)
def test_bidirectional_chat():
    supabase = get_supabase_client()
    if not supabase:
        pytest.skip("Supabase client could not be initialized")

    # Fetch user UUIDs directly from DB
    patient_res = supabase.table("profiles_patient").select("id").limit(1).execute()
    doctor_res = supabase.table("profiles_doctor").select("id").limit(1).execute()
    admin_res = (
        supabase.table("profiles").select("id").eq("role", "admin").limit(1).execute()
    )

    sessions = {
        "patient": {"uuid": patient_res.data[0]["id"] if patient_res.data else None},
        "doctor": {"uuid": doctor_res.data[0]["id"] if doctor_res.data else None},
        "admin": {"uuid": admin_res.data[0]["id"] if admin_res.data else None},
    }

    for role, data in sessions.items():
        if not data["uuid"]:
            print(f"Failed to find UUID for {role}")
            continue
        # Forge Supabase JWT
        payload = {
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
            "sub": data["uuid"],
            "email": f"{role}@localhost",
            "app_metadata": {"provider": "email"},
            "user_metadata": {},
            "role": "authenticated",
        }
        encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        data["token"] = encoded_jwt
        print(f"✅ Forged token for {role} ({data['uuid']})")

    if not all(s.get("token") for s in sessions.values()):
        pytest.skip("Could not login all users, skipping test.")

    API_BASE = "http://localhost:8000/api/v1"

    def send_message(sender_role, recipient_role, text):
        headers = {"Authorization": f"Bearer {sessions[sender_role]['token']}"}
        recipient_id = sessions[recipient_role]["uuid"]
        res = requests.post(
            f"{API_BASE}/messages/send?recipient_id={recipient_id}&content={text}",
            headers=headers,
        )
        assert (
            res.status_code == 200
        ), f"{sender_role.upper()} failed to send to {recipient_role.upper()}: {res.status_code} {res.text}"
        print(
            f"✅ SUCCESS: {sender_role.upper()} sent message to {recipient_role.upper()}: '{text}'"
        )

    print("\n--- Testing Bidirectional Chat (Patient <-> Doctor) ---")
    send_message("patient", "doctor", "Hello Dr. Sharma, this is a test from patient.")
    send_message("doctor", "patient", "Hello Patient, test received and replying.")

    print("\n--- Testing Admin One-Way Broadcast ---")
    send_message(
        "admin", "patient", "SYSTEM BROADCAST: Please update your patient history."
    )
    send_message(
        "admin",
        "doctor",
        "SYSTEM BROADCAST: Remember to submit your weekly timesheets.",
    )

    print("\n--- Testing Reply Constraint ---")
    send_message("patient", "admin", "Replying to admin - should this be blocked?")
