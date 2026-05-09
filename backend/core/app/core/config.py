from pydantic_settings import BaseSettings  # type: ignore
from typing import Optional
import os

# Support running from repo root OR from services/core/ directory
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_FILE = os.path.join(_BASE_DIR, "..", "..", "..", "..", ".env")
if not os.path.exists(_ENV_FILE):
    _ENV_FILE = os.path.join(_BASE_DIR, "..", "..", "..", ".env")
if not os.path.exists(_ENV_FILE):
    _ENV_FILE = ".env"


class Settings(BaseSettings):
    # Supabase (Database & Auth)
    SUPABASE_URL: str = ""  # Required in production; defaults empty for CI safety
    SUPABASE_SERVICE_KEY: str = (
        ""  # Required in production; defaults empty for CI safety
    )

    # LiveKit (Video Calls)
    LIVEKIT_API_KEY: Optional[str] = None
    LIVEKIT_API_SECRET: Optional[str] = None
    LIVEKIT_URL: Optional[str] = None

    # AI Models (Gemini Fallback + Groq Primary)
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None  # Primary AI provider (cloud-based)

    # JWT Secret for signature verification
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # External ML API
    ANEMIA_API_URL: str = "https://sunay-potnuru-netra-anemia.hf.space"
    MENTAL_HEALTH_API_URL: str = "https://sunay-potnuru-netra-mental.hf.space"
    CATARACT_API_URL: str = "https://sunay-potnuru-netra-cataract.hf.space"
    DR_API_URL: str = "https://sunay-potnuru-netra-dr.hf.space"
    PARKINSONS_API_URL: str = "https://sunay-potnuru-netra-parkinsons.hf.space"
    CHATBOT_API_URL: str = "https://sujay-potnuru-netra-chatbot.hf.space"
    EMERGENCY_API_URL: str = "https://sujay-potnuru-netra-emergency.hf.space"
    LIBRETRANSLATE_URL: str = "http://libretranslate:5000"
    REDIS_URL: str = "redis://redis:6379"

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Twilio SMS Gateway
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = "+1234567890"
    SOS_EMERGENCY_PHONE: str = "+919999999999"

    # SendGrid Email Gateway
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@netra-ai.com"
    SENDGRID_FROM_NAME: str = "Netra AI"

    # Environment and Feature Flags
    ENVIRONMENT: str = "development"  # development, staging, production
    ALLOW_MOCK_RESPONSES: bool = False  # Explicit opt-in required for mock responses

    # Frontend/API
    API_V1_STR: str = "/api/v1"

    # Development — set BYPASS_AUTH=true in .env for local dev only
    BYPASS_AUTH: bool = False

    # Payments — set ENABLE_PAYMENTS=false to skip Razorpay during testing
    ENABLE_PAYMENTS: bool = True

    model_config = {
        "env_file": _ENV_FILE,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "case_sensitive": True,
    }


settings = Settings()
