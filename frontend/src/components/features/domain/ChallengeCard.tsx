import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Target, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  target_value: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  current_progress?: number;
  completed?: boolean;
  completed_at?: string;
}

interface ChallengeCardProps {
  challenges: Challenge[];
  onStartChallenge?: (challengeId: string) => void;
}

const typeColors = {
  daily: "from-blue-500 to-cyan-500",
  weekly: "from-green-500 to-emerald-500",
  monthly: "from-purple-500 to-pink-500",
  special: "from-yellow-500 to-orange-500",
};

const typeIcons = {
  daily: "📅",
  weekly: "📆",
  monthly: "🗓️",
  special: "⭐",
};

export default function ChallengeCard({ challenges, onStartChallenge }: ChallengeCardProps) {
  const { t } = useTranslation();
  const activeChallenges = challenges.filter((c) => !c.completed);
  const completedChallenges = challenges.filter((c) => c.completed);

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="space-y-8">
      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-4">
            Active Challenges ({activeChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => {
              const progress = challenge.current_progress || 0;
              const progressPercent = (progress / challenge.target_value) * 100;
              const daysLeft = getDaysRemaining(challenge.end_date);

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-5 border-2 border-[#0D9488] bg-white shadow-md hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                            typeColors[challenge.type as keyof typeof typeColors]
                          } flex items-center justify-center text-xl shadow-md`}
                        >
                          {typeIcons[challenge.type as keyof typeof typeIcons]}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#0F172A] text-sm">
                            {challenge.name}
                          </h4>
                          <span className="text-xs text-[#64748B] capitalize">
                            {challenge.type} • {challenge.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-bold">
                          {challenge.reward_points}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-[#64748B] mb-4">
                      {challenge.description}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 text-xs text-[#64748B]">
                            <Target className="w-3 h-3" />
                            <span>{t('components.challenge_card.progress', "Progress")}</span>
                          </div>
                          <span className="text-xs font-semibold text-[#0F172A]">
                            {progress}/{challenge.target_value}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-[#64748B]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {daysLeft === 0
                              ? "Ends today"
                              : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
                          </span>
                        </div>
                        {progress === 0 && onStartChallenge && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/10"
                            onClick={() => onStartChallenge(challenge.id)}
                          >{t('components.challenge_card.start_challenge_1', "Start Challenge")}</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-4">
            Completed Challenges ({completedChallenges.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedChallenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-5 border border-green-200 bg-green-50/50 opacity-80">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-xl shadow-md">
                        ✓
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A] text-sm">
                          {challenge.name}
                        </h4>
                        <span className="text-xs text-[#64748B]">{t('components.challenge_card.completed_2', "Completed")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-bold">
                        +{challenge.reward_points}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[#64748B] mb-3">
                    {challenge.description}
                  </p>

                  {challenge.completed_at && (
                    <div className="flex items-center gap-1 text-xs text-[#64748B]">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Completed on{" "}
                        {new Date(challenge.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">{t('components.challenge_card.no_challenges_yet_3', "No Challenges Yet")}</h3>
          <p className="text-[#64748B]">{t('components.challenge_card.check_back_soon_for_4', "Check back soon for new challenges to earn rewards!")}</p>
        </Card>
      )}
    </div>
  );
}
