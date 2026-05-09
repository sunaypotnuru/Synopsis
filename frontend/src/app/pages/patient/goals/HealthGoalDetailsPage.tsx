import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Target,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Plus
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { HealthGoal, GoalProgress } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function HealthGoalDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId: string }>();

  const [goal, setGoal] = useState<HealthGoal | null>(null);
  const [progressHistory, setProgressHistory] = useState<GoalProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetValue, setEditTargetValue] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "completed" | "abandoned">("active");
  const [isSaving, setIsSaving] = useState(false);

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
      setEditTitle(goalData.title);
      setEditDescription(goalData.description || "");
      setEditTargetValue(goalData.target_value.toString());
      setEditStatus(goalData.status);

      // Mock progress history (in real app, this would come from API)
      const mockProgress: GoalProgress[] = [
        {
          id: "1",
          goal_id: goalId,
          value: goalData.current_value * 0.5,
          recorded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Starting point"
        },
        {
          id: "2",
          goal_id: goalId,
          value: goalData.current_value * 0.7,
          recorded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Good progress"
        },
        {
          id: "3",
          goal_id: goalId,
          value: goalData.current_value,
          recorded_at: new Date().toISOString(),
          notes: "Current"
        }
      ];
      setProgressHistory(mockProgress);

      // Prepare chart data
      const chartPoints = mockProgress.map(p => ({
        date: new Date(p.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: p.value,
        target: goalData.target_value
      }));
      setChartData(chartPoints);
    } catch (error) {
      console.error("Error fetching goal:", error);
      toast.error(t('patient.goals.load_failed', "Failed to load goal details"));
      navigate("/patient/goals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!goalId || !goal) return;

    if (!editTitle.trim()) {
      toast.error(t('patient.goals.title_required', "Goal title is required"));
      return;
    }

    setIsSaving(true);
    try {
      await patientPortalAPI.updateGoal(goalId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        target_value: parseFloat(editTargetValue),
        status: editStatus
      });

      toast.success(t('patient.goals.update_success', "Goal updated successfully"));
      setShowEditDialog(false);
      fetchGoalDetails();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error(t('patient.goals.update_failed', "Failed to update goal"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!goalId) return;

    if (!confirm(t('patient.goals.confirm_delete', "Are you sure you want to delete this goal?"))) {
      return;
    }

    try {
      await patientPortalAPI.deleteGoal(goalId);
      toast.success(t('patient.goals.deleted', "Goal deleted successfully"));
      navigate("/patient/goals");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error(t('patient.goals.delete_failed', "Failed to delete goal"));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'abandoned':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'abandoned':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
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

  const daysRemaining = goal
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (isLoading || !goal) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.goals.loading', "Loading goal...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/goals")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.goals.back_to_goals', "Back to Health Goals")}
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{getGoalTypeIcon(goal.goal_type)}</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {goal.title}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(goal.status)} border flex items-center gap-1`}>
                  {getStatusIcon(goal.status)}
                  {t(`patient.goals.status_${goal.status}`, goal.status)}
                </Badge>
                <span className="text-sm text-gray-500">
                  {t('patient.goals.type', "Type")}: {t(`patient.goals.type_${goal.goal_type}`, goal.goal_type)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowEditDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('common.edit', "Edit")}
            </Button>
            {goal.status === 'active' && (
              <Button
                onClick={() => navigate(`/patient/goals/${goalId}/log`)}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('patient.goals.log_progress', "Log Progress")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card className="p-6 bg-white border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t('patient.goals.progress_tracking', "Progress Tracking")}
                </h2>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('patient.goals.overall_progress', "Overall Progress")}
                  </span>
                  <span className="text-2xl font-bold text-teal-600">
                    {goal.progress_percentage}%
                  </span>
                </div>
                <Progress value={goal.progress_percentage} className="h-3 mb-2" />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{goal.current_value} {goal.unit}</span>
                  <span>{goal.target_value} {goal.unit}</span>
                </div>
              </div>

              {goal.description && (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {goal.description}
                </p>
              )}
            </Card>

            {/* Progress Chart */}
            {chartData.length > 0 && (
              <Card className="p-6 bg-white border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('patient.goals.progress_chart', "Progress Chart")}
                  </h2>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0d9488"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      name={t('patient.goals.current', "Current")}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name={t('patient.goals.target', "Target")}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Progress History */}
            <Card className="p-6 bg-white border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('patient.goals.progress_history', "Progress History")}
                  </h2>
                </div>
                <span className="text-sm text-gray-500">
                  {progressHistory.length} {t('patient.goals.entries', "entries")}
                </span>
              </div>

              {progressHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {t('patient.goals.no_history', "No progress logged yet")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {progressHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {entry.value} {goal.unit}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(entry.recorded_at).toLocaleString()}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Goal Info */}
            <Card className="p-6 bg-white border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('patient.goals.goal_info', "Goal Information")}
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.goals.target_value', "Target Value")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {goal.target_value} {goal.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.goals.current_value', "Current Value")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {goal.current_value} {goal.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.goals.start_date', "Start Date")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {new Date(goal.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.goals.target_date', "Target Date")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {daysRemaining > 0 && goal.status === 'active' && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      {t('patient.goals.days_remaining', `${daysRemaining} days remaining`)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 bg-red-50 border-red-200 shadow-sm">
              <h2 className="text-lg font-bold text-red-900 mb-4">
                {t('patient.goals.danger_zone', "Danger Zone")}
              </h2>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('patient.goals.delete_goal', "Delete Goal")}
              </Button>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('patient.goals.edit_goal', "Edit Goal")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>{t('patient.goals.goal_title', "Goal Title")}</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{t('patient.goals.description', "Description")}</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-2 min-h-[80px]"
                />
              </div>

              <div>
                <Label>{t('patient.goals.target_value', "Target Value")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{t('patient.goals.status', "Status")}</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                  className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                >
                  <option value="active">{t('patient.goals.status_active', "Active")}</option>
                  <option value="completed">{t('patient.goals.status_completed', "Completed")}</option>
                  <option value="abandoned">{t('patient.goals.status_abandoned', "Abandoned")}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowEditDialog(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isSaving}
                >
                  {t('common.cancel', "Cancel")}
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {isSaving ? t('common.saving', "Saving...") : t('common.save', "Save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}




