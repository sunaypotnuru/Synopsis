import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Pill, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { Medication } from "@/types/patientPortal";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function MedicationsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "discontinued" | "completed">("all");
  const [overallAdherence, setOverallAdherence] = useState(0);

  useEffect(() => {
    fetchMedications();
  }, []);

  useEffect(() => {
    filterMedications();
     
  }, [medications, searchTerm, statusFilter]);

  const fetchMedications = async () => {
    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getMedications();
      const meds = response.data || [];
      setMedications(meds);
      
      // Calculate overall adherence
      const activeMeds = meds.filter((m: Medication) => m.status === 'active');
      if (activeMeds.length > 0) {
        const totalAdherence = activeMeds.reduce((sum: number, m: Medication) => sum + (m.adherence_rate || 0), 0);
        setOverallAdherence(Math.round(totalAdherence / activeMeds.length));
      }
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast.error(t('patient.medications.load_failed', "Failed to load medications"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterMedications = () => {
    let filtered = medications;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.dosage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.indication?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMedications(filtered);
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

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAdherenceIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (rate >= 60) return <Clock className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const activeMedications = medications.filter(m => m.status === 'active').length;
  const totalMedications = medications.length;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.medications.loading', "Loading medications...")}</p>
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
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Pill className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('patient.medications.title', "My Medications")}
              </h1>
              <p className="text-gray-500 text-sm">
                {t('patient.medications.subtitle', "Manage your prescriptions and track adherence")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/patient/medications/reminders")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5" />
            {t('patient.medications.add_medication', "Add Medication")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.medications.active_meds', "Active Medications")}
                </p>
                <p className="text-3xl font-bold text-gray-900">{activeMedications}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('patient.medications.total_meds', `of ${totalMedications} total`)}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.medications.adherence_rate', "Adherence Rate")}
                </p>
                <p className={`text-3xl font-bold ${getAdherenceColor(overallAdherence)}`}>
                  {overallAdherence}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {overallAdherence >= 80 
                    ? t('patient.medications.excellent', "Excellent!")
                    : overallAdherence >= 60
                    ? t('patient.medications.good', "Good progress")
                    : t('patient.medications.needs_improvement', "Needs improvement")}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t('patient.medications.upcoming_doses', "Upcoming Doses")}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {medications.filter(m => m.status === 'active' && m.reminder_enabled).length}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('patient.medications.today', "Today")}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
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
                placeholder={t('patient.medications.search_placeholder', "Search medications...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">{t('patient.medications.all_status', "All Status")}</option>
                <option value="active">{t('patient.medications.status_active', "Active")}</option>
                <option value="discontinued">{t('patient.medications.status_discontinued', "Discontinued")}</option>
                <option value="completed">{t('patient.medications.status_completed', "Completed")}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Medications List */}
        {filteredMedications.length === 0 ? (
          <Card className="p-12 text-center bg-white border-gray-100 shadow-sm">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== "all"
                ? t('patient.medications.no_results', "No medications found")
                : t('patient.medications.no_medications', "No medications yet")}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== "all"
                ? t('patient.medications.try_different_filter', "Try adjusting your search or filters")
                : t('patient.medications.add_first', "Add your first medication to start tracking")}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                onClick={() => navigate("/patient/medications/reminders")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl"
              >
                <Plus className="w-5 h-5" />
                {t('patient.medications.add_medication', "Add Medication")}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMedications.map((medication) => (
                <motion.div
                  key={medication.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    onClick={() => navigate(`/patient/medications/${medication.id}`)}
                    className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                          {medication.medication_name}
                        </h3>
                        <p className="text-sm text-indigo-600 font-medium">
                          {medication.dosage}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(medication.status)} border`}>
                        {t(`patient.medications.status_${medication.status}`, medication.status)}
                      </Badge>
                    </div>

                    {/* Frequency */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{medication.frequency}</span>
                    </div>

                    {/* Adherence */}
                    {medication.status === 'active' && medication.adherence_rate !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getAdherenceIcon(medication.adherence_rate)}
                            <span className="text-sm font-medium text-gray-700">
                              {t('patient.medications.adherence', "Adherence")}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${getAdherenceColor(medication.adherence_rate)}`}>
                            {medication.adherence_rate}%
                          </span>
                        </div>
                        <Progress value={medication.adherence_rate} className="h-2" />
                      </div>
                    )}

                    {/* Indication */}
                    {medication.indication && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {medication.indication}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {t('patient.medications.started', "Started")} {new Date(medication.start_date).toLocaleDateString()}
                      </span>
                      {medication.reminder_enabled && (
                        <span className="flex items-center gap-1 text-indigo-600">
                          <AlertCircle className="w-3 h-3" />
                          {t('patient.medications.reminders_on', "Reminders On")}
                        </span>
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

