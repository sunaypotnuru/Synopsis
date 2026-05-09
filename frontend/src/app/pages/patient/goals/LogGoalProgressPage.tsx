import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  TrendingUp,
  Save,
  FileText,
  Target
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { HealthGoal } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function LogGoalProgressPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();

  const [goal, setGoal] = useState<HealthGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (goalId) {
      fetchGoalDetails();
    }
     
  }, [goalId]);

  const fetchGoalDetails = async () => {
    if (!goalId) return;

    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getGoal(goalId);
      const goalData = response.data;
      setGoal(goalData);
      // Pre-fill with current value
      setValue(goalData.current_value.toString());
    } catch (error) {
      console.error("Error fetching goal:", error);
      toast.error(t('patient.goals.load_failed', "Failed to load goal"));
      navigate("/patient/goals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goalId || !goal) return;

    if (!value || parseFloat(value) < 0) {
      toast.error(t('patient.goals.value_required', "Please enter a valid value"));
      return;
    }

    setIsSaving(true);
    try {
      await patientPortalAPI.logGoalProgress(goalId, {
        value: parseFloat(value),
        notes: notes.trim() || undefined
      });

      toast.success(t('patient.goals.progress_logged', "Progress logged successfully!"));
      navigate(`/patient/goals/${goalId}`);
    } catch (error) {
      console.error("Error logging progress:", error);
      toast.error(t('patient.goals.log_failed', "Failed to log progress"));
    } finally {
      setIsSaving(false);
    }
  };

  const getGoalTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      weight: "⚖️",
      steps: "👟",
      exercise: "💪",
      sleep: "😴",
      water: "💧",
      blood_pressure: "❤️",
      blood_sugar: "🩸",
      custom: "🎯"
    };
    return icons[type] || "🎯";
  };

  const calculateNewProgress = () => {
    if (!goal || !value) return 0;
    const numValue = parseFloat(value);
    const progress = ((numValue - 0) / (goal.target_value - 0)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const newProgress = calculateNewProgress();
  const progressDiff = goal ? newProgress - goal.progress_percentage : 0;

  if (isLoading || !goal) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.goals.loading', "Loading...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate(`/patient/goals/${goalId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.goals.back_to_details', "Back to Goal Details")}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 bg-white border-gray-100 shadow-sm">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{getGoalTypeIcon(goal.goal_type)}</div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {t('patient.goals.log_progress', "Log Progress")}
                  </h1>
                  <p className="text-gray-600">
                    {t('patient.goals.log_for', "Logging for")}: <span className="font-semibold text-teal-600">{goal.title}</span>
                  </p>
                </div>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('patient.goals.current', "Current")}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {goal.current_value} {goal.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('patient.goals.target', "Target")}
                  </p>
                  <p className="text-lg font-bold text-teal-600">
                    {goal.target_value} {goal.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('patient.goals.progress', "Progress")}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {goal.progress_percentage}%
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Value Input */}
              <div>
                <Label className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {t('patient.goals.new_value', "New Value")} ({goal.unit})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`${t('patient.goals.enter_value', "Enter value")} (${goal.unit})`}
                  required
                  className="text-2xl font-bold h-16"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {t('patient.goals.value_hint', "Enter your current measurement or progress value")}
                </p>
              </div>

              {/* Progress Preview */}
              {value && parseFloat(value) >= 0 && (
                <Card className="p-4 bg-teal-50 border-teal-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-teal-900">
                      {t('patient.goals.new_progress', "New Progress")}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-teal-700">
                        {newProgress.toFixed(1)}%
                      </span>
                      {progressDiff !== 0 && (
                        <span className={`text-sm font-medium ${progressDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({progressDiff > 0 ? '+' : ''}{progressDiff.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-5 h-5 ${progressDiff >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <p className="text-sm text-teal-700">
                      {progressDiff > 0
                        ? t('patient.goals.great_progress', "Great progress! Keep it up!")
                        : progressDiff < 0
                        ? t('patient.goals.keep_trying', "Keep trying! Every step counts.")
                        : t('patient.goals.no_change', "No change from last entry")}
                    </p>
                  </div>
                </Card>
              )}

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('patient.goals.notes', "Notes")} ({t('common.optional', "Optional")})
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('patient.goals.notes_placeholder', "How are you feeling? Any challenges or wins to note?")}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('patient.goals.notes_hint', "Add any observations, feelings, or context about this progress entry")}
                </p>
              </div>

              {/* Quick Tips */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  💡 {t('patient.goals.tips_title', "Tips for Success")}
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>{t('patient.goals.tip1', "Log your progress regularly for better tracking")}</li>
                  <li>{t('patient.goals.tip2', "Be honest with your measurements")}</li>
                  <li>{t('patient.goals.tip3', "Celebrate small wins along the way")}</li>
                </ul>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/patient/goals/${goalId}`)}
                  className="flex-1"
                  disabled={isSaving}
                >
                  {t('common.cancel', "Cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.saving', "Saving...")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('patient.goals.save_progress', "Save Progress")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




