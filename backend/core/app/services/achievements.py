import logging
from app.services.supabase import supabase

logger = logging.getLogger(__name__)


async def record_achievement_progress(
    user_id: str, code: str, increment: int = 1
) -> bool:
    """
    Increment progress for a specific achievement.
    If progress reaches target_value, marks it completed and awards points.
    """
    try:
        # Get achievement details
        ach_res = supabase.table("achievements").select("*").eq("code", code).execute()
        if not ach_res.data:
            logger.warning(f"Achievement code {code} not found in DB.")
            return False

        achievement = ach_res.data[0]
        achievement_id = achievement["id"]
        target = achievement["target_value"]
        points = achievement["points"]

        # Determine current user progress
        ua_res = (
            supabase.table("user_achievements")
            .select("*")
            .eq("user_id", user_id)
            .eq("achievement_id", achievement_id)
            .execute()
        )

        if not ua_res.data:
            # Create first progress entry
            new_progress = min(increment, target)
            is_completed = new_progress >= target
            data = {
                "user_id": user_id,
                "achievement_id": achievement_id,
                "progress": new_progress,
                "is_completed": is_completed,
            }
            if is_completed:
                data["completed_at"] = "now()"

            supabase.table("user_achievements").insert(data).execute()

            if is_completed:
                _notify_and_grant_points(user_id, achievement["title"], points)
        else:
            # Update existing
            current_ua = ua_res.data[0]
            if current_ua.get("is_completed"):
                return True  # Already completed

            new_progress = min(current_ua["progress"] + increment, target)
            is_completed = new_progress >= target

            update_data = {"progress": new_progress, "is_completed": is_completed}
            if is_completed:
                update_data["completed_at"] = "now()"

            supabase.table("user_achievements").update(update_data).eq(
                "id", current_ua["id"]
            ).execute()

            if is_completed:
                _notify_and_grant_points(user_id, achievement["title"], points)

        return True
    except Exception as e:
        logger.error(f"Error recording achievement progress for {code}: {e}")
        return False


def _notify_and_grant_points(user_id: str, title: str, points: int):
    """Helper to silently update user_points and push notification (soft fail ok)."""
    try:
        # Upsert points
        user_pts_res = (
            supabase.table("user_points").select("*").eq("user_id", user_id).execute()
        )
        if user_pts_res.data:
            curr = user_pts_res.data[0]
            new_tot = curr["total_points"] + points
            new_level = max(curr["level"], (new_tot // 100) + 1)
            supabase.table("user_points").update(
                {"total_points": new_tot, "level": new_level}
            ).eq("id", curr["id"]).execute()
        else:
            supabase.table("user_points").insert(
                {
                    "user_id": user_id,
                    "total_points": points,
                    "level": (points // 100) + 1,
                }
            ).execute()

        # Notification
        supabase.table("notifications").insert(
            {
                "user_id": user_id,
                "type": "achievement",
                "title": "Achievement Unlocked!",
                "message": f"You unlocked '{title}' and earned {points} points!",
                "read": False,
            }
        ).execute()
    except Exception as e:
        logger.warning(f"Could not notify points logic: {e}")
