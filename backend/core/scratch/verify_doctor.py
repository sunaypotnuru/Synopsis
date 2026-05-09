import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from root
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
load_dotenv(root_env)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") 
supabase: Client = create_client(url, key)

email = "rohitpanduru8@gmail.com"

def verify_doctor():
    print(f"Verifying doctor: {email}")
    try:
        # Check profiles table
        res = supabase.table("profiles_doctor").select("*").eq("email", email).execute()
        if res.data:
            print(f"Doctor profile found: {res.data[0]['full_name']}")
            print(f"Status: {res.data[0].get('status', 'unknown')}")
        else:
            print(f"Doctor profile NOT found for {email}")
            
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_doctor()
