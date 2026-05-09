from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preferences", tags=["Preferences"])


class DashboardLayoutRequest(BaseModel):
    layout: List[Dict[str, Any]]


class WidgetVisibilityRequest(BaseModel):
    widgets: Dict[str, bool]


class ThemePreferenceRequest(BaseModel):
    theme: str  # light, dark, auto


class NotificationPreferenceRequest(BaseModel):
    email_enabled: Optional[bool] = True
    push_enabled: Optional[bool] = True
    sms_enabled: Optional[bool] = False
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    appointment_reminders: Optional[bool] = True
    scan_results: Optional[bool] = True
    prescription_updates: Optional[bool] = True
    marketing: Optional[bool] = False
    newsletter: Optional[bool] = True


@router.post("/dashboard-layout")
async def save_dashboard_layout(
    request: DashboardLayoutRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Save user's dashboard layout preferences."""
    try:
        user_id = current_user.sub

        # Check if preferences exist
        existing = (
            supabase.table("dashboard_preferences")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data:
            # Update existing
            supabase.table("dashboard_preferences").update(
                {"layout": request.layout}
            ).eq("user_id", user_id).execute()
        else:
            # Create new
            supabase.table("dashboard_preferences").insert(
                {"user_id": user_id, "layout": request.layout}
            ).execute()

        return {"message": "Layout saved successfully", "layout": request.layout}
    except Exception as e:
        logger.error(f"Failed to save layout: {e}")
        # Fail gracefully - layout is saved in localStorage anyway
        return {"message": "Layout saved locally", "error": str(e)}


@router.get("/dashboard-layout")
async def get_dashboard_layout(current_user: TokenPayload = Depends(get_current_user)):
    """Get user's dashboard layout preferences."""
    try:
        user_id = current_user.sub

        result = (
            supabase.table("dashboard_preferences")
            .select("layout")
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if result.data:
            return {"layout": result.data.get("layout")}
        else:
            return {"layout": None}
    except Exception as e:
        logger.warning(f"Failed to get layout: {e}")
        return {"layout": None}


@router.post("/dashboard-layout/reset")
async def reset_dashboard_layout(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Reset dashboard layout to default."""
    try:
        user_id = current_user.sub

        # Default layout
        default_layout = [
            {"i": "hero", "x": 0, "y": 0, "w": 8, "h": 4},
            {"i": "healthScore", "x": 8, "y": 0, "w": 4, "h": 4},
            {"i": "loginStreak", "x": 0, "y": 4, "w": 6, "h": 3},
            {"i": "quickActions", "x": 6, "y": 4, "w": 6, "h": 3},
            {"i": "recentScans", "x": 0, "y": 7, "w": 6, "h": 4},
            {"i": "appointments", "x": 6, "y": 7, "w": 6, "h": 4},
        ]

        supabase.table("dashboard_preferences").upsert(
            {"user_id": user_id, "layout": default_layout}
        ).execute()

        return {"message": "Layout reset to default", "layout": default_layout}
    except Exception as e:
        logger.error(f"Failed to reset layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/widgets")
async def save_widget_visibility(
    request: WidgetVisibilityRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Save widget visibility preferences."""
    try:
        user_id = current_user.sub

        supabase.table("dashboard_preferences").upsert(
            {"user_id": user_id, "visible_widgets": request.widgets}
        ).execute()

        return {"message": "Widget preferences saved", "widgets": request.widgets}
    except Exception as e:
        logger.error(f"Failed to save widget preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/widgets")
async def get_widget_visibility(current_user: TokenPayload = Depends(get_current_user)):
    """Get widget visibility preferences."""
    try:
        user_id = current_user.sub

        result = (
            supabase.table("dashboard_preferences")
            .select("visible_widgets")
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if result.data and result.data.get("visible_widgets"):
            return {"widgets": result.data["visible_widgets"]}
        else:
            # Return default all visible
            return {
                "widgets": {
                    "hero": True,
                    "healthScore": True,
                    "loginStreak": True,
                    "quickActions": True,
                    "recentScans": True,
                    "appointments": True,
                }
            }
    except Exception as e:
        logger.warning(f"Failed to get widget preferences: {e}")
        return {"widgets": {}}


@router.post("/theme")
async def save_theme_preference(
    request: ThemePreferenceRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Save theme preference."""
    try:
        user_id = current_user.sub

        supabase.table("user_preferences").upsert(
            {"user_id": user_id, "theme": request.theme}
        ).execute()

        return {"message": "Theme preference saved", "theme": request.theme}
    except Exception as e:
        logger.error(f"Failed to save theme: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/theme")
async def get_theme_preference(current_user: TokenPayload = Depends(get_current_user)):
    """Get theme preference."""
    try:
        user_id = current_user.sub

        result = (
            supabase.table("user_preferences")
            .select("theme")
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if result.data:
            return {"theme": result.data.get("theme", "light")}
        else:
            return {"theme": "light"}
    except Exception as e:
        logger.warning(f"Failed to get theme: {e}")
        return {"theme": "light"}


@router.post("/notifications")
async def save_notification_preferences(
    request: NotificationPreferenceRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Save notification preferences."""
    try:
        user_id = current_user.sub

        # Handle both naming conventions (email_enabled and email_notifications)
        email_val = (
            request.email_enabled
            if request.email_enabled is not None
            else request.email_notifications
        )
        push_val = (
            request.push_enabled
            if request.push_enabled is not None
            else request.push_notifications
        )
        sms_val = (
            request.sms_enabled
            if request.sms_enabled is not None
            else request.sms_notifications
        )

        # Check if preferences exist
        existing = (
            supabase.table("notification_preferences")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )

        # Prepare data
        data: Dict[str, Any] = {
            "email_enabled": email_val if email_val is not None else True,
            "push_enabled": push_val if push_val is not None else True,
            "sms_enabled": sms_val if sms_val is not None else False,
            "appointment_reminders": (
                request.appointment_reminders
                if request.appointment_reminders is not None
                else True
            ),
            "scan_results": (
                request.scan_results if request.scan_results is not None else True
            ),
            "prescription_updates": (
                request.prescription_updates
                if request.prescription_updates is not None
                else True
            ),
            "marketing": request.marketing if request.marketing is not None else False,
            "newsletter": (
                request.newsletter if request.newsletter is not None else True
            ),
        }

        if existing.data and len(existing.data) > 0:
            # Update existing record
            result = (
                supabase.table("notification_preferences")
                .update(data)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            # Insert new record
            data["user_id"] = user_id
            data["email_enabled"] = bool(data.get("email_enabled", True))
            result = supabase.table("notification_preferences").insert(data).execute()

        logger.info(f"Notification preferences saved for user {user_id}")
        return {
            "success": True,
            "message": "Notification preferences saved successfully",
            "data": result.data[0] if result.data else data,
        }
    except Exception as e:
        logger.error(
            f"Failed to save notification preferences for user {user_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to save preferences: {str(e)}"
        )


@router.get("/notifications")
async def get_notification_preferences(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get notification preferences."""
    try:
        user_id = current_user.sub

        result = (
            supabase.table("notification_preferences")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return {"success": True, "data": result.data[0]}
        else:
            # Return defaults
            return {
                "success": True,
                "data": {
                    "email_notifications": True,
                    "push_notifications": True,
                    "sms_notifications": False,
                    "in_app_notifications": True,
                    "email_enabled": True,
                    "push_enabled": True,
                    "sms_enabled": False,
                    "in_app_enabled": True,
                },
            }
    except Exception as e:
        logger.warning(f"Failed to get notification preferences: {e}")
        return {
            "success": True,
            "data": {
                "email_notifications": True,
                "push_notifications": True,
                "sms_notifications": False,
            },
        }
