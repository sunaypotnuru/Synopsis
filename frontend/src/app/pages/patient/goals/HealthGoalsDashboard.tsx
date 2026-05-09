import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  Plus,
  Search,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Calendar,
  Trophy,
  Flame
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { HealthGoal } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function HealthGoalsDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<HealthGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "abandoned">("all");

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    filterGoals();
     
  }, [goals, searchTerm, statusFilter]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getGoals();
      setGoals(response.data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error(t('patient.goals.load_failed', "Failed to load health goals"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = goals;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.goal_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredGoals(filtered);
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-blue-600';
    if (percentage >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalGoals = goals.length;
  const averageProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / goals.length)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.goals.loading', "Loading health goals...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back_to_dashboard', "Back to Dashboard")}
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('patient.goals.title', "Health Goals")}
              </h1>
              <p className="text-gray-500 text-sm">
                {t('patient.goals.subtitle', "Track your progress and achieve your health targets")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/patient/goals/create")}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5" />
            {t('patient.goals.create_goal', "Create Goal")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.goals.total_goals', "Total Goals")}
                </p>
                <p className="text-3xl font-bold text-gray-900">{totalGoals}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.goals.active_goals', "Active Goals")}
                </p>
                <p className="text-3xl font-bold text-blue-600">{activeGoals}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.goals.completed_goals', "Completed")}
                </p>
                <p className="text-3xl font-bold text-green-600">{completedGoals}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.goals.avg_progress', "Avg Progress")}
                </p>
                <p className={`text-3xl font-bold ${getProgressColor(averageProgress)}`}>
                  {averageProgress}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 mb-6 bg-white border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('patient.goals.search_placeholder', "Search goals...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">{t('patient.goals.all_status', "All Status")}</option>
                <option value="active">{t('patient.goals.status_active', "Active")}</option>
                <option value="completed">{t('patient.goals.status_completed', "Completed")}</option>
                <option value="abandoned">{t('patient.goals.status_abandoned', "Abandoned")}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <Card className="p-12 text-center bg-white border-gray-100 shadow-sm">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== "all"
                ? t('patient.goals.no_results', "No goals found")
                : t('patient.goals.no_goals', "No health goals yet")}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== "all"
                ? t('patient.goals.try_different_filter', "Try adjusting your search or filters")
                : t('patient.goals.create_first', "Create your first health goal to start tracking progress")}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                onClick={() => navigate("/patient/goals/create")}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 rounded-xl"
              >
                <Plus className="w-5 h-5" />
                {t('patient.goals.create_goal', "Create Goal")}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredGoals.map((goal) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    onClick={() => navigate(`/patient/goals/${goal.id}`)}
                    className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-4xl">{getGoalTypeIcon(goal.goal_type)}</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors mb-1">
                            {goal.title}
                          </h3>
                          <Badge className={`${getStatusColor(goal.status)} border flex items-center gap-1 w-fit`}>
                            {getStatusIcon(goal.status)}
                            {t(`patient.goals.status_${goal.status}`, goal.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {t('patient.goals.progress', "Progress")}
                        </span>
                        <span className={`text-sm font-bold ${getProgressColor(goal.progress_percentage)}`}>
                          {goal.progress_percentage}%
                        </span>
                      </div>
                      <Progress value={goal.progress_percentage} className="h-2" />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{goal.current_value} {goal.unit}</span>
                        <span>{goal.target_value} {goal.unit}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {t('patient.goals.target_date', "Target")}: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      </div>
                      {goal.status === 'active' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patient/goals/${goal.id}/log`);
                          }}
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white h-7 text-xs"
                        >
                          {t('patient.goals.log_progress', "Log")}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}




