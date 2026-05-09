import logging
import httpx
import time
from typing import Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

# LibreTranslate configuration
LIBRETRANSLATE_URL = settings.LIBRETRANSLATE_URL

# Simple in-memory cache for translations (TTL: 1 hour)
_translation_cache: Dict[str, tuple[str, float]] = {}
CACHE_TTL = 3600  # 1 hour in seconds

# Languages supported by LibreTranslate
SUPPORTED_LANGUAGES = {
    # Indian Languages (Primary)
    "en": "en",  # English
    "hi": "hi",  # Hindi
    "mr": "mr",  # Marathi
    "ta": "ta",  # Tamil
    "te": "te",  # Telugu
    "bn": "bn",  # Bengali
    "gu": "gu",  # Gujarati
    "kn": "kn",  # Kannada
    "ml": "ml",  # Malayalam
    "pa": "pa",  # Punjabi
    "ur": "ur",  # Urdu
    # International Languages
    "ar": "ar",  # Arabic
    "de": "de",  # German
    "es": "es",  # Spanish
    "fr": "fr",  # French
    "it": "it",  # Italian
    "ja": "ja",  # Japanese
    "ko": "ko",  # Korean
    "pt": "pt",  # Portuguese
    "ru": "ru",  # Russian
    "zh": "zh",  # Chinese
}

# Fallback mapping for unsupported languages (if any)
LANGUAGE_FALLBACKS = {
    "or": "hi",  # Odia -> Hindi (not in LibreTranslate)
    "as": "hi",  # Assamese -> Hindi (not in LibreTranslate)
    "sa": "hi",  # Sanskrit -> Hindi (not in LibreTranslate)
}


def get_effective_language(lang_code: str) -> str:
    """Get the effective language code for translation."""
    if lang_code in SUPPORTED_LANGUAGES:
        return lang_code
    return LANGUAGE_FALLBACKS.get(lang_code, "en")


async def is_libretranslate_available() -> bool:
    """Check if LibreTranslate service is available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{LIBRETRANSLATE_URL}/languages")
            return response.status_code == 200
    except Exception as e:
        logger.warning(f"LibreTranslate not available: {e}")
        return False


async def translate_text(text: str, target_lang: str, source_lang: str = "en") -> str:
    """
    Translation service with LibreTranslate integration.

    For supported languages, uses LibreTranslate API.
    For unsupported languages, falls back to Hindi or returns original text.
    Frontend handles UI translations using i18next (static translations).

    This service is primarily for dynamic content translation (user messages, etc.).
    """
    if not text or not text.strip():
        return text

    # Get effective languages (with fallbacks)
    effective_source = get_effective_language(source_lang)
    effective_target = get_effective_language(target_lang)

    # If same language, return original
    if effective_source == effective_target:
        return text

    # Create cache key
    cache_key = f"{text}:{effective_source}:{effective_target}"

    # Check cache first
    if cache_key in _translation_cache:
        cached_translation, cached_time = _translation_cache[cache_key]
        # Check if cache is still valid (not expired)
        if time.time() - cached_time < CACHE_TTL:
            logger.info(
                f"Translation cache hit for {effective_source} -> {effective_target}"
            )
            return cached_translation
        else:
            # Remove expired entry
            del _translation_cache[cache_key]
            logger.info(
                f"Translation cache expired for {effective_source} -> {effective_target}"
            )

    logger.info(
        f"Translation requested: {source_lang} -> {target_lang} (effective: {effective_source} -> {effective_target})"
    )

    # Try LibreTranslate if available
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{LIBRETRANSLATE_URL}/translate",
                json={
                    "q": text,
                    "source": effective_source,
                    "target": effective_target,
                    "format": "text",
                },
            )

            if response.status_code == 200:
                result = response.json()
                translated_text = result.get("translatedText", text)

                # Store in cache
                _translation_cache[cache_key] = (translated_text, time.time())
                logger.info(
                    f"Translation cached for {effective_source} -> {effective_target}"
                )

                # Log fallback usage
                if target_lang != effective_target:
                    logger.info(
                        f"Used fallback language {effective_target} for {target_lang}"
                    )

                # Clean up expired cache entries periodically (every 100 translations)
                if len(_translation_cache) > 100:
                    current_time = time.time()
                    expired_keys = [
                        k
                        for k, (_, t) in _translation_cache.items()
                        if current_time - t >= CACHE_TTL
                    ]
                    for k in expired_keys:
                        del _translation_cache[k]
                    if expired_keys:
                        logger.info(
                            f"Cleaned up {len(expired_keys)} expired cache entries"
                        )

                return translated_text
            else:
                logger.error(
                    f"LibreTranslate API error: {response.status_code} - {response.text}"
                )

    except Exception as e:
        logger.error(f"LibreTranslate translation error: {e}")

    # Fallback: return original text
    logger.info("Translation service unavailable - returning original text")
    return text


async def get_supported_languages() -> dict:
    """Get list of supported languages with fallback information."""
    available = await is_libretranslate_available()
    return {
        "supported": list(SUPPORTED_LANGUAGES.keys()),
        "fallbacks": LANGUAGE_FALLBACKS,
        "service_available": available,
    }
