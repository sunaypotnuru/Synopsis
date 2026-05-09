"""
Configuration Management Routes
Provides system-wide configuration management and feature toggles.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.security import get_current_admin, TokenPayload
from app.services.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/config", tags=["admin", "configuration"])


class ConfigUpdate(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None


class FeatureToggle(BaseModel):
    feature_name: str
    enabled: bool


# Default system configuration
DEFAULT_CONFIG = {
    "session_timeout_minutes": 60,
    "max_concurrent_sessions": 3,
    "rate_limit_per_minute": 100,
    "maintenance_mode": False,
    "ai_nurse_enabled": True,
    "mental_health_chatbot_enabled": True,
    "emergency_services_enabled": True,
    "email_notifications_enabled": True,
    "sms_notifications_enabled": True,
    "push_notifications_enabled": True,
    "max_file_upload_mb": 10,
    "allowed_file_types": ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
    "password_min_length": 8,
    "password_require_uppercase": True,
    "password_require_lowercase": True,
    "password_require_numbers": True,
    "password_require_special": True,
    "failed_login_attempts_limit": 5,
    "account_lockout_duration_minutes": 30,
    "2fa_enforcement": False,
    "ip_whitelist_enabled": False,
}


async def get_config_from_db(key: Optional[str] = None) -> Dict:
    """Retrieve configuration from database."""
    try:
        if key:
            result = (
                supabase.table("system_config").select("*").eq("key", key).execute()
            )

            if result.data and len(result.data) > 0:
                return {key: result.data[0]["value"]}
            else:
                # Return default if not found
                return {key: DEFAULT_CONFIG.get(key)}
        else:
            # Get all configuration
            result = supabase.table("system_config").select("*").execute()

            config = DEFAULT_CONFIG.copy()
            if result.data:
                for item in result.data:
                    config[item["key"]] = item["value"]

            return config
    except Exception:
        # If table doesn't exist or error, return defaults
        return DEFAULT_CONFIG if not key else {key: DEFAULT_CONFIG.get(key)}


async def set_config_in_db(
    key: str, value: Any, description: Optional[str], user_id: str
) -> bool:
    """Store configuration in database."""
    try:
        # Check if key exists
        existing = (
            supabase.table("system_config").select("key").eq("key", key).execute()
        )

        if existing.data and len(existing.data) > 0:
            # Update existing
            supabase.table("system_config").update(
                {
                    "value": value,
                    "description": description,
                    "updated_by": user_id,
                    "updated_at": datetime.now().isoformat(),
                }
            ).eq("key", key).execute()
        else:
            # Insert new
            supabase.table("system_config").insert(
                {
                    "key": key,
                    "value": value,
                    "description": description,
                    "updated_by": user_id,
                    "updated_at": datetime.now().isoformat(),
                }
            ).execute()

        return True
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update configuration: {str(e)}"
        )


@router.get("")
async def get_configuration(
    key: Optional[str] = None, current_user: TokenPayload = Depends(get_current_admin)
):
    """
    Get system configuration settings.

    Parameters:
    - key: Optional specific configuration key to retrieve

    Returns:
    - All configuration settings or specific key value
    """
    config = await get_config_from_db(key)

    return {"configuration": config, "timestamp": datetime.now().isoformat()}


@router.put("")
async def update_configuration(
    config_update: ConfigUpdate, current_user: TokenPayload = Depends(get_current_admin)
):
    """
    Update a system configuration setting.

    Body:
    - key: Configuration key to update
    - value: New value for the configuration
    - description: Optional description of the setting

    Returns:
    - Updated configuration
    """
    # Validate key exists in defaults
    if config_update.key not in DEFAULT_CONFIG:
        raise HTTPException(
            status_code=400, detail=f"Invalid configuration key: {config_update.key}"
        )

    # Store in database
    await set_config_in_db(
        config_update.key,
        config_update.value,
        config_update.description,
        current_user.sub,
    )

    # Log the configuration change
    try:
        supabase.table("audit_logs").insert(
            {
                "user_id": current_user.sub,
                "user_role": current_user.role,
                "action": "UPDATE",
                "resource_type": "system_config",
                "resource_id": config_update.key,
                "details": {
                    "key": config_update.key,
                    "new_value": config_update.value,
                    "description": config_update.description,
                },
                "status": "SUCCESS",
                "phi_accessed": False,
            }
        ).execute()
    except Exception as e:
        logger.debug(f"Audit logging skipped (best-effort): {e}")

    return {
        "message": "Configuration updated successfully",
        "key": config_update.key,
        "value": config_update.value,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/feature-toggle")
async def toggle_feature(
    toggle: FeatureToggle, current_user: TokenPayload = Depends(get_current_admin)
):
    """
    Enable or disable a feature flag.

    Body:
    - feature_name: Name of the feature to toggle
    - enabled: True to enable, False to disable

    Supported features:
    - ai_nurse_enabled
    - mental_health_chatbot_enabled
    - emergency_services_enabled
    - email_notifications_enabled
    - sms_notifications_enabled
    - push_notifications_enabled
    - 2fa_enforcement
    - ip_whitelist_enabled
    - maintenance_mode

    Returns:
    - Updated feature status
    """
    # Validate feature name
    valid_features = [
        "ai_nurse_enabled",
        "mental_health_chatbot_enabled",
        "emergency_services_enabled",
        "email_notifications_enabled",
        "sms_notifications_enabled",
        "push_notifications_enabled",
        "2fa_enforcement",
        "ip_whitelist_enabled",
        "maintenance_mode",
    ]

    if toggle.feature_name not in valid_features:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid feature name. Valid features: {', '.join(valid_features)}",
        )

    # Update configuration
    await set_config_in_db(
        toggle.feature_name,
        toggle.enabled,
        f"Feature toggle for {toggle.feature_name}",
        current_user.sub,
    )

    # Log the feature toggle
    try:
        supabase.table("audit_logs").insert(
            {
                "user_id": current_user.sub,
                "user_role": current_user.role,
                "action": "FEATURE_TOGGLE",
                "resource_type": "system_config",
                "resource_id": toggle.feature_name,
                "details": {"feature": toggle.feature_name, "enabled": toggle.enabled},
                "status": "SUCCESS",
                "phi_accessed": False,
            }
        ).execute()
    except Exception as e:
        logger.debug(f"Audit logging skipped (best-effort): {e}")

    return {
        "message": f"Feature {'enabled' if toggle.enabled else 'disabled'} successfully",
        "feature": toggle.feature_name,
        "enabled": toggle.enabled,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/features")
async def get_feature_flags(current_user: TokenPayload = Depends(get_current_admin)):
    """
    Get all feature flags and their current status.

    Returns:
    - Dictionary of all feature flags and their enabled/disabled status
    """
    config = await get_config_from_db()

    features = {
        "ai_nurse": config.get("ai_nurse_enabled", True),
        "mental_health_chatbot": config.get("mental_health_chatbot_enabled", True),
        "emergency_services": config.get("emergency_services_enabled", True),
        "email_notifications": config.get("email_notifications_enabled", True),
        "sms_notifications": config.get("sms_notifications_enabled", True),
        "push_notifications": config.get("push_notifications_enabled", True),
        "2fa_enforcement": config.get("2fa_enforcement", False),
        "ip_whitelist": config.get("ip_whitelist_enabled", False),
        "maintenance_mode": config.get("maintenance_mode", False),
    }

    return {"features": features, "timestamp": datetime.now().isoformat()}


@router.post("/reset")
async def reset_configuration(current_user: TokenPayload = Depends(get_current_admin)):
    """
    Reset all configuration to default values.

    WARNING: This will reset ALL system configuration to defaults.
    Use with caution.

    Returns:
    - Confirmation message
    """
    try:
        # Delete all configuration from database
        supabase.table("system_config").delete().neq("key", "").execute()

        # Log the reset
        supabase.table("audit_logs").insert(
            {
                "user_id": current_user.sub,
                "user_role": current_user.role,
                "action": "RESET",
                "resource_type": "system_config",
                "resource_id": "all",
                "details": {"action": "reset_all_configuration"},
                "status": "SUCCESS",
                "phi_accessed": False,
            }
        ).execute()

        return {
            "message": "Configuration reset to defaults successfully",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset configuration: {str(e)}"
        )
