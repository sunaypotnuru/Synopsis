from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict
from pydantic import BaseModel
from datetime import datetime
import logging
import uuid
from app.core.security import get_current_user, get_current_admin
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
import csv
import io

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/i18n", tags=["Internationalization"])

# ─── Supported Languages ─────────────────────────────────

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native_name": "English", "rtl": False},
    "es": {"name": "Spanish", "native_name": "Español", "rtl": False},
    "fr": {"name": "French", "native_name": "Français", "rtl": False},
    "de": {"name": "German", "native_name": "Deutsch", "rtl": False},
    "ar": {"name": "Arabic", "native_name": "العربية", "rtl": True},
    "hi": {"name": "Hindi", "native_name": "हिन्दी", "rtl": False},
    "kn": {"name": "Kannada", "native_name": "ಕನ್ನಡ", "rtl": False},
    "mr": {"name": "Marathi", "native_name": "मराठी", "rtl": False},
    "zh": {"name": "Chinese", "native_name": "中文", "rtl": False},
    "pt": {"name": "Portuguese", "native_name": "Português", "rtl": False},
    "ru": {"name": "Russian", "native_name": "Русский", "rtl": False},
    "ja": {"name": "Japanese", "native_name": "日本語", "rtl": False},
}

# ─── Schemas ─────────────────────────────────────────────


class TranslationCreate(BaseModel):
    key: str
    language: str
    value: str
    namespace: str = "common"
    description: Optional[str] = None


class TranslationUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class BulkTranslationImport(BaseModel):
    language: str
    namespace: str = "common"
    translations: Dict[str, str]


# ─── Language Management ─────────────────────────────────


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages."""
    return {"languages": SUPPORTED_LANGUAGES, "default": "en"}


@router.get("/languages/{lang_code}")
async def get_language_info(lang_code: str):
    """Get information about a specific language."""
    if lang_code not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=404, detail="Language not supported")

    return {"code": lang_code, **SUPPORTED_LANGUAGES[lang_code]}


# ─── Translation Management ─────────────────────────────


@router.get("/translations")
async def get_translations(
    language: str = Query("en"),
    namespace: str = Query("common"),
    current_user: Optional[TokenPayload] = Depends(get_current_user),
):
    """Get all translations for a specific language and namespace."""
    try:
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Language not supported")
        res = (
            supabase.table("translations")
            .select("*")
            .eq("language", language)
            .eq("namespace", namespace)
            .execute()
        )

        # Convert to key-value format
        translations = {}
        for item in res.data or []:
            if isinstance(item, dict) and "key" in item and "value" in item:
                translations[str(item["key"])] = str(item["value"])

        # If no translations found, return English defaults
        if not translations and language != "en":
            en_res = (
                supabase.table("translations")
                .select("*")
                .eq("language", "en")
                .eq("namespace", namespace)
                .execute()
            )
            for item in en_res.data or []:
                if isinstance(item, dict) and "key" in item and "value" in item:
                    translations[str(item["key"])] = str(item["value"])

        return {
            "language": language,
            "namespace": namespace,
            "translations": translations,
            "rtl": SUPPORTED_LANGUAGES[language]["rtl"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get translations error: {str(e)}")
        # Return empty translations on error
        return {
            "language": language,
            "namespace": namespace,
            "translations": {},
            "rtl": SUPPORTED_LANGUAGES.get(language, {}).get("rtl", False),
        }


@router.get("/translations/key/{key}")
async def get_translation_by_key(
    key: str, language: str = Query("en"), namespace: str = Query("common")
):
    """Get a specific translation by key."""
    try:
        res = (
            supabase.table("translations")
            .select("*")
            .eq("key", key)
            .eq("language", language)
            .eq("namespace", namespace)
            .execute()
        )

        if not res.data:
            # Fallback to English
            en_res = (
                supabase.table("translations")
                .select("*")
                .eq("key", key)
                .eq("language", "en")
                .eq("namespace", namespace)
                .execute()
            )
            if en_res.data:
                return {"translation": en_res.data[0]}
            raise HTTPException(status_code=404, detail="Translation not found")

        return {"translation": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get translation by key error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translations")
async def create_translation(
    translation: TranslationCreate,
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Create a new translation."""
    try:
        if translation.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Language not supported")

        translation_id = str(uuid.uuid4())
        translation_record = {
            "id": translation_id,
            "key": translation.key,
            "language": translation.language,
            "value": translation.value,
            "namespace": translation.namespace,
            "description": translation.description,
            "created_by": current_user.sub,
            "created_at": datetime.now().isoformat(),
        }

        try:
            res = supabase.table("translations").insert(translation_record).execute()
            saved_translation = res.data[0] if res.data else translation_record
        except Exception as db_err:
            logger.warning(f"Translations table error: {db_err}")
            saved_translation = translation_record

        return {
            "message": "Translation created successfully",
            "translation_id": translation_id,
            "translation": saved_translation,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/translations/{translation_id}")
async def update_translation(
    translation_id: str,
    update: TranslationUpdate,
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Update an existing translation."""
    try:
        update_data = {
            "value": update.value,
            "updated_at": datetime.now().isoformat(),
            "updated_by": current_user.sub,
        }

        if update.description is not None:
            update_data["description"] = update.description
        res = (
            supabase.table("translations")
            .update(update_data)
            .eq("id", translation_id)
            .execute()
        )

        return {
            "message": "Translation updated successfully",
            "translation": res.data[0] if res.data else None,
        }
    except Exception as e:
        logger.error(f"Update translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/translations/{translation_id}")
async def delete_translation(
    translation_id: str, current_user: TokenPayload = Depends(get_current_admin)
):
    """Delete a translation."""
    try:
        supabase.table("translations").delete().eq("id", translation_id).execute()
        return {"message": "Translation deleted successfully"}
    except Exception as e:
        logger.error(f"Delete translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Bulk Operations ─────────────────────────────────────


@router.post("/translations/bulk/import")
async def bulk_import_translations(
    import_data: BulkTranslationImport,
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Bulk import translations for a language."""
    try:
        if import_data.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Language not supported")

        imported_count = 0
        updated_count = 0

        for key, value in import_data.translations.items():
            # Check if translation exists
            existing = (
                supabase.table("translations")
                .select("*")
                .eq("key", key)
                .eq("language", import_data.language)
                .eq("namespace", import_data.namespace)
                .execute()
            )

            if existing and hasattr(existing, "data") and existing.data:
                # Type safe access
                data = existing.data
                existing_id = None
                if isinstance(data, list) and len(data) > 0:
                    item = data[0]
                    if isinstance(item, dict):
                        existing_id = item.get("id")
                elif isinstance(data, dict):
                    existing_id = data.get("id")

                if existing_id:
                    # Update
                    supabase.table("translations").update(
                        {
                            "value": value,
                            "updated_at": datetime.now().isoformat(),
                            "updated_by": current_user.sub,
                        }
                    ).eq("id", existing_id).execute()
                    updated_count += 1
            else:
                # Insert
                translation_record = {
                    "id": str(uuid.uuid4()),
                    "key": key,
                    "language": import_data.language,
                    "value": value,
                    "namespace": import_data.namespace,
                    "created_by": current_user.sub,
                    "created_at": datetime.now().isoformat(),
                }
                try:
                    supabase.table("translations").insert(translation_record).execute()
                    imported_count += 1
                except Exception as db_err:
                    logger.warning(f"Insert translation error: {db_err}")

        return {
            "message": "Bulk import completed",
            "imported": imported_count,
            "updated": updated_count,
            "total": imported_count + updated_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk import translations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/translations/export")
async def export_translations(
    language: str = Query("en"),
    namespace: str = Query("common"),
    format: str = Query("json", pattern="^(json|csv)$"),
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Export translations for a language."""
    try:
        res = (
            supabase.table("translations")
            .select("*")
            .eq("language", language)
            .eq("namespace", namespace)
            .execute()
        )

        translations = {}
        for item in res.data or []:
            if isinstance(item, dict) and "key" in item and "value" in item:
                translations[str(item["key"])] = str(item["value"])

        if format == "json":
            return {
                "language": language,
                "namespace": namespace,
                "translations": translations,
                "exported_at": datetime.now().isoformat(),
            }
        else:  # CSV
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Key", "Value"])

            for key, value in translations.items():
                writer.writerow([key, value])

            csv_content = output.getvalue()
            output.close()

            return {
                "format": "csv",
                "content": csv_content,
                "filename": f"translations_{language}_{namespace}.csv",
            }
    except Exception as e:
        logger.error(f"Export translations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── User Language Preferences ─────────────────────────────


@router.get("/user/language")
async def get_user_language(current_user: TokenPayload = Depends(get_current_user)):
    """Get current user's language preference."""
    try:
        res = (
            supabase.table("user_preferences")
            .select("language")
            .eq("user_id", current_user.sub)
            .execute()
        )

        if res.data and isinstance(res.data, list) and len(res.data) > 0:
            item = res.data[0]
            if isinstance(item, dict):
                language = str(item.get("language", "en"))
            else:
                language = "en"
        else:
            language = "en"  # Default

        return {
            "language": language,
            "info": SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en"]),
        }
    except Exception as e:
        logger.error(f"Get user language error: {str(e)}")
        return {"language": "en", "info": SUPPORTED_LANGUAGES["en"]}


@router.put("/user/language")
async def set_user_language(
    language: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Set current user's language preference."""
    try:
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Language not supported")

        # Check if preferences exist
        existing = (
            supabase.table("user_preferences")
            .select("*")
            .eq("user_id", current_user.sub)
            .execute()
        )

        if existing.data:
            # Update
            supabase.table("user_preferences").update(
                {"language": language, "updated_at": datetime.now().isoformat()}
            ).eq("user_id", current_user.sub).execute()
        else:
            # Insert
            supabase.table("user_preferences").insert(
                {
                    "user_id": current_user.sub,
                    "language": language,
                    "created_at": datetime.now().isoformat(),
                }
            ).execute()

        return {
            "message": "Language preference updated",
            "language": language,
            "info": SUPPORTED_LANGUAGES[language],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set user language error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Translation Statistics ─────────────────────────────


@router.get("/stats")
async def get_translation_stats(
    current_user: TokenPayload = Depends(get_current_admin),
):
    """Get translation coverage statistics."""
    try:
        stats = {}

        # Get English translations as baseline
        en_res = (
            supabase.table("translations")
            .select("key, namespace")
            .eq("language", "en")
            .execute()
        )
        en_keys = set()
        for t in en_res.data or []:
            if isinstance(t, dict) and "key" in t and "namespace" in t:
                en_keys.add((str(t["key"]), str(t["namespace"])))
        total_keys = len(en_keys)

        for lang_code in SUPPORTED_LANGUAGES.keys():
            if lang_code == "en":
                stats[lang_code] = {
                    "total": total_keys,
                    "translated": total_keys,
                    "missing": 0,
                    "coverage": 100.0,
                }
                continue

            # Get translations for this language
            lang_res = (
                supabase.table("translations")
                .select("key, namespace")
                .eq("language", lang_code)
                .execute()
            )
            lang_keys = set()
            for t in lang_res.data or []:
                if isinstance(t, dict) and "key" in t and "namespace" in t:
                    lang_keys.add((str(t["key"]), str(t["namespace"])))

            translated = len(lang_keys)
            missing = total_keys - translated
            coverage = (translated / total_keys * 100) if total_keys > 0 else 0

            stats[lang_code] = {
                "total": total_keys,
                "translated": translated,
                "missing": missing,
                "coverage": round(coverage, 2),
            }

        return {
            "statistics": stats,
            "overall_coverage": round(
                sum(s["coverage"] for s in stats.values()) / len(stats), 2
            ),
        }
    except Exception as e:
        logger.error(f"Get translation stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/missing/{language}")
async def get_missing_translations(language: str, namespace: str = Query("common")):
    """Get list of missing translations for a language."""
    try:
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Language not supported")

        # Get English keys
        en_res = (
            supabase.table("translations")
            .select("key")
            .eq("language", "en")
            .eq("namespace", namespace)
            .execute()
        )
        en_keys = set()
        for t in en_res.data or []:
            if isinstance(t, dict) and "key" in t:
                en_keys.add(str(t["key"]))
        # en_keys = set(t["key"] for t in (en_res.data or []))

        # Get language keys
        lang_res = (
            supabase.table("translations")
            .select("key")
            .eq("language", language)
            .eq("namespace", namespace)
            .execute()
        )
        lang_keys = set()
        for t in lang_res.data or []:
            if isinstance(t, dict) and "key" in t:
                lang_keys.add(str(t["key"]))
        # lang_keys = set(t["key"] for t in (lang_res.data or []))

        # Find missing
        missing_keys = list(en_keys - lang_keys)

        return {
            "language": language,
            "namespace": namespace,
            "missing_count": len(missing_keys),
            "missing_keys": missing_keys,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get missing translations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
