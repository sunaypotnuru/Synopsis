import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Shield, CheckCircle, AlertCircle, FileText, Activity } from "lucide-react";
import { complianceAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminFDAApmMonitoring() {
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["fdaAlerts"],
    queryFn: () => complianceAPI.getFDAAlerts().then(res => res.data),
  });

  const { data: latestMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["fdaMetricsLatest"],
    queryFn: () => complianceAPI.getFDAMetrics("anemia-detection", 1).then(res => res.data[0]),
  });

  const displayMetrics = [
    { label: "FDA APM Compliance Score", value: "94%", status: "good", icon: CheckCircle },
    { label: "Open Post-Market Issues", value: alerts?.length || "0", status: (alerts?.length || 0) > 0 ? "warn" : "good", icon: AlertCircle },
    { label: "Reports Filed (YTD)", value: "12", status: "good", icon: FileText },
    { label: "Sensitivity (Latest)", value: latestMetrics ? `${(latestMetrics.sensitivity * 100).toFixed(1)}%` : "...", status: "good", icon: Activity },
  ];

  if (metricsLoading || alertsLoading) {
    return <div className="p-8"><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">FDA APM Monitoring</h1>
        <p className="text-[#64748B] text-sm">FDA 21 CFR Part 820 Post-Market Surveillance &amp; Adverse Event Tracking</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5 bg-white border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${m.status === "good" ? "text-green-500" : "text-amber-500"}`} />
                  <span className="text-xs text-[#64748B]">{m.label}</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">{m.value}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-[#0F172A]">Post-Market Surveillance Events (AI Alerts)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[#64748B]">
                <th className="pb-3 pr-4">Event ID</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Message</th>
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(alerts || []).map((row: { id: string; model_name: string; messages?: string[]; alert_level?: string; resolved?: boolean; [key: string]: unknown }) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs">ALRT-{row.id}</td>
                  <td className="py-3 pr-4 uppercase text-[10px] font-bold">{row.model_name}</td>
                  <td className="py-3 pr-4">{row.messages?.[0]}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.alert_level === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {row.alert_level}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${row.resolved ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {row.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                </tr>
              ))}
              {(alerts || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">No active surveillance events detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

