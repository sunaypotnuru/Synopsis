"""
Warm-up script to load AI services into memory on startup.
This eliminates delays on first request.
"""

import logging
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


async def warmup_deepseek():
    """
    Perform warmup/health check for AI services (Groq + Gemini).
    """
    try:
        logger.info("🔥 Warming up AI services (Groq/Gemini)...")

        result = await ai_service.chat(
            prompt="Hello, are you ready?",
            system_prompt="You are a health assistant performing a startup self-test.",
            format="text",
        )

        if result["success"]:
            logger.info(
                f"✅ AI service ready via {result['provider']} ({result['model']})"
            )
            return True
        else:
            logger.warning("⚠️ AI service warmup returned failure status.")
            return False

    except Exception as e:
        logger.warning(f"⚠️ AI warmup failed: {e}")
        return False


def warmup_deepseek_sync():
    """Synchronous version for use in startup events."""
    try:
        # Since the app lifespan is async, we can just log that we are ready
        # The actual first call will handle the connection
        logger.info("📡 AI services initialized (Groq + Gemini Fallback).")
        return True
    except Exception:
        return False
