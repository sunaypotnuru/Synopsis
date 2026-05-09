from supabase import create_client, Client
import os
from app.core.config import settings

# Export a configured synchronous Supabase client using the Service Role Key.
# This client bypasses RLS, so use it carefully within secured backend routes!
supabase_service_key = settings.SUPABASE_SERVICE_KEY or os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY", ""
)
supabase: Client = create_client(
    supabase_url=settings.SUPABASE_URL, supabase_key=supabase_service_key
)
