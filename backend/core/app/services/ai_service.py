"""
AI Service with Groq Integration (Production-Ready)

Triple-Fallback Strategy:
1. Groq (Primary) - Fast, free, generous limits (llama-3.3-70b-versatile)
2. Gemini (Secondary) - Reliable Google fallback (gemini-1.5-flash)

Replaces Ollama (9GB DeepSeek R1) with cloud-based Groq API.
No model download needed - works immediately on Render.
"""

import logging
import os
from typing import List, Dict, Any
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

import warnings

# Import google.generativeai only if needed (avoids CI issues)
# Suppress FutureWarning about package deprecation - we're aware and will migrate when needed
with warnings.catch_warnings():
    warnings.simplefilter("ignore", category=FutureWarning)
    warnings.simplefilter("ignore", category=DeprecationWarning)
    try:
        import google.generativeai as genai

        GENAI_AVAILABLE = True
    except ImportError:
        logger.warning("⚠️ google-generativeai not available - Gemini fallback disabled")
        genai = None
        GENAI_AVAILABLE = False


class AIService:
    """
    Production-ready AI service with dual-fallback strategy.
    Optimized for hackathon deployment on Render.
    """

    def __init__(self):
        self.groq_client = None
        self.gemini_model = None

        # 1. Initialize Groq (Primary - Fast + Free)
        if os.getenv("GROQ_API_KEY"):
            try:
                self.groq_client = OpenAI(
                    api_key=os.getenv("GROQ_API_KEY"),
                    base_url="https://api.groq.com/openai/v1",
                )
                logger.info(
                    "✅ Groq AI initialized (Primary) - llama-3.3-70b-versatile"
                )
                logger.info(
                    "   Free Tier: 1,000 requests/day, 100K tokens/day, 500+ tok/sec"
                )
            except Exception as e:
                logger.error(f"❌ Groq initialization failed: {e}")
        else:
            logger.warning("⚠️ GROQ_API_KEY not found - Groq unavailable")

        # 2. Initialize Gemini (Secondary - Reliable Fallback)
        gemini_api_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY")
        if GENAI_AVAILABLE and gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("✅ Gemini AI initialized (Secondary Fallback)")
                logger.info("   Free Tier: 1,500 requests/day")
            except Exception as e:
                logger.error(f"❌ Gemini initialization failed: {e}")
        elif not GENAI_AVAILABLE:
            logger.warning("⚠️ google-generativeai not installed - Gemini unavailable")
        else:
            logger.warning("⚠️ GEMINI_API_KEY not found - No fallback available!")
        self.groq_ready = self.groq_client is not None
        self.gemini_ready = self.gemini_model is not None
        self.use_ollama = False  # Legacy support for ai.py

    async def chat(
        self,
        prompt: str,
        system_prompt: str = "",
        history: List[Dict] = [],
        format: str = "text",
    ) -> Dict[str, Any]:
        """
        Main chat interface with dual-fallback logic.

        Args:
            prompt: User message
            system_prompt: System instructions
            history: Conversation history [{"role": "user/assistant", "content": "..."}]
            format: "text" or "json"

        Returns:
            {
                "content": str,
                "model": str,
                "provider": str,
                "success": bool,
                "error": str (optional)
            }
        """

        # 1. Try Groq first (Primary - Fast + Generous Free Tier)
        if self.groq_client:
            try:
                return await self._chat_groq(prompt, system_prompt, history, format)
            except Exception as e:
                logger.warning(f"⚠️ Groq failed: {e}. Trying Gemini fallback...")

        # 2. Fallback to Gemini (Secondary - Most Reliable)
        if self.gemini_model:
            try:
                return await self._chat_gemini(prompt, system_prompt, history, format)
            except Exception as e:
                logger.error(f"❌ All AI providers failed. Last error (Gemini): {e}")

        # All providers failed
        return {
            "content": "AI services are currently unavailable. Please try again later.",
            "model": "none",
            "provider": "none",
            "success": False,
            "error": "All AI providers unavailable (Groq, Gemini)",
        }

    async def _chat_groq(
        self, prompt: str, system_prompt: str, history: List[Dict], format: str
    ) -> Dict[str, Any]:
        """Chat using Groq API (llama-3.3-70b-versatile)."""
        logger.info("🚀 Using Groq AI (llama-3.3-70b-versatile)...")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        for msg in history:
            messages.append(msg)

        messages.append({"role": "user", "content": prompt})

        # Add JSON instruction if requested
        if format == "json":
            messages.append(
                {
                    "role": "system",
                    "content": "IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no explanations.",
                }
            )

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Best quality on free tier
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            top_p=1,
            stream=False,
        )

        content = response.choices[0].message.content

        # Clean up JSON response if needed
        if format == "json":
            content = content.replace("```json", "").replace("```", "").strip()

        logger.info(f"✅ Groq response received ({len(content)} chars)")

        return {
            "content": content,
            "model": "llama-3.3-70b-versatile",
            "provider": "Groq (Cloud)",
            "success": True,
        }

    async def _chat_gemini(
        self, prompt: str, system_prompt: str, history: List[Dict], format: str
    ) -> Dict[str, Any]:
        """Chat using Google Gemini API (gemini-1.5-flash)."""
        logger.info("☁️ Using Google Gemini AI (Fallback)...")

        # Combine system prompt and history into Gemini format
        full_prompt = ""
        if system_prompt:
            full_prompt += f"System: {system_prompt}\n\n"

        for msg in history:
            role = "Assistant" if msg["role"] == "assistant" else "User"
            full_prompt += f"{role}: {msg['content']}\n"

        full_prompt += f"User: {prompt}"

        # Add JSON instruction if requested
        if format == "json":
            full_prompt += "\n\nIMPORTANT: Respond ONLY with a valid JSON object."

        response = self.gemini_model.generate_content(full_prompt)

        # Clean up JSON response if needed
        content = response.text
        if format == "json":
            content = content.replace("```json", "").replace("```", "").strip()

        logger.info(f"✅ Gemini response received ({len(content)} chars)")

        return {
            "content": content,
            "model": "gemini-1.5-flash",
            "provider": "Google Gemini (Cloud)",
            "success": True,
        }


# Global instance
ai_service = AIService()
