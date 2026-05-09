import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Target,
  Calendar as CalendarIcon,
  TrendingUp,
  Save,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

export default function CreateHealthGoalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState<string>("weight");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [targetDate, setTargetDate] = useState<Date>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  );

  const goalTypes = [
    { value: "weight", label: t('patient.goals.type_weight', "Weight"), icon: "⚖️", defaultUnit: "kg" },
    { value: "steps", label: t('patient.goals.type_steps', "Steps"), icon: "👟", defaultUnit: "steps" },
    { value: "exercise", label: t('patient.goals.type_exercise', "Exercise"), icon: "💪", defaultUnit: "minutes" },
    { value: "sleep", label: t('patient.goals.type_sleep', "Sleep"), icon: "😴", defaultUnit: "hours" },
    { value: "water", label: t('patient.goals.type_water', "Water Intake"), icon: "💧", defaultUnit: "liters" },
    { value: "blood_pressure", label: t('patient.goals.type_bp', "Blood Pressure"), icon: "❤️", defaultUnit: "mmHg" },
    { value: "blood_sugar", label: t('patient.goals.type_sugar', "Blood Sugar"), icon: "🩸", defaultUnit: "mg/dL" },
    { value: "custom", label: t('patient.goals.type_custom', "Custom"), icon: "🎯", defaultUnit: "units" }
  ];

  const handleGoalTypeChange = (type: string) => {
    setGoalType(type);
    const selectedType = goalTypes.find(gt => gt.value === type);
    if (selectedType) {
      setUnit(selectedType.defaultUnit);
      // Auto-generate title if empty
      if (!title) {
        setTitle(selectedType.label);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error(t('patient.goals.title_required', "Goal title is required"));
      return;
    }

    if (!targetValue || parseFloat(targetValue) <= 0) {
      toast.error(t('patient.goals.target_required', "Target value must be greater than 0"));
      return;
    }

    if (!currentValue || parseFloat(currentValue) < 0) {
      toast.error(t('patient.goals.current_required', "Current value must be 0 or greater"));
      return;
    }

    if (targetDate <= startDate) {
      toast.error(t('patient.goals.date_validation', "Target date must be after start date"));
      return;
    }

    setIsSaving(true);
    try {
      await patientPortalAPI.createGoal({
        goal_type: goalType,
        title: title.trim(),
        description: description.trim() || undefined,
        target_value: parseFloat(targetValue),
        current_value: parseFloat(currentValue),
        unit: unit,
        start_date: startDate.toISOString(),
        target_date: targetDate.toISOString()
      });

      toast.success(t('patient.goals.create_success', "Health goal created successfully!"));
      navigate("/patient/goals");
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error(t('patient.goals.create_failed', "Failed to create health goal"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/goals")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.goals.back_to_goals', "Back to Health Goals")}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('patient.goals.create_new', "Create New Health Goal")}
                </h1>
                <p className="text-gray-600 text-sm">
                  {t('patient.goals.create_subtitle', "Set a target and track your progress")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Goal Type Selection */}
              <div>
                <Label className="text-base font-semibold text-gray-900 mb-3 block">
                  {t('patient.goals.select_type', "Select Goal Type")}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {goalTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleGoalTypeChange(type.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        goalType === type.value
                          ? 'bg-teal-50 border-teal-500 shadow-md'
                          : 'bg-white border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <p className={`text-sm font-medium ${
                        goalType === type.value ? 'text-teal-700' : 'text-gray-700'
                      }`}>
                        {type.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Title */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t('patient.goals.goal_title', "Goal Title")}
                </Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('patient.goals.title_placeholder', "e.g., Lose 5kg in 2 months")}
                  required
                  className="w-full"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t('patient.goals.description', "Description")} ({t('common.optional', "Optional")})
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('patient.goals.description_placeholder', "Add more details about your goal...")}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Current and Target Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('patient.goals.current_value', "Current Value")}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t('patient.goals.target_value', "Target Value")}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="0"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('patient.goals.unit', "Unit")}
                  </Label>
                  <Input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg"
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {t('patient.goals.start_date', "Start Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {t('patient.goals.target_date', "Target Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(targetDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={targetDate}
                        onSelect={(date) => date && setTargetDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Preview */}
              {title && targetValue && currentValue && (
                <Card className="p-4 bg-teal-50 border-teal-200">
                  <p className="text-sm font-medium text-teal-900 mb-2">
                    {t('patient.goals.preview', "Goal Preview")}
                  </p>
                  <p className="text-teal-700">
                    {title} - {t('patient.goals.preview_text', {
                      current: currentValue,
                      target: targetValue,
                      unit: unit,
                      defaultValue: `From ${currentValue} ${unit} to ${targetValue} ${unit}`
                    })}
                  </p>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/patient/goals")}
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
                      {t('common.creating', "Creating...")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('patient.goals.create_goal', "Create Goal")}
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




