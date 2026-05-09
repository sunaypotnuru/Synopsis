import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Pill,
  Calendar,
  Clock,
  User,
  FileText,
  Bell,
  BellOff,
  Edit,
  Trash2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { Medication, MedicationLog } from "@/types/patientPortal";
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
  Legend
} from "recharts";

export default function MedicationDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { medicationId } = useParams<{ medicationId: string }>();

  const [medication, setMedication] = useState<Medication | null>(null);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (medicationId) {
      fetchMedicationDetails();
      fetchMedicationLogs();
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
      toast.error(t('patient.medications.load_failed', "Failed to load medication details"));
      navigate("/patient/medications");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMedicationLogs = async () => {
    if (!medicationId) return;

    try {
      const response = await patientPortalAPI.getMedicationLogs(medicationId);
      const logsData = response.data || [];
      setLogs(logsData);
      
      // Prepare chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartDataPoints = last7Days.map(date => {
        const dayLogs = logsData.filter((log: MedicationLog) => 
          log.scheduled_at.startsWith(date)
        );
        const taken = dayLogs.filter((log: MedicationLog) => log.status === 'taken').length;
        const missed = dayLogs.filter((log: MedicationLog) => log.status === 'missed').length;
        const skipped = dayLogs.filter((log: MedicationLog) => log.status === 'skipped').length;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          taken,
          missed,
          skipped,
          total: taken + missed + skipped
        };
      });

      setChartData(chartDataPoints);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleToggleReminders = async () => {
    if (!medication || !medicationId) return;

    try {
      await patientPortalAPI.updateMedicationReminders(medicationId, {
        reminder_times: medication.reminder_times || [],
        reminder_enabled: !medication.reminder_enabled
      });
      
      setMedication({
        ...medication,
        reminder_enabled: !medication.reminder_enabled
      });

      toast.success(
        medication.reminder_enabled
          ? t('patient.medications.reminders_disabled', "Reminders disabled")
          : t('patient.medications.reminders_enabled', "Reminders enabled")
      );
    } catch (error) {
      console.error("Error toggling reminders:", error);
      toast.error(t('patient.medications.update_failed', "Failed to update reminders"));
    }
  };

  const handleDelete = async () => {
    if (!medicationId) return;
    
    if (!confirm(t('patient.medications.confirm_delete', "Are you sure you want to delete this medication?"))) {
      return;
    }

    try {
      // Note: Delete endpoint not in current API, would need to be added
      toast.info(t('patient.medications.delete_not_available', "Delete functionality coming soon"));
      // await patientPortalAPI.deleteMedication(medicationId);
      // toast.success(t('patient.medications.deleted', "Medication deleted"));
      // navigate("/patient/medications");
    } catch (error) {
      console.error("Error deleting medication:", error);
      toast.error(t('patient.medications.delete_failed', "Failed to delete medication"));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'discontinued':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'skipped':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-green-50 border-green-200';
      case 'missed':
        return 'bg-red-50 border-red-200';
      case 'skipped':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading || !medication) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.medications.loading', "Loading medication...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate("/patient/medications")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('patient.medications.back_to_list', "Back to Medications")}
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {medication.medication_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(medication.status)} border`}>
                  {t(`patient.medications.status_${medication.status}`, medication.status)}
                </Badge>
                <span className="text-lg text-indigo-600 font-semibold">
                  {medication.dosage}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleToggleReminders}
              variant="outline"
              className="gap-2"
            >
              {medication.reminder_enabled ? (
                <>
                  <BellOff className="w-4 h-4" />
                  {t('patient.medications.disable_reminders', "Disable Reminders")}
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  {t('patient.medications.enable_reminders', "Enable Reminders")}
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/patient/medications/${medicationId}/log`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('patient.medications.log_dose', "Log Dose")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Adherence Card */}
            {medication.status === 'active' && medication.adherence_rate !== undefined && (
              <Card className="p-6 bg-white border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('patient.medications.adherence_tracking', "Adherence Tracking")}
                  </h2>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {t('patient.medications.overall_adherence', "Overall Adherence")}
                    </span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {medication.adherence_rate}%
                    </span>
                  </div>
                  <Progress value={medication.adherence_rate} className="h-3" />
                </div>

                {medication.adherence_notes && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {medication.adherence_notes}
                  </p>
                )}
              </Card>
            )}

            {/* Adherence Chart */}
            {chartData.length > 0 && (
              <Card className="p-6 bg-white border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('patient.medications.weekly_adherence', "Weekly Adherence")}
                  </h2>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="taken"
                      stroke="#10b981"
                      strokeWidth={2}
                      name={t('patient.medications.taken', "Taken")}
                    />
                    <Line
                      type="monotone"
                      dataKey="missed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name={t('patient.medications.missed', "Missed")}
                    />
                    <Line
                      type="monotone"
                      dataKey="skipped"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name={t('patient.medications.skipped', "Skipped")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Medication History */}
            <Card className="p-6 bg-white border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('patient.medications.medication_history', "Medication History")}
                  </h2>
                </div>
                <span className="text-sm text-gray-500">
                  {t('patient.medications.last_entries', `${logs.length} entries`)}
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {t('patient.medications.no_history', "No medication history yet")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-lg border ${getLogStatusColor(log.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getLogStatusIcon(log.status)}
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {t(`patient.medications.status_${log.status}`, log.status)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(log.scheduled_at).toLocaleString()}
                            </p>
                            {log.taken_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                {t('patient.medications.taken_at', "Taken at")}: {new Date(log.taken_at).toLocaleString()}
                              </p>
                            )}
                            {log.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Medication Info */}
            <Card className="p-6 bg-white border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('patient.medications.medication_info', "Medication Information")}
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Pill className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.medications.dosage', "Dosage")}
                    </p>
                    <p className="font-medium text-gray-900">{medication.dosage}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.medications.frequency', "Frequency")}
                    </p>
                    <p className="font-medium text-gray-900">{medication.frequency}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.medications.route', "Route")}
                    </p>
                    <p className="font-medium text-gray-900">{medication.route}</p>
                  </div>
                </div>

                {medication.prescribed_by && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('patient.medications.prescribed_by', "Prescribed By")}
                      </p>
                      <p className="font-medium text-gray-900">{medication.prescribed_by}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('patient.medications.start_date', "Start Date")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {new Date(medication.start_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {medication.end_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('patient.medications.end_date', "End Date")}
                      </p>
                      <p className="font-medium text-gray-900">
                        {new Date(medication.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Additional Info */}
            {(medication.indication || medication.instructions) && (
              <Card className="p-6 bg-white border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  {t('patient.medications.additional_info', "Additional Information")}
                </h2>

                {medication.indication && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">
                      {t('patient.medications.indication', "Indication")}
                    </p>
                    <p className="text-gray-900">{medication.indication}</p>
                  </div>
                )}

                {medication.instructions && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {t('patient.medications.instructions', "Instructions")}
                    </p>
                    <p className="text-gray-900">{medication.instructions}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Refills Info */}
            {(medication.quantity_prescribed || medication.refills_remaining !== undefined) && (
              <Card className="p-6 bg-white border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  {t('patient.medications.refills', "Refills")}
                </h2>

                <div className="space-y-3">
                  {medication.quantity_prescribed && (
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('patient.medications.quantity_prescribed', "Quantity Prescribed")}
                      </p>
                      <p className="font-medium text-gray-900">{medication.quantity_prescribed}</p>
                    </div>
                  )}

                  {medication.refills_remaining !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('patient.medications.refills_remaining', "Refills Remaining")}
                      </p>
                      <p className="font-medium text-gray-900">{medication.refills_remaining}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="p-6 bg-red-50 border-red-200 shadow-sm">
              <h2 className="text-lg font-bold text-red-900 mb-4">
                {t('patient.medications.danger_zone', "Danger Zone")}
              </h2>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('patient.medications.delete_medication', "Delete Medication")}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}




