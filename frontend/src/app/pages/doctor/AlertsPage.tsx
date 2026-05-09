import React from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { doctorAPI } from "@/lib/api";
import { AlertTriangle, Clock, Phone, ArrowLeft, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useTranslation } from "@/lib/i18n";

interface AlertRecord {
  id: string;
  patient_id: string;
  created_at: string;
  side_effects_detected: string;
  transcript?: string;
  profiles_patient?: {
    full_name?: string;
  };
}

export default function AlertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");
  const { data: alerts, isLoading } = useQuery<AlertRecord[]>({
    queryKey: ["doctorAlerts"],
    queryFn: () => doctorAPI.getAlerts().then((res) => res.data),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500">{t('doctor.alerts.loading', 'Loading AI Nurse alerts...')}</div>;
  }

  const filteredAlerts = (alerts || []).filter(a => 
    (a.profiles_patient?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.side_effects_detected || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pt-24 pb-12 px-6 bg-slate-50"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-gray-600 hover:text-rose-600">
            <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Back')}
          </Button>

          <div className="relative w-full md:w-64">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder={t("common.search_patient", "Search patient...")}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-rose-500 transition-all bg-white shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-8 p-6 bg-gradient-to-r from-rose-500 to-rose-700 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-rose-200" />
              {t('doctor.alerts.title', 'Nurse AI Escalations')}
            </h1>
            <p className="text-rose-100 max-w-xl text-lg">
              {t('doctor.alerts.subtitle', 'Critical side-effects detected by the autonomous voice agent during daily patient check-ins. Immediate triage is recommended.')}
            </p>
          </div>
          <div className="hidden md:flex bg-white/20 p-4 rounded-2xl backdrop-blur-md items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-black">{filteredAlerts.length}</p>
              <p className="text-sm font-bold tracking-widest uppercase text-rose-200">{t('doctor.alerts.active_alerts', 'Active Alerts')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!alerts || alerts.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-2 shadow-sm rounded-3xl bg-white">
              <Stethoscope className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">{t('doctor.alerts.all_clear', 'All Clear!')}</h3>
              <p className="text-slate-500">{t('doctor.alerts.no_alerts', 'No severe side-effects detected by the AI Nurse today.')}</p>
            </Card>
          ) : (
            filteredAlerts.map((alert) => (
              <Card key={alert.id} className="p-6 border-l-4 border-l-rose-500 hover:shadow-lg transition-all bg-white rounded-2xl group cursor-pointer" onClick={() => navigate(`/doctor/patients/${alert.patient_id}`)}>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{alert.profiles_patient?.full_name || "Unknown Patient"}</h3>
                      <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {new Date(alert.created_at).toLocaleString()}
                      </p>
                      
                      <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                        <p className="font-semibold text-rose-900 mb-1 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600"/> {t('doctor.alerts.reported_side_effect', 'Reported Side Effect:')}
                        </p>
                        <p className="text-rose-700 leading-relaxed font-medium">"{alert.side_effects_detected}"</p>
                      </div>
                      
                      {alert.transcript && (
                        <details className="mt-3 p-4 bg-[#f8fafc] rounded-xl border border-slate-200 cursor-pointer group/details relative z-10 transition-all hover:border-slate-300">
                          <summary className="font-semibold text-slate-700 list-none select-none flex items-center justify-between outline-none">
                            <span className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {t('doctor.alerts.view_transcript', 'View Full Call Transcript')}
                            </span>
                            <span className="text-slate-400 group-open/details:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
                            {alert.transcript}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center shrink-0">
                    <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 shadow-md">
                      {t('doctor.alerts.view_patient', 'View Patient Record')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

