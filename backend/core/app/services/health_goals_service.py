"""
Health Goals Service

Manages health goals and progress tracking:
- Create and manage health goals
- Track progress over time
- Award achievements
- Calculate statistics
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4

from app.db.schema import Tables, Col
from app.services.supabase import supabase


class HealthGoalsService:
    """Service for managing health goals"""

    def __init__(self):
        self.supabase = supabase

    async def create_goal(
        self, patient_id: str, goal_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a health goal

        Args:
            patient_id: Patient's user ID
            goal_data: Goal data

        Returns:
            Created goal data
        """
        goal = {
            Col.HealthGoals.ID: str(uuid4()),
            Col.HealthGoals.PATIENT_ID: patient_id,
            Col.HealthGoals.GOAL_TYPE: goal_data["goal_type"],
            Col.HealthGoals.TITLE: goal_data["title"],
            Col.HealthGoals.DESCRIPTION: goal_data.get("description"),
            Col.HealthGoals.TARGET_VALUE: goal_data["target_value"],
            Col.HealthGoals.CURRENT_VALUE: goal_data["current_value"],
            Col.HealthGoals.UNIT: goal_data["unit"],
            Col.HealthGoals.START_DATE: goal_data["start_date"],
            Col.HealthGoals.TARGET_DATE: goal_data["target_date"],
            Col.HealthGoals.STATUS: "active",
            Col.HealthGoals.PROGRESS_PERCENTAGE: 0.0,
            Col.HealthGoals.CREATED_AT: datetime.now().isoformat(),
            Col.HealthGoals.UPDATED_AT: datetime.now().isoformat(),
        }

        response = self.supabase.table(Tables.HEALTH_GOALS).insert(goal).execute()

        if response.data:
            return response.data[0]

        raise Exception("Failed to create health goal")

    async def get_goal(self, goal_id: str, patient_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a health goal by ID

        Args:
            goal_id: Goal ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            Goal data or None
        """
        response = (
            self.supabase.table(Tables.HEALTH_GOALS)
            .select("*")
            .eq(Col.HealthGoals.ID, goal_id)
            .eq(Col.HealthGoals.PATIENT_ID, patient_id)
            .execute()
        )

        return response.data[0] if response.data else None

    async def get_goals(
        self,
        patient_id: str,
        status: Optional[str] = None,
        goal_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get health goals for a patient

        Args:
            patient_id: Patient's user ID
            status: Filter by status ('active', 'completed', 'abandoned')
            goal_type: Filter by goal type
            limit: Maximum number of goals to return
            offset: Number of goals to skip

        Returns:
            Dictionary with goals and pagination info
        """
        query = (
            self.supabase.table(Tables.HEALTH_GOALS)
            .select("*", count="exact")
            .eq(Col.HealthGoals.PATIENT_ID, patient_id)
        )

        if status:
            query = query.eq(Col.HealthGoals.STATUS, status)

        if goal_type:
            query = query.eq(Col.HealthGoals.GOAL_TYPE, goal_type)

        query = query.order(Col.HealthGoals.CREATED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "goals": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    async def update_goal(
        self, goal_id: str, patient_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a health goal

        Args:
            goal_id: Goal ID
            patient_id: Patient's user ID (for authorization)
            update_data: Fields to update

        Returns:
            Updated goal data
        """
        update_data[Col.HealthGoals.UPDATED_AT] = datetime.now().isoformat()

        response = (
            self.supabase.table(Tables.HEALTH_GOALS)
            .update(update_data)
            .eq(Col.HealthGoals.ID, goal_id)
            .eq(Col.HealthGoals.PATIENT_ID, patient_id)
            .execute()
        )

        if response.data:
            return response.data[0]

        raise Exception("Failed to update health goal")

    async def delete_goal(self, goal_id: str, patient_id: str) -> bool:
        """
        Delete a health goal

        Args:
            goal_id: Goal ID
            patient_id: Patient's user ID (for authorization)

        Returns:
            True if deleted successfully
        """
        response = (
            self.supabase.table(Tables.HEALTH_GOALS)
            .delete()
            .eq(Col.HealthGoals.ID, goal_id)
            .eq(Col.HealthGoals.PATIENT_ID, patient_id)
            .execute()
        )

        return bool(response.data)

    # ─── Goal Progress ──────────────────────────────────────────────────────

    async def log_progress(
        self, patient_id: str, progress_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Log progress for a health goal

        Args:
            patient_id: Patient's user ID
            progress_data: Progress data

        Returns:
            Created progress data
        """
        # Verify goal belongs to patient
        goal = await self.get_goal(progress_data["goal_id"], patient_id)
        if not goal:
            raise Exception("Goal not found")

        progress = {
            Col.GoalProgress.ID: str(uuid4()),
            Col.GoalProgress.GOAL_ID: progress_data["goal_id"],
            Col.GoalProgress.VALUE: progress_data["value"],
            Col.GoalProgress.RECORDED_AT: datetime.now().isoformat(),
            Col.GoalProgress.NOTES: progress_data.get("notes"),
        }

        response = self.supabase.table(Tables.GOAL_PROGRESS).insert(progress).execute()

        if response.data:
            # Check for achievements
            await self._check_achievements(
                patient_id, progress_data["goal_id"], progress_data["value"]
            )

            # Progress percentage and current value will be updated by database trigger
            return response.data[0]

        raise Exception("Failed to log progress")

    async def get_progress(
        self,
        goal_id: str,
        patient_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get progress history for a goal

        Args:
            goal_id: Goal ID
            patient_id: Patient's user ID (for authorization)
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of progress entries to return
            offset: Number of entries to skip

        Returns:
            Dictionary with progress entries and pagination info
        """
        # Verify goal belongs to patient
        goal = await self.get_goal(goal_id, patient_id)
        if not goal:
            raise Exception("Goal not found")

        query = (
            self.supabase.table(Tables.GOAL_PROGRESS)
            .select("*", count="exact")
            .eq(Col.GoalProgress.GOAL_ID, goal_id)
        )

        if start_date:
            query = query.gte(Col.GoalProgress.RECORDED_AT, start_date)

        if end_date:
            query = query.lte(Col.GoalProgress.RECORDED_AT, end_date)

        query = query.order(Col.GoalProgress.RECORDED_AT, desc=True)
        query = query.range(offset, offset + limit - 1)

        response = query.execute()

        return {
            "progress": response.data if response.data else [],
            "total": response.count or 0,
            "has_more": (response.count or 0) > (offset + limit),
        }

    # ─── Achievements ───────────────────────────────────────────────────────

    async def _check_achievements(
        self, patient_id: str, goal_id: str, new_value: float
    ) -> None:
        """
        Check and award achievements based on progress

        Args:
            patient_id: Patient's user ID
            goal_id: Goal ID
            new_value: New progress value
        """
        goal = await self.get_goal(goal_id, patient_id)
        if not goal:
            return

        target_value = float(goal[Col.HealthGoals.TARGET_VALUE])
        progress_percentage = (
            (new_value / target_value * 100) if target_value > 0 else 0
        )

        # Check for milestone achievements (25%, 50%, 75%)
        milestones = [
            (25, "Quarter Way There!"),
            (50, "Halfway Champion!"),
            (75, "Almost There!"),
        ]

        for milestone_percent, title in milestones:
            if progress_percentage >= milestone_percent:
                # Check if achievement already exists
                existing = await self._get_achievement(
                    patient_id, goal_id, "milestone", title
                )
                if not existing:
                    await self._award_achievement(
                        patient_id,
                        goal_id,
                        "milestone",
                        title,
                        f"Reached {milestone_percent}% of your goal: {goal[Col.HealthGoals.TITLE]}",
                        "🎯",
                    )

        # Check for completion
        if progress_percentage >= 100:
            existing = await self._get_achievement(
                patient_id, goal_id, "completion", "Goal Completed!"
            )
            if not existing:
                await self._award_achievement(
                    patient_id,
                    goal_id,
                    "completion",
                    "Goal Completed!",
                    f"Congratulations! You completed your goal: {goal[Col.HealthGoals.TITLE]}",
                    "🏆",
                )

    async def _get_achievement(
        self, patient_id: str, goal_id: str, achievement_type: str, title: str
    ) -> Optional[Dict[str, Any]]:
        """Check if achievement already exists"""
        response = (
            self.supabase.table(Tables.GOAL_ACHIEVEMENTS)
            .select("*")
            .eq(Col.GoalAchievements.PATIENT_ID, patient_id)
            .eq(Col.GoalAchievements.GOAL_ID, goal_id)
            .eq(Col.GoalAchievements.ACHIEVEMENT_TYPE, achievement_type)
            .eq(Col.GoalAchievements.TITLE, title)
            .execute()
        )

        return response.data[0] if response.data else None

    async def _award_achievement(
        self,
        patient_id: str,
        goal_id: str,
        achievement_type: str,
        title: str,
        description: str,
        badge_icon: str,
    ) -> Dict[str, Any]:
        """Award an achievement"""
        achievement = {
            Col.GoalAchievements.ID: str(uuid4()),
            Col.GoalAchievements.PATIENT_ID: patient_id,
            Col.GoalAchievements.GOAL_ID: goal_id,
            Col.GoalAchievements.ACHIEVEMENT_TYPE: achievement_type,
            Col.GoalAchievements.TITLE: title,
            Col.GoalAchievements.DESCRIPTION: description,
            Col.GoalAchievements.BADGE_ICON: badge_icon,
            Col.GoalAchievements.EARNED_AT: datetime.now().isoformat(),
        }

        response = (
            self.supabase.table(Tables.GOAL_ACHIEVEMENTS).insert(achievement).execute()
        )

        return response.data[0] if response.data else {}

    async def get_achievements(self, patient_id: str) -> List[Dict[str, Any]]:
        """
        Get all achievements for a patient

        Args:
            patient_id: Patient's user ID

        Returns:
            List of achievements
        """
        response = (
            self.supabase.table(Tables.GOAL_ACHIEVEMENTS)
            .select("*")
            .eq(Col.GoalAchievements.PATIENT_ID, patient_id)
            .order(Col.GoalAchievements.EARNED_AT, desc=True)
            .execute()
        )

        return response.data if response.data else []

    # ─── Statistics ─────────────────────────────────────────────────────────

    async def get_statistics(self, patient_id: str) -> Dict[str, Any]:
        """
        Get goal statistics for a patient

        Args:
            patient_id: Patient's user ID

        Returns:
            Dictionary with statistics
        """
        # Get all goals
        all_goals_response = (
            self.supabase.table(Tables.HEALTH_GOALS)
            .select("*")
            .eq(Col.HealthGoals.PATIENT_ID, patient_id)
            .execute()
        )
        all_goals = all_goals_response.data if all_goals_response.data else []

        total_goals = len(all_goals)
        active_goals = sum(
            1 for g in all_goals if g[Col.HealthGoals.STATUS] == "active"
        )
        completed_goals = sum(
            1 for g in all_goals if g[Col.HealthGoals.STATUS] == "completed"
        )

        # Calculate average progress
        if all_goals:
            total_progress = sum(
                float(g.get(Col.HealthGoals.PROGRESS_PERCENTAGE, 0))
                for g in all_goals
                if g[Col.HealthGoals.STATUS] == "active"
            )
            average_progress = total_progress / active_goals if active_goals > 0 else 0
        else:
            average_progress = 0

        # Get total achievements
        achievements_response = (
            self.supabase.table(Tables.GOAL_ACHIEVEMENTS)
            .select("*", count="exact")
            .eq(Col.GoalAchievements.PATIENT_ID, patient_id)
            .execute()
        )
        total_achievements = achievements_response.count or 0

        return {
            "total_goals": total_goals,
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "average_progress": round(average_progress, 2),
            "total_achievements": total_achievements,
        }


# Singleton instance
_health_goals_service = None


def get_health_goals_service() -> HealthGoalsService:
    """Get or create health goals service instance"""
    global _health_goals_service
    if _health_goals_service is None:
        _health_goals_service = HealthGoalsService()
    return _health_goals_service
