import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  Ruler,
  Droplet,
  Wind,
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  Download
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { patientPortalAPI } from "@/services/patientPortalAPI";
import { VitalRecord } from "@/types/patientPortal";
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

export default function VitalsHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [filteredVitals, setFilteredVitals] = useState<VitalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [chartData, setChartData] = useState<any[]>([]);

  const vitalTypes = [
    { value: "all", label: t('patient.vitals.all', "All Vitals"), icon: Activity },
    { value: "blood_pressure", label: t('patient.vitals.bp', "Blood Pressure"), icon: Heart },
    { value: "heart_rate", label: t('patient.vitals.hr', "Heart Rate"), icon: Activity },
    { value: "temperature", label: t('patient.vitals.temp', "Temperature"), icon: Thermometer },
    { value: "weight", label: t('patient.vitals.weight', "Weight"), icon: Weight },
    { value: "height", label: t('patient.vitals.height', "Height"), icon: Ruler },
    { value: "blood_sugar", label: t('patient.vitals.sugar', "Blood Sugar"), icon: Droplet },
    { value: "oxygen_saturation", label: t('patient.vitals.oxygen', "Oxygen"), icon: Wind }
  ];

  useEffect(() => {
    fetchVitals();
  }, []);

  useEffect(() => {
    filterVitals();
    prepareChartData();
     
  }, [vitals, selectedType]);

  const fetchVitals = async () => {
    setIsLoading(true);
    try {
      const response = await patientPortalAPI.getVitalsHistory();
      setVitals(response.data || []);
    } catch (error) {
      console.error("Error fetching vitals:", error);
      toast.error(t('patient.vitals.load_failed', "Failed to load vitals history"));
    } finally {
      setIsLoading(false);
    }
  };

  const filterVitals = () => {
    let filtered = vitals;

    if (selectedType !== "all") {
      filtered = filtered.filter(v => v.vital_type === selectedType);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

    setFilteredVitals(filtered);
  };

  const prepareChartData = () => {
    if (selectedType === "all" || filteredVitals.length === 0) {
      setChartData([]);
      return;
    }

    // Get last 10 readings for the selected type
    const recentVitals = filteredVitals.slice(0, 10).reverse();
    
    const data = recentVitals.map(v => ({
      date: new Date(v.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(v.value),
      unit: v.unit
    }));

    setChartData(data);
  };

  const getVitalIcon = (type: string) => {
    const vitalType = vitalTypes.find(vt => vt.value === type);
    return vitalType ? vitalType.icon : Activity;
  };

  const getVitalColor = (type: string) => {
    const colors: Record<string, string> = {
      blood_pressure: "text-red-600 bg-red-100",
      heart_rate: "text-pink-600 bg-pink-100",
      temperature: "text-orange-600 bg-orange-100",
      weight: "text-purple-600 bg-purple-100",
      height: "text-blue-600 bg-blue-100",
      blood_sugar: "text-yellow-600 bg-yellow-100",
      oxygen_saturation: "text-cyan-600 bg-cyan-100",
      bmi: "text-green-600 bg-green-100"
    };
    return colors[type] || "text-gray-600 bg-gray-100";
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["Date", "Type", "Value", "Unit", "Notes"];
    const rows = filteredVitals.map(v => [
      new Date(v.recorded_at).toLocaleString(),
      v.vital_type,
      v.value,
      v.unit,
      v.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitals-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(t('patient.vitals.export_success', "Vitals exported successfully"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('patient.vitals.loading', "Loading vitals history...")}</p>
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
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('patient.vitals.title', "Vitals History")}
              </h1>
              <p className="text-gray-500 text-sm">
                {t('patient.vitals.subtitle', "Track your vital signs over time")}
              </p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="gap-2"
            disabled={filteredVitals.length === 0}
          >
            <Download className="w-5 h-5" />
            {t('patient.vitals.export', "Export Data")}
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="p-6 mb-6 bg-white border-gray-100 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {t('patient.vitals.total_readings', "Total Readings")}
              </p>
              <p className="text-2xl font-bold text-gray-900">{vitals.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {t('patient.vitals.types_tracked', "Types Tracked")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(vitals.map(v => v.vital_type)).size}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {t('patient.vitals.latest_reading', "Latest Reading")}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {vitals.length > 0
                  ? new Date(vitals[0].recorded_at).toLocaleDateString()
                  : t('common.none', "None")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {t('patient.vitals.filtered', "Filtered")}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredVitals.length}</p>
            </div>
          </div>
        </Card>

        {/* Filter */}
        <Card className="p-4 mb-6 bg-white border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {t('patient.vitals.filter_by_type', "Filter by Type")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {vitalTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    selectedType === type.value
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Chart */}
        {chartData.length > 0 && selectedType !== "all" && (
          <Card className="p-6 mb-6 bg-white border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {t('patient.vitals.trend_chart', "Trend Chart")}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name={vitalTypes.find(vt => vt.value === selectedType)?.label || "Value"}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Vitals List */}
        {filteredVitals.length === 0 ? (
          <Card className="p-12 text-center bg-white border-gray-100 shadow-sm">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedType !== "all"
                ? t('patient.vitals.no_readings_type', "No readings for this type")
                : t('patient.vitals.no_readings', "No vitals recorded yet")}
            </h3>
            <p className="text-gray-500">
              {selectedType !== "all"
                ? t('patient.vitals.try_different_filter', "Try selecting a different vital type")
                : t('patient.vitals.start_tracking', "Start tracking your vitals during appointments")}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVitals.map((vital, index) => {
              const Icon = getVitalIcon(vital.vital_type);
              const previousVital = filteredVitals[index + 1];
              const trendIcon = previousVital
                ? getTrendIcon(parseFloat(vital.value), parseFloat(previousVital.value))
                : null;

              return (
                <motion.div
                  key={vital.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getVitalColor(vital.vital_type)}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {vitalTypes.find(vt => vt.value === vital.vital_type)?.label || vital.vital_type}
                            </h3>
                            {trendIcon}
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                              {vital.value} {vital.unit}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              {new Date(vital.recorded_at).toLocaleString()}
                            </div>
                          </div>
                          {vital.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              {vital.notes}
                            </p>
                          )}
                          {vital.recorded_by && (
                            <p className="text-xs text-gray-400 mt-2">
                              {t('patient.vitals.recorded_by', "Recorded by")}: {vital.recorded_by}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}




