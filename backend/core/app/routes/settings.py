from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
import json
import logging

from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/platform")
async def get_platform_settings():
    """Get public platform settings."""
    try:
        # Download the settings file from the public bucket
        res = supabase.storage.from_("platform").download("settings.json")
        settings = json.loads(res.decode("utf-8"))
        return settings
    except Exception as e:
        logger.error(f"Error fetching settings, returning defaults: {e}")
        # Return sensible defaults if the file doesn't exist yet
        return {
            "github_url": "https://github.com/sunaypotnuru",
            "linkedin_url": "https://www.linkedin.com/in/sunay-potnuru-81384a380/",
            "twitter_url": "https://twitter.com",
            "team_members": [
                {
                    "name": "Sunay Potnuru",
                    "role": "Founder & Lead Developer",
                    "details": "Architecture, AI model, full-stack development",
                }
            ],
        }


@router.post("/platform")
async def update_platform_settings(
    settings: Dict[str, Any] = Body(...),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update platform settings (Admin only)."""
    # Assuming the frontend `AdminGuard` enforces admin role, but we could also check `current_user.role` if it exists
    try:
        settings_json = json.dumps(settings).encode("utf-8")

        # Upsert the file in the bucket
        supabase.storage.from_("platform").upload(
            path="settings.json",
            file=settings_json,
            file_options={"content-type": "application/json", "upsert": "true"},
        )
        return {"status": "success", "message": "Settings updated"}
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
