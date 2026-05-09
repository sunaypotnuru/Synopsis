import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Lock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  points_reward: number;
  earned?: boolean;
  earned_at?: string;
}

interface BadgeDisplayProps {
  badges: Badge[];
}

const rarityColors = {
  common: "from-gray-400 to-gray-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-600",
};

const rarityBorders = {
  common: "border-gray-300",
  rare: "border-blue-400",
  epic: "border-purple-400",
  legendary: "border-yellow-400",
};

export default function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const { t } = useTranslation();
  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  return (
    <div className="space-y-8">
      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-4">
            {t('components.badge_display.earned_badges', 'Earned Badges')} ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`p-4 text-center border-2 ${
                    rarityBorders[badge.rarity as keyof typeof rarityBorders]
                  } bg-white shadow-md hover:shadow-lg transition-all`}
                >
                  <div
                    className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${
                      rarityColors[badge.rarity as keyof typeof rarityColors]
                    } flex items-center justify-center text-3xl shadow-lg`}
                  >
                    {badge.icon}
                  </div>
                  <h4 className="font-bold text-[#0F172A] text-sm mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-[#64748B] mb-2">
                    {badge.description}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-[#0F172A]">
                      +{badge.points_reward} pts
                    </span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${
                        rarityColors[badge.rarity as keyof typeof rarityColors]
                      }`}
                    >
                      {badge.rarity}
                    </span>
                  </div>
                  {badge.earned_at && (
                    <p className="text-xs text-[#64748B] mt-2">
                      {t('components.badge_display.earned', 'Earned')} {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-4">
            {t('components.badge_display.locked_badges', 'Locked Badges')} ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4 text-center border border-gray-200 bg-gray-50 opacity-60 grayscale">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-300 flex items-center justify-center text-3xl relative">
                    <span className="opacity-30">{badge.icon}</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                  </div>
                  <h4 className="font-bold text-[#0F172A] text-sm mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-[#64748B] mb-2">
                    {badge.description}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Star className="w-3 h-3 text-gray-400" />
                    <span className="font-semibold text-gray-500">
                      +{badge.points_reward} pts
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-gray-500 bg-gray-200">
                      {badge.rarity}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
