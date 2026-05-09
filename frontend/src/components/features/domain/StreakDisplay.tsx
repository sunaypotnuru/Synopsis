import { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useTranslation } from "react-i18next";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
}

interface StreakDisplayProps {
  userId?: string;
  compact?: boolean;
}

export default function StreakDisplay({ userId, compact = false }: StreakDisplayProps) {
  const { t } = useTranslation();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreakData();
  }, [userId]);

  const fetchStreakData = async () => {
    try {
      const response = await api.get('/api/v1/gamification/streaks');
      setStreakData(response.data);
    } catch (error) {
      console.error('Failed to fetch streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!streakData) return null;

  const { current_streak, longest_streak } = streakData;

  // Motivational messages based on streak
  const getMotivationalMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return "You're on fire! 🔥";
    if (streak < 30) return "Amazing consistency!";
    if (streak < 100) return "Streak master! 💪";
    return "Legendary streak! 🏆";
  };

  // Flame color based on streak
  const getFlameColor = (streak: number) => {
    if (streak === 0) return "text-gray-400";
    if (streak < 7) return "text-orange-500";
    if (streak < 30) return "text-red-500";
    if (streak < 100) return "text-purple-500";
    return "text-yellow-500";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
        <motion.div
          animate={{
            scale: current_streak > 0 ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: current_streak > 0 ? Infinity : 0,
            repeatType: "reverse",
          }}
        >
          <Flame className={`h-8 w-8 ${getFlameColor(current_streak)}`} />
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{current_streak}</span>
            <span className="text-sm text-gray-600">day streak</span>
          </div>
          <p className="text-xs text-gray-500">{getMotivationalMessage(current_streak)}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-6 w-6" />{t('components.streak_display.login_streak', "Login Streak")}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Current Streak */}
          <div className="text-center">
            <motion.div
              animate={{
                scale: current_streak > 0 ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: current_streak > 0 ? Infinity : 0,
                repeatType: "reverse",
              }}
              className="mb-3"
            >
              <Flame className={`h-16 w-16 mx-auto ${getFlameColor(current_streak)}`} />
            </motion.div>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {current_streak}
            </div>
            <div className="text-sm text-gray-600 mb-2">{t('components.streak_display.current_streak_1', "Current Streak")}</div>
            <Badge variant="secondary" className="text-xs">
              {getMotivationalMessage(current_streak)}
            </Badge>
          </div>

          {/* Longest Streak */}
          <div className="text-center">
            <div className="mb-3">
              <Trophy className="h-16 w-16 mx-auto text-yellow-500" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {longest_streak}
            </div>
            <div className="text-sm text-gray-600 mb-2">{t('components.streak_display.best_streak_2', "Best Streak")}</div>
            {current_streak === longest_streak && current_streak > 0 && (
              <Badge variant="default" className="text-xs bg-yellow-500">
                <TrendingUp className="h-3 w-3 mr-1" />{t('components.streak_display.new_record_3', "New Record!")}</Badge>
            )}
          </div>
        </div>

        {/* Streak Calendar Preview */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{t('components.streak_display.last_7_days_4', "Last 7 Days")}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            {[...Array(7)].map((_, i) => {
              const isActive = i < current_streak && current_streak <= 7;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isActive ? (
                    <Flame className="h-5 w-5" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Streak Milestones */}
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm text-gray-600 mb-3">{t('components.streak_display.next_milestone_5', "Next Milestone")}</div>
          <div className="space-y-2">
            {[
              { days: 7, label: 'Week Warrior', icon: '🔥' },
              { days: 30, label: 'Month Master', icon: '💪' },
              { days: 100, label: 'Century Club', icon: '🏆' },
              { days: 365, label: 'Year Legend', icon: '👑' },
            ].map((milestone) => {
              const isCompleted = current_streak >= milestone.days;
              const isNext = current_streak < milestone.days && 
                            (current_streak >= (milestone.days / 2) || milestone.days === 7);
              
              if (!isNext && !isCompleted) return null;

              return (
                <div
                  key={milestone.days}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCompleted
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{milestone.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{milestone.label}</div>
                      <div className="text-xs text-gray-500">{milestone.days} days</div>
                    </div>
                  </div>
                  {isCompleted ? (
                    <Badge variant="default" className="bg-green-500">{t('components.streak_display.completed_6', "Completed!")}</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {milestone.days - current_streak} days to go
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
