from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import logging
from datetime import datetime, timedelta

from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase
from app.db.schema import Tables, Col

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gamification", tags=["Gamification"])


# ─── Points helper ──────────────────────────────────────────────────────────────


async def award_points(user_id: str, points: int, achievement_id: Optional[str] = None):
    """
    Award points to a user.
    Uses upsert on user_id so it never creates duplicates.
    user_points columns: user_id, total_points, points_earned_this_month, points_redeemed
    NOTE: there is NO "level" or "achievement_id" column in user_points.
    """
    try:
        existing = (
            supabase.table(Tables.USER_POINTS)
            .select(
                f"{Col.UserPoints.TOTAL_POINTS},{Col.UserPoints.POINTS_EARNED_THIS_MONTH}"
            )
            .eq(Col.UserPoints.USER_ID, user_id)
            .execute()
        )

        if existing.data:
            current = existing.data[0]
            new_total = (current.get(Col.UserPoints.TOTAL_POINTS) or 0) + points
            new_month = (
                current.get(Col.UserPoints.POINTS_EARNED_THIS_MONTH) or 0
            ) + points
        else:
            new_total = points
            new_month = points

        supabase.table(Tables.USER_POINTS).upsert(
            {
                Col.UserPoints.USER_ID: user_id,
                Col.UserPoints.TOTAL_POINTS: new_total,
                Col.UserPoints.POINTS_EARNED_THIS_MONTH: new_month,
            },
            on_conflict=Col.UserPoints.USER_ID,
        ).execute()

        # Notify user of achievement unlock
        if achievement_id:
            ach_res = (
                supabase.table(Tables.ACHIEVEMENTS)
                .select(f"{Col.Achievements.TITLE},{Col.Achievements.POINTS}")
                .eq(Col.Achievements.ID, achievement_id)
                .execute()
            )
            if ach_res.data:
                ach = ach_res.data[0]
                supabase.table(Tables.NOTIFICATIONS).insert(
                    {
                        Col.Notifications.USER_ID: user_id,
                        Col.Notifications.TYPE: "achievement",
                        Col.Notifications.TITLE: "Achievement Unlocked! 🏆",
                        Col.Notifications.MESSAGE: f"You earned '{ach.get(Col.Achievements.TITLE)}' and {points} points!",
                        Col.Notifications.READ: False,
                    }
                ).execute()

        return True
    except Exception as e:
        logger.error(f"award_points error: {e}")
        return False


# ─── Achievements ────────────────────────────────────────────────────────────────


@router.get("/achievements")
async def get_achievements(current_user: TokenPayload = Depends(get_current_user)):
    """Get all achievements and user progress."""
    try:
        role = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else str(current_user.role)
        )

        achievements_res = (
            supabase.table(Tables.ACHIEVEMENTS)
            .select("*")
            .eq(Col.Achievements.ROLE_TYPE, role)
            .execute()
        )
        all_achievements = achievements_res.data or []

        progress_res = (
            supabase.table(Tables.USER_ACHIEVEMENTS)
            .select("*")
            .eq(Col.UserAchievements.USER_ID, current_user.sub)
            .execute()
        )
        user_progress_map = {
            a[Col.UserAchievements.ACHIEVEMENT_ID]: a for a in (progress_res.data or [])
        }

        points_res = (
            supabase.table(Tables.USER_POINTS)
            .select(Col.UserPoints.TOTAL_POINTS)
            .eq(Col.UserPoints.USER_ID, current_user.sub)
            .execute()
        )
        total_points = (
            points_res.data[0][Col.UserPoints.TOTAL_POINTS] if points_res.data else 0
        )
        # Derive level from points (100 pts per level)
        level = max(1, total_points // 100 + 1)

        achievements_with_status = []
        for ach in all_achievements:
            prog = user_progress_map.get(ach[Col.Achievements.ID], {})
            cur_prog = prog.get(Col.UserAchievements.PROGRESS, 0)
            target = ach.get(Col.Achievements.TARGET_VALUE, 1)
            pct = (
                100
                if prog.get(Col.UserAchievements.IS_COMPLETED)
                else (int((cur_prog / target) * 100) if target > 0 else 0)
            )
            achievements_with_status.append(
                {
                    "id": ach[Col.Achievements.ID],
                    "code": ach.get(Col.Achievements.CODE),
                    "name": ach[Col.Achievements.TITLE],
                    "description": ach.get(Col.Achievements.DESCRIPTION, ""),
                    "icon": ach.get(Col.Achievements.ICON, "🏆"),
                    "points": ach.get(Col.Achievements.POINTS, 0),
                    "target_value": target,
                    "current_value": cur_prog,
                    "unlocked": prog.get(Col.UserAchievements.IS_COMPLETED, False),
                    "progress": pct,
                    "completed_at": prog.get(Col.UserAchievements.COMPLETED_AT),
                }
            )

        return {
            "points": total_points,
            "level": level,
            "next_level_points": level * 100,
            "achievements": achievements_with_status,
        }
    except Exception as e:
        logger.error(f"get_achievements error: {e}")
        # Bug 3 Fix: Return empty achievements instead of 500 error when tables don't exist
        return {"points": 0, "level": 1, "next_level_points": 100, "achievements": []}


# ─── Leaderboard ─────────────────────────────────────────────────────────────────


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10, current_user: TokenPayload = Depends(get_current_user)
):
    """Get points leaderboard."""
    try:
        res = (
            supabase.table(Tables.USER_POINTS)
            .select(f"{Col.UserPoints.USER_ID},{Col.UserPoints.TOTAL_POINTS}")
            .order(Col.UserPoints.TOTAL_POINTS, desc=True)
            .limit(limit)
            .execute()
        )

        leaderboard = []
        for idx, entry in enumerate(res.data or []):
            uid = entry[Col.UserPoints.USER_ID]
            pts = entry.get(Col.UserPoints.TOTAL_POINTS, 0)
            level = max(1, pts // 100 + 1)

            user_res = (
                supabase.table(Tables.PROFILES_PATIENT)
                .select(
                    f"{Col.ProfilesPatient.FULL_NAME},{Col.ProfilesPatient.AVATAR_URL}"
                )
                .eq(Col.ProfilesPatient.ID, uid)
                .execute()
            )
            if not user_res.data:
                user_res = (
                    supabase.table(Tables.PROFILES_DOCTOR)
                    .select(
                        f"{Col.ProfilesDoctor.FULL_NAME},{Col.ProfilesDoctor.AVATAR_URL}"
                    )
                    .eq(Col.ProfilesDoctor.ID, uid)
                    .execute()
                )

            leaderboard.append(
                {
                    "rank": idx + 1,
                    "user_id": uid,
                    "name": (
                        user_res.data[0][Col.ProfilesPatient.FULL_NAME]
                        if user_res.data
                        else "Unknown User"
                    ),
                    "avatar": (
                        user_res.data[0].get(Col.ProfilesPatient.AVATAR_URL)
                        if user_res.data
                        else None
                    ),
                    "points": pts,
                    "level": level,
                    "is_current_user": uid == current_user.sub,
                }
            )

        return {"data": leaderboard}
    except Exception as e:
        logger.error(f"get_leaderboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Streaks ─────────────────────────────────────────────────────────────────────


@router.get("/streaks")
async def get_user_streaks(current_user: TokenPayload = Depends(get_current_user)):
    """Get user's login streak data from login_streaks table."""
    try:
        res = (
            supabase.table(Tables.LOGIN_STREAKS)
            .select("*")
            .eq(Col.LoginStreaks.USER_ID, current_user.sub)
            .execute()
        )

        if not res.data:
            return {"current_streak": 0, "longest_streak": 0, "last_login_date": None}

        data = res.data[0]
        return {
            "current_streak": data.get(Col.LoginStreaks.CURRENT_STREAK, 0),
            "longest_streak": data.get(Col.LoginStreaks.LONGEST_STREAK, 0),
            "last_login_date": data.get(Col.LoginStreaks.LAST_LOGIN_DATE),
        }
    except Exception as e:
        logger.warning(f"get_user_streaks error: {e}")
        return {"current_streak": 0, "longest_streak": 0, "last_login_date": None}


@router.post("/track-login")
async def track_login_streak(current_user: TokenPayload = Depends(get_current_user)):
    """Track consecutive daily logins in login_streaks table."""
    try:
        res = (
            supabase.table(Tables.LOGIN_STREAKS)
            .select("*")
            .eq(Col.LoginStreaks.USER_ID, current_user.sub)
            .execute()
        )

        today = datetime.now().date()

        if not res.data:
            streak, longest = 1, 1
            supabase.table(Tables.LOGIN_STREAKS).insert(
                {
                    Col.LoginStreaks.USER_ID: current_user.sub,
                    Col.LoginStreaks.CURRENT_STREAK: streak,
                    Col.LoginStreaks.LONGEST_STREAK: longest,
                    Col.LoginStreaks.LAST_LOGIN_DATE: today.isoformat(),
                }
            ).execute()
        else:
            data = res.data[0]
            raw_last = data.get(Col.LoginStreaks.LAST_LOGIN_DATE)
            last_login = (
                datetime.fromisoformat(str(raw_last)).date()
                if raw_last
                else today - timedelta(days=2)
            )

            if last_login == today:
                streak = data[Col.LoginStreaks.CURRENT_STREAK]
                longest = data.get(Col.LoginStreaks.LONGEST_STREAK, streak)
            elif last_login == today - timedelta(days=1):
                streak = data[Col.LoginStreaks.CURRENT_STREAK] + 1
                longest = max(streak, data.get(Col.LoginStreaks.LONGEST_STREAK, 0))
                supabase.table(Tables.LOGIN_STREAKS).update(
                    {
                        Col.LoginStreaks.CURRENT_STREAK: streak,
                        Col.LoginStreaks.LONGEST_STREAK: longest,
                        Col.LoginStreaks.LAST_LOGIN_DATE: today.isoformat(),
                    }
                ).eq(Col.LoginStreaks.ID, data[Col.LoginStreaks.ID]).execute()
            else:
                streak = 1
                longest = data.get(Col.LoginStreaks.LONGEST_STREAK, 1)
                supabase.table(Tables.LOGIN_STREAKS).update(
                    {
                        Col.LoginStreaks.CURRENT_STREAK: streak,
                        Col.LoginStreaks.LAST_LOGIN_DATE: today.isoformat(),
                    }
                ).eq(Col.LoginStreaks.ID, data[Col.LoginStreaks.ID]).execute()

        if streak >= 7:
            await award_points(current_user.sub, 30)
        if streak >= 30:
            await award_points(current_user.sub, 150)

        return {"streak": streak, "longest_streak": longest}
    except Exception as e:
        logger.warning(f"track_login_streak error: {e}")
        return {"streak": 1, "longest_streak": 1}


# ─── Badges ──────────────────────────────────────────────────────────────────────


@router.get("/badges")
async def get_badges(current_user: TokenPayload = Depends(get_current_user)):
    """Get all badges with user's earned status."""
    try:
        badges_res = supabase.table(Tables.BADGES).select("*").execute()
        user_badges_res = (
            supabase.table(Tables.USER_BADGES)
            .select(f"{Col.UserBadges.BADGE_ID},{Col.UserBadges.EARNED_AT}")
            .eq(Col.UserBadges.USER_ID, current_user.sub)
            .execute()
        )

        earned_map = {
            ub[Col.UserBadges.BADGE_ID]: ub[Col.UserBadges.EARNED_AT]
            for ub in (user_badges_res.data or [])
        }

        return [
            {
                **badge,
                "earned": badge[Col.Badges.ID] in earned_map,
                "earned_at": earned_map.get(badge[Col.Badges.ID]),
            }
            for badge in (badges_res.data or [])
        ]
    except Exception as e:
        logger.error(f"get_badges error: {e}")
        # Bug 3 Fix: Return empty badges instead of 500 error when tables don't exist
        return []


@router.post("/badges/{badge_id}/award")
async def award_badge(
    badge_id: str, user_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Award a badge to a user (admin/system endpoint)."""
    try:
        badge_res = (
            supabase.table(Tables.BADGES)
            .select("*")
            .eq(Col.Badges.ID, badge_id)
            .single()
            .execute()
        )
        if not badge_res.data:
            raise HTTPException(status_code=404, detail="Badge not found")

        existing = (
            supabase.table(Tables.USER_BADGES)
            .select(Col.UserBadges.ID)
            .eq(Col.UserBadges.USER_ID, user_id)
            .eq(Col.UserBadges.BADGE_ID, badge_id)
            .execute()
        )
        if existing.data:
            return {"message": "Badge already awarded"}

        supabase.table(Tables.USER_BADGES).insert(
            {Col.UserBadges.USER_ID: user_id, Col.UserBadges.BADGE_ID: badge_id}
        ).execute()

        pts = badge_res.data.get(Col.Badges.POINTS_REWARD, 0)
        if pts > 0:
            await award_points(user_id, pts)

        return {"message": "Badge awarded successfully", "badge": badge_res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Challenges ──────────────────────────────────────────────────────────────────


@router.get("/challenges")
async def get_challenges(current_user: TokenPayload = Depends(get_current_user)):
    """Get all active challenges with user's progress."""
    try:
        challenges_res = (
            supabase.table(Tables.CHALLENGES)
            .select("*")
            .eq(Col.Challenges.IS_ACTIVE, True)
            .execute()
        )
        user_challenges_res = (
            supabase.table(Tables.USER_CHALLENGES)
            .select("*")
            .eq(Col.UserChallenges.USER_ID, current_user.sub)
            .execute()
        )

        user_progress = {
            uc[Col.UserChallenges.CHALLENGE_ID]: uc
            for uc in (user_challenges_res.data or [])
        }

        return [
            {
                **ch,
                "current_progress": user_progress.get(ch[Col.Challenges.ID], {}).get(
                    Col.UserChallenges.CURRENT_PROGRESS, 0
                ),
                "completed": user_progress.get(ch[Col.Challenges.ID], {}).get(
                    Col.UserChallenges.COMPLETED, False
                ),
                "completed_at": user_progress.get(ch[Col.Challenges.ID], {}).get(
                    Col.UserChallenges.COMPLETED_AT
                ),
            }
            for ch in (challenges_res.data or [])
        ]
    except Exception as e:
        logger.error(f"get_challenges error: {e}")
        # Bug 3 Fix: Return empty challenges instead of 500 error when tables don't exist
        return []


@router.post("/challenges/{challenge_id}/start")
async def start_challenge(
    challenge_id: str, current_user: TokenPayload = Depends(get_current_user)
):
    """Start a challenge for the user."""
    try:
        ch_res = (
            supabase.table(Tables.CHALLENGES)
            .select("*")
            .eq(Col.Challenges.ID, challenge_id)
            .single()
            .execute()
        )
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Challenge not found")

        existing = (
            supabase.table(Tables.USER_CHALLENGES)
            .select(Col.UserChallenges.ID)
            .eq(Col.UserChallenges.USER_ID, current_user.sub)
            .eq(Col.UserChallenges.CHALLENGE_ID, challenge_id)
            .execute()
        )
        if existing.data:
            return {"message": "Challenge already started"}

        supabase.table(Tables.USER_CHALLENGES).insert(
            {
                Col.UserChallenges.USER_ID: current_user.sub,
                Col.UserChallenges.CHALLENGE_ID: challenge_id,
                Col.UserChallenges.CURRENT_PROGRESS: 0,
                Col.UserChallenges.COMPLETED: False,
            }
        ).execute()
        return {"message": "Challenge started successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/challenges/{challenge_id}/progress")
async def update_challenge_progress(
    challenge_id: str,
    progress: int,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update progress for a challenge."""
    try:
        ch_res = (
            supabase.table(Tables.CHALLENGES)
            .select("*")
            .eq(Col.Challenges.ID, challenge_id)
            .single()
            .execute()
        )
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Challenge not found")
        challenge = ch_res.data

        uc_res = (
            supabase.table(Tables.USER_CHALLENGES)
            .select("*")
            .eq(Col.UserChallenges.USER_ID, current_user.sub)
            .eq(Col.UserChallenges.CHALLENGE_ID, challenge_id)
            .single()
            .execute()
        )
        if not uc_res.data:
            raise HTTPException(status_code=404, detail="Challenge not started")

        new_progress = min(progress, challenge[Col.Challenges.TARGET_VALUE])
        completed = new_progress >= challenge[Col.Challenges.TARGET_VALUE]

        update_data: dict = {
            Col.UserChallenges.CURRENT_PROGRESS: new_progress,
            Col.UserChallenges.COMPLETED: completed,
        }
        if completed and not uc_res.data.get(Col.UserChallenges.COMPLETED):
            update_data[Col.UserChallenges.COMPLETED_AT] = datetime.now().isoformat()
            await award_points(
                current_user.sub, challenge.get(Col.Challenges.REWARD_POINTS, 0)
            )

        supabase.table(Tables.USER_CHALLENGES).update(update_data).eq(
            Col.UserChallenges.ID, uc_res.data[Col.UserChallenges.ID]
        ).execute()

        return {
            "message": "Progress updated",
            "completed": completed,
            "progress": new_progress,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
