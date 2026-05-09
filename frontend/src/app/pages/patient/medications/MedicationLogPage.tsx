import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Save
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { Medication } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

export default function MedicationLogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { medicationId } = useParams<{ medicationId: string }>();

  const [medication, setMedication] = useState<Medication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<'taken' | 'missed' | 'skipped'>('taken');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [takenDate, setTakenDate] = useState<Date>(new Date());
  const [takenTime, setTakenTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (medicationId) {
      fetchMedicationDetails();
    }
     
  }, [medicationId]);

  const fetchMedicationDetails = async () => {
    if (!medicationId) return;

    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getMedication(medicationId);
      setMedication(response.data);
    } catch (error) {
      console.error("Error fetching medication:", error);
      toast.error(t('patient.medications.load_failed', "Failed to load medication"));
      navigate("/patient/medications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!medicationId) return;

    setIsSaving(true);
    try {
      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = scheduledTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      let takenDateTime: string | undefined;
      if (selectedStatus === 'taken') {
        const takenDateObj = new Date(takenDate);
        const [takenHours, takenMinutes] = takenTime.split(':');
        takenDateObj.setHours(parseInt(takenHours), parseInt(takenMinutes));
        takenDateTime = takenDateObj.toISOString();
      }

      await patientPortalAPI.logMedication(medicationId, {
        scheduled_at: scheduledDateTime.toISOString(),
        taken_at: takenDateTime,
        status: selectedStatus,
        notes: notes.trim() || undefined
      });

      toast.success(t('patient.medications.log_success', "Medication logged successfully"));
      navigate(`/patient/medications/${medicationId}`);
    } catch (error) {
      console.error("Error logging medication:", error);
      toast.error(t('patient.medications.log_failed', "Failed to log medication"));
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    {
      value: 'taken' as const,
      label: t('patient.medications.status_taken', "Taken"),
      description: t('patient.medications.status_taken_desc', "I took this medication as scheduled"),
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100'
    },
    {
      value: 'missed' as const,
      label: t('patient.medications.status_missed', "Missed"),
      description: t('patient.medications.status_missed_desc', "I forgot to take this medication"),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100'
    },
    {
      value: 'skipped' as const,
      label: t('patient.medications.status_skipped', "Skipped"),
      description: t('patient.medications.status_skipped_desc', "I intentionally skipped this dose"),
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      hoverColor: 'hover:bg-yellow-100'
    }
  ];

  if (isLoading || !medication) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.medications.loading', "Loading...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate(`/patient/medications/${medicationId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.medications.back_to_details', "Back to Medication Details")}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 bg-white border-gray-100 shadow-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('patient.medications.log_medication', "Log Medication")}
              </h1>
              <p className="text-gray-600">
                {t('patient.medications.log_for', "Logging for")}: <span className="font-semibold text-indigo-600">{medication.medication_name}</span> ({medication.dosage})
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Status Selection */}
              <div>
                <Label className="text-base font-semibold text-gray-900 mb-4 block">
                  {t('patient.medications.select_status', "Select Status")}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedStatus === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedStatus(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `${option.bgColor} ${option.borderColor} shadow-md`
                            : `bg-white border-gray-200 ${option.hoverColor}`
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-6 h-6 ${option.color} flex-shrink-0 mt-0.5`} />
                          <div>
                            <p className={`font-semibold ${isSelected ? option.color : 'text-gray-900'}`}>
                              {option.label}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scheduled Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('patient.medications.scheduled_date', "Scheduled Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(scheduledDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => date && setScheduledDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t('patient.medications.scheduled_time', "Scheduled Time")}
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Taken Time (only if status is 'taken') */}
              {selectedStatus === 'taken' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t('patient.medications.taken_date', "Actual Date Taken")}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(takenDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={takenDate}
                          onSelect={(date) => date && setTakenDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t('patient.medications.taken_time', "Actual Time Taken")}
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="time"
                        value={takenTime}
                        onChange={(e) => setTakenTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('patient.medications.notes', "Notes")} ({t('common.optional', "Optional")})
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('patient.medications.notes_placeholder', "Add any additional notes about this dose...")}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('patient.medications.notes_hint', "You can add information about side effects, how you felt, or any other relevant details.")}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/patient/medications/${medicationId}`)}
                  className="flex-1"
                  disabled={isSaving}
                >
                  {t('common.cancel', "Cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
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
                      {t('patient.medications.save_log', "Save Log")}
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




