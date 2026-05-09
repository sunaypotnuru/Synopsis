import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import {
  Activity, Calendar, AlertTriangle, TrendingUp, MapPin, BarChart3, Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";

// -- Types --
interface HotspotFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    symptoms: string[];
    severity: number;
    date: string;
  };
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: HotspotFeature[];
}

interface TimelineItem {
  date: string;
  cases: number;
  avg_severity: number;
}

// -- Severity color helper --
function severityColor(sev: number): string {
  if (sev >= 8) return "#ef4444"; // red
  if (sev >= 5) return "#f59e0b"; // amber
  return "#22c55e"; // green
}

function severityLabel(sev: number): string {
  if (sev >= 8) return "Critical";
  if (sev >= 5) return "Moderate";
  return "Low";
}

// -- Auto-fit map to markers --
function FitBounds({ features }: { features: HotspotFeature[] }) {
  const map = useMap();
  useEffect(() => {
    if (features.length === 0) return;
    const coords = features
      .filter(f => f.geometry?.coordinates)
      .map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]);
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords).pad(0.3));
    }
  }, [features, map]);
  return null;
}

export default function EpidemicRadarPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 86400000).toISOString();
  const endDate = now.toISOString();

  // ── API Queries ──
  const { data: geoData, isLoading: loadingGeo } = useQuery<FeatureCollection>({
    queryKey: ["epidemicHotspots", days],
    queryFn: async () => {
      const res = await api.get("/api/v1/analytics/epidemic/hotspots", {
        params: { start_date: startDate, end_date: endDate },
      });
      return res.data;
    },
  });

  const { data: timeline = [], isLoading: loadingTL } = useQuery<TimelineItem[]>({
    queryKey: ["epidemicTimeline", days],
    queryFn: async () => {
      const res = await api.get("/api/v1/analytics/epidemic/timeline", {
        params: { start_date: startDate, end_date: endDate },
      });
      return res.data;
    },
  });

  const features = geoData?.features ?? [];
  const totalCases = features.length;
  const criticalCases = features.filter(f => f.properties.severity >= 8).length;
  const avgSeverity = totalCases > 0 ? (features.reduce((a, f) => a + f.properties.severity, 0) / totalCases).toFixed(1) : "0";

  // ── Day range buttons ──
  const dayOptions = [7, 14, 30, 60, 90];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-200">
                <Activity className="w-6 h-6 text-white" />
              </div>{t('admin.epidemic_radar_page.predictive_epidemic_radar', "Predictive Epidemic Radar")}</h1>
            <p className="text-gray-500 mt-1 ml-14">{t('admin.epidemic_radar_page.geospatial_symptom_tracking_outbreak_1', "Geospatial symptom tracking & outbreak analysis")}</p>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            {dayOptions.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  days === d
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('admin.epidemic_radar_page.total_reports_2', "Total Reports")}</p>
            <p className="text-2xl font-bold text-gray-900">{totalCases}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('admin.epidemic_radar_page.critical_cases_3', "Critical Cases")}</p>
            <p className="text-2xl font-bold text-red-600">{criticalCases}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('admin.epidemic_radar_page.avg_severity_4', "Avg Severity")}</p>
            <p className="text-2xl font-bold text-gray-900">{avgSeverity}<span className="text-sm font-normal text-gray-400">/10</span></p>
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />{t('admin.epidemic_radar_page.symptom_heatmap_5', "Symptom Heatmap")}</h2>
          <span className="text-xs text-gray-400">{features.length} markers</span>
        </div>
        <div className="h-[420px] relative">
          {loadingGeo ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds features={features} />
              {features.filter(f => f.geometry?.coordinates?.length >= 2).map((f) => (
                <CircleMarker
                  key={f.properties?.id || Math.random().toString()}
                  center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                  radius={Math.max(6, (f.properties?.severity || 0) * 1.5)}
                  pathOptions={{
                    color: severityColor(f.properties?.severity || 0),
                    fillColor: severityColor(f.properties?.severity || 0),
                    fillOpacity: 0.55,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">{severityLabel(f.properties?.severity || 0)} — Severity {f.properties?.severity || 0}/10</p>
                      <p className="text-gray-600">Symptoms: {(f.properties?.symptoms || []).join(", ") || "N/A"}</p>
                      <p className="text-gray-400">{f.properties?.date ? new Date(f.properties.date).toLocaleDateString() : 'Unknown Date'}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </Card>

      {/* Timeline Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cases Over Time */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />{t('admin.epidemic_radar_page.cases_over_time_7', "Cases Over Time")}</h3>
          {loadingTL ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400 text-sm">
              <BarChart3 className="w-10 h-10 mb-2 text-gray-300" />{t('admin.epidemic_radar_page.no_data_for_this_10', "No data for this period")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="cases"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#caseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Average Severity Over Time */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />{t('admin.epidemic_radar_page.severity_trend_9', "Severity Trend")}</h3>
          {loadingTL ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400 text-sm">
              <BarChart3 className="w-10 h-10 mb-2 text-gray-300" />{t('admin.epidemic_radar_page.no_data_for_this_8', "No data for this period")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="avg_severity" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-400 py-4">{t('admin.epidemic_radar_page.data_is_anonymized_and_11', "Data is anonymized and aggregated. Individual identities are never exposed. Geographic precision is intentionally reduced.")}</div>
    </div>
  );
}

