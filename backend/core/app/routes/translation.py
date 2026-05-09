from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.translation import translate_text, get_supported_languages

router = APIRouter(prefix="/translation", tags=["Translation"])


class TranslationRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: str = "en"


class TranslationResponse(BaseModel):
    translated_text: str


@router.post("", response_model=TranslationResponse)
async def translate(req: TranslationRequest):
    """
    Translate text to a target language.
    Supports LibreTranslate languages with fallbacks for unsupported languages.
    """
    try:
        translated = await translate_text(req.text, req.target_lang, req.source_lang)
        return {"translated_text": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/languages")
async def get_languages():
    """
    Get supported languages and service status.
    """
    try:
        return await get_supported_languages()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
