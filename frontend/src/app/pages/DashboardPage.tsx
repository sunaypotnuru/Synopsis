import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, Calendar, Scan,
  ChevronRight, Activity, Heart, ArrowRight, ChevronDown, Users, AlertCircle, Settings2, Check, ListChecks, ShieldCheck, Pill, PhoneCall
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { patientAPI } from "../../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";
import { useWebSocketStore } from "../../lib/store";
import { getWebSocketManager } from "../services/websocket";
import { PresenceList } from "@/components/features/notifications/PresenceList";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const quickActions = [
    { label: t("patient.dashboard.qa_lab", "Analyze Lab Report"), desc: t("patient.dashboard.qa_lab_desc", "AI-based OCR vitals"), icon: Activity, path: "/patient/lab-analyzer", color: "#6366F1", bg: "#EEF2FF" },
    { label: t("patient.dashboard.qa_insurance", "Verify Insurance"), desc: t("patient.dashboard.qa_insurance_desc", "Check policy limits"), icon: ShieldCheck, path: "/patient/insurance", color: "#10B981", bg: "#ECFDF5" },
    { label: t("patient.dashboard.qa_risk", "Risk Assessment"), desc: t("patient.dashboard.qa_risk_desc", "Clinical scoring"), icon: Heart, path: "/patient/risk-assessment", color: "#E11D48", bg: "#FFF1F2" },
    { label: t("patient.dashboard.qa_meds", "Medications"), desc: t("patient.dashboard.qa_meds_desc", "Pill trackers & alerts"), icon: Pill, path: "/patient/medications", color: "#6366F1", bg: "#EEF2FF" },
    { label: t("patient.dashboard.qa_vitals", "Track Vitals"), desc: t("patient.dashboard.qa_vitals_desc", "Chronic disease monitoring"), icon: Activity, path: "/patient/tracker", color: "#E11D48", bg: "#FFF1F2" },
    { label: t("patient.dashboard.qa_nurse", "Nurse Settings"), desc: t("patient.dashboard.qa_nurse_desc", "Manage AI call routines"), icon: PhoneCall, path: "/patient/medication-schedule", color: "#0D9488", bg: "#F0FDFA" },
  ];
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    const saved = localStorage.getItem("dashboardWidgets");
    return saved ? JSON.parse(saved) : {
      hero: true,
      healthScore: true,
      quickActions: true,
      recentScans: true,
      appointments: true
    };
  });

  const toggleWidget = (key: string) => {
    const next = { ...visibleWidgets, [key]: !visibleWidgets[key] };
    setVisibleWidgets(next);
    localStorage.setItem("dashboardWidgets", JSON.stringify(next));
  };

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['patientDashboard'],
    queryFn: () => patientAPI.getDashboard().then(res => res.data),
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
        // Redirect to login on 401 errors
        navigate('/login/patient', { replace: true });
        return false;
      }
      return failureCount < 3;
    }
  });

  const { data: questionnaires = [], isLoading: isLoadingPRO } = useQuery({
    queryKey: ["patientPROs"],
    queryFn: () => patientAPI.getPROQuestionnaires().then(res => res.data),
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
        navigate('/login/patient', { replace: true });
        return false;
      }
      return failureCount < 3;
    }
  });

  const submitPRO = useMutation({
    mutationFn: (data: { questionnaire_id: string; answers: Record<string, string> }) => patientAPI.submitPROQuestionnaire(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientPROs"] });
      toast.success(t("patient.dashboard.pro_submit_success", "Health report submitted successfully!"));
    },
    onError: () => toast.error(t("patient.dashboard.pro_submit_error", "Failed to submit health report"))
  });

  const [proAnswers, setProAnswers] = useState<Record<string, string>>({});
  const [activePRO, setActivePRO] = useState<{ id: string; name: string; questions: Array<{ id: string; text: string; type: string }> } | null>(null);

  const handlePROSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activePRO) {
      submitPRO.mutate({ questionnaire_id: activePRO.id, answers: proAnswers });
      setActivePRO(null);
      setProAnswers({});
    }
  };

  useEffect(() => {
    const handleOpenCustomize = () => setShowCustomize((prev) => !prev);
    window.addEventListener("open-dashboard-customize", handleOpenCustomize);

    // Real-time Dashboard Updates
    const setupRealtime = async () => {
      try {
        const manager = getWebSocketManager();
        if (manager) {
          const conn = await manager.connect('notifications'); // Reuse notification channel or dashboard
          conn.on('dashboard_update', () => {
            queryClient.invalidateQueries({ queryKey: ['patientDashboard'] });
            toast.info("Dashboard updated in real-time");
          });
          conn.on('appointment_update', () => {
            queryClient.invalidateQueries({ queryKey: ['patientDashboard'] });
            toast.success("Appointment status changed!");
          });
        }
      } catch (err) {
        console.error("Failed to setup real-time dashboard updates:", err);
      }
    };

    setupRealtime();

    return () => window.removeEventListener("open-dashboard-customize", handleOpenCustomize);
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="w-[300px] h-[50px] rounded-xl" />
              <Skeleton className="w-[200px] h-[30px] mt-2" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-[280px] lg:col-span-2 rounded-3xl" />
            <Skeleton className="h-[280px] rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("patient.dashboard.error_title", "Unable to load dashboard")}</h2>
        <p className="text-[#64748B] max-w-md mb-6">{(error as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['patientDashboard'] })} className="bg-[#0D9488] hover:bg-[#0F766E] text-white px-8">
          {t("common.try_again", "Try Again")}
        </Button>
      </div>
    );
  }

  const profile = dashboardData?.profile || {};
  const upcomingAppointments = Array.isArray(dashboardData?.upcoming_appointments) ? dashboardData.upcoming_appointments : [];
  const recentScans = Array.isArray(dashboardData?.recent_scans) ? dashboardData.recent_scans : [];
  const healthScoreVal = dashboardData?.health_score ?? profile.health_score ?? 72;
  const healthScoreColor = healthScoreVal >= 80 ? '#22C55E' : healthScoreVal >= 60 ? '#F59E0B' : '#F43F5E';
  const healthScoreData = [
    { name: t("patient.dashboard.healthy", 'Healthy'), value: healthScoreVal, color: healthScoreColor },
    { name: t("patient.dashboard.risk", 'Risk'), value: 100 - healthScoreVal, color: '#F1F5F9' },
  ];
  const familyMembers = [
    { id: profile.id, name: profile.full_name || t("common.self", "Self"), relation: t("common.self", "Self"), avatar: (profile.full_name || "S").charAt(0) },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#0F172A]">
              {t('patient.dashboard.welcome', { defaultValue: 'Welcome back, {{name}}!', name: profile.full_name?.split(' ')[0] || profile.first_name || 'there' })}
            </h1>
            <p className="text-[#64748B] text-base mt-1">{t('patient.dashboard.health_score', 'Health Score')}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto relative">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder={t("common.search", "Search...")}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#0D9488] transition-all bg-white/50 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Widget toggle */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowCustomize(v => !v)}
                className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-2"
              >
                <Settings2 className="w-4 h-4" />
                {t("patient.dashboard.widgets", "Widgets")}
              </Button>
              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl shadow-xl border border-gray-100 py-3 z-50 px-3"
                  >
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">{t("patient.dashboard.show_hide_widgets", "Show/Hide Widgets")}</p>
                    <div className="space-y-1">
                      {[
                        { key: 'hero', label: t("patient.dashboard.widget_hero", 'Hero Banner') },
                        { key: 'healthScore', label: t("patient.dashboard.widget_health_score", 'Health Score') },
                        { key: 'quickActions', label: t("patient.dashboard.widget_quick_actions", 'Quick Actions') },
                        { key: 'recentScans', label: t("patient.dashboard.widget_recent_scans", 'Recent Scans') },
                        { key: 'appointments', label: t("patient.dashboard.widget_appointments", 'Upcoming Visits') }
                      ].map(w => (
                        <button
                          key={w.key}
                          onClick={() => toggleWidget(w.key)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          <span className="text-[#0F172A]">{w.label}</span>
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${visibleWidgets[w.key as keyof typeof visibleWidgets] ? 'bg-[#0D9488] text-white' : 'border border-gray-300'}`}>
                            {visibleWidgets[w.key as keyof typeof visibleWidgets] && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Family profile picker */}
            <div className="relative">
              <button
                onClick={() => setShowFamilyDropdown(!showFamilyDropdown)}
                className="flex items-center gap-2 glass-card border border-gray-200 px-3 py-2 rounded-xl shadow-sm hover:border-[#0D9488] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold flex items-center justify-center text-sm">
                  {familyMembers[0].avatar}
                </div>
                <span className="text-sm font-semibold text-[#0F172A]">{familyMembers[0].name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              <AnimatePresence>
                {showFamilyDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-52 glass-card rounded-xl shadow-xl border border-gray-100 py-2 z-50 px-2"
                  >
                    <div className="px-3 py-2 border-b border-gray-50 flex items-center gap-2 mb-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase">{t("common.profile", "Profile")}</span>
                    </div>
                    {familyMembers.map((m) => (
                      <button key={m.id} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0D9488]/10 text-[#0D9488]">
                        <div className="w-7 h-7 rounded-full bg-[#0D9488] text-white font-bold flex items-center justify-center text-sm">{m.avatar}</div>
                        <div className="text-left">
                          <p className="text-sm font-bold leading-tight">{m.name}</p>
                          <p className="text-xs text-[#0D9488]/70">{m.relation}</p>
                        </div>
                      </button>
                    ))}
                    <div className="px-2 mt-1 pt-1 border-t border-gray-50">
                      <Button variant="outline" className="w-full text-xs h-8 border-dashed" onClick={() => navigate('/patient/profile')}>
                        {t("patient.dashboard.manage_profile", "Manage Profile")}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Hero Banner + Health Score + Streak ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Hero Banner */}
          {visibleWidgets.hero && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-8">
              <div className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-3xl p-8 text-white relative overflow-hidden h-full min-h-[220px] shadow-xl">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full">{t("patient.dashboard.hero_tag1", "AI-Powered Screening")}</span>
                    {recentScans.length > 0 && (
                      <span className="text-[10px] font-bold tracking-widest uppercase bg-green-400/30 text-green-100 px-3 py-1 rounded-full">✓ {t("patient.dashboard.hero_tag2", "Active")}</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2 leading-tight">{t('patient.dashboard.hero_title', 'Time for your next screening')}</h2>
                  <p className="text-white/80 mb-5 text-sm leading-relaxed max-w-sm">
                    {recentScans.length > 0
                      ? t("patient.dashboard.hero_desc_scan", { defaultValue: "Your last scan was on {{date}}. Regular conjunctiva scans help track hemoglobin trends and detect anemia risk early.", date: new Date(recentScans[0].created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) })
                      : t("patient.dashboard.hero_desc_new", "Welcome to Netra AI! Start with a free AI-powered conjunctiva scan — no blood test needed. Early detection saves lives.")}
                  </p>
                  {/* Stats row */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold">{recentScans.length}</p>
                      <p className="text-xs text-white/70 uppercase tracking-wide font-semibold">{t("patient.dashboard.stat_scans", "Scans Done")}</p>
                    </div>
                    <div className="w-px h-10 bg-white/20" />
                    <div className="text-center">
                      <p className="text-3xl font-extrabold">{upcomingAppointments.length}</p>
                      <p className="text-xs text-white/70 uppercase tracking-wide font-semibold">{t("patient.dashboard.stat_upcoming", "Upcoming")}</p>
                    </div>
                    <div className="w-px h-10 bg-white/20" />
                    <div className="text-center">
                      <p className="text-base font-extrabold">
                        {recentScans.length > 0
                          ? ((recentScans[0].prediction || '').toLowerCase() === 'anemic' ? `⚠️ ${t("patient.dashboard.risk", "Risk")}` : `✓ ${t("patient.dashboard.normal", "Normal")}`)
                          : t("patient.dashboard.pending", "Pending")}
                      </p>
                      <p className="text-[10px] text-white/70 uppercase tracking-wide">{t("patient.dashboard.stat_last_result", "Last Result")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/patient/scan")}
                    className="bg-white text-[#0D9488] hover:bg-white/90 font-bold shadow-xl px-6"
                  >
                    <Scan className="w-4 h-4 mr-2" /> {t("patient.dashboard.btn_start_scan", "Start Smart Scan")}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Health Score */}
          {visibleWidgets.healthScore && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4">
              <Card className="p-6 border border-gray-100 flex flex-col h-full glass-card min-h-[220px]">
                <h3 className="font-bold text-[#0F172A] mb-0.5">{t("patient.dashboard.health_score", "Health Score")}</h3>
                <p className="text-xs text-[#64748B] mb-2">{t("patient.dashboard.wellness_index", "Overall Wellness Index")}</p>
                <div className="relative" style={{ minHeight: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={healthScoreData}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius="60%" outerRadius="90%"
                        dataKey="value" stroke="none"
                      >
                        {healthScoreData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-0 left-0 right-0 text-center">
                    <span
                      className="text-5xl font-extrabold"
                      style={{ color: healthScoreColor }}
                    >
                      {healthScoreVal}
                    </span>
                    <span className="text-gray-400 text-sm"> / 100</span>
                  </div>
                </div>
                {/* Score breakdown */}
                <div className="mt-4 space-y-2 border-t border-gray-50 pt-3">
                  {[
                    { label: t("patient.dashboard.breakdown_scans", "Scan History"), value: Math.min(100, recentScans.length * 20), color: "#0D9488" },
                    { label: t("patient.dashboard.breakdown_appt", "Appt. Adherence"), value: Math.min(100, upcomingAppointments.length > 0 ? 80 : 40), color: "#0EA5E9" },
                    { label: t("patient.dashboard.breakdown_activity", "Activity"), value: 65, color: "#8B5CF6" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}


        </div>

        {/* ── Quick Actions ────────────────────────────────────── */}
        {visibleWidgets.quickActions && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#0F172A]">{t("patient.dashboard.quick_actions", "Quick Actions")}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {quickActions
                  .filter(a => a.label.toLowerCase().includes(searchTerm.toLowerCase()) || a.desc.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((action) => (
                  <Card
                    key={action.label}
                    className="p-4 cursor-pointer border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: action.bg }}>
                      <action.icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <h3 className="font-semibold text-[#0F172A] text-sm leading-tight mb-1">{action.label}</h3>
                    <p className="text-[10px] text-[#64748B] leading-tight mb-2">{action.desc}</p>
                    <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all" style={{ color: action.color }}>
                      <span>{t("common.open", "Open")}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-1">
               <PresenceList />
            </motion.div>
          </div>
        )}

        {/* ── Recent Scans + Upcoming Appointments ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Scans */}
          {visibleWidgets.recentScans && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="p-6 border border-gray-100 glass-card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#0F172A]">{t("patient.dashboard.recent_scans", "Recent AI Scans")}</h2>
                  <Button variant="ghost" size="sm" className="text-[#0D9488] text-xs" onClick={() => navigate("/patient/history")}>
                    {t("common.view_all", "View All")} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3 flex-1">
                  {recentScans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Eye className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm font-medium">{t("patient.dashboard.no_scans", "No scans yet")}</p>
                      <p className="text-gray-300 text-xs mt-1">{t("patient.dashboard.no_scans_desc", "Take your first AI eye scan")}</p>
                    </div>
                  ) : (recentScans as Array<{ id?: string; prediction?: string; confidence?: number; created_at: string }>).map((scan, i) => {
                    const isAnemic = (scan.prediction || '').toLowerCase() === "anemic";
                    const isNormal = (scan.prediction || '').toLowerCase() === "normal";
                    return (
                      <div
                        key={scan.id || i}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate('/patient/history')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAnemic ? "bg-[#F43F5E]/10" : isNormal ? "bg-[#22C55E]/10" : "bg-orange-100"}`}>
                            <Eye className={`w-5 h-5 ${isAnemic ? "text-[#F43F5E]" : isNormal ? "text-[#22C55E]" : "text-orange-500"}`} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0F172A]">{new Date(scan.created_at).toLocaleDateString()}</p>
                            <p className="text-xs text-[#64748B]">{t("patient.dashboard.confidence", "Confidence")}: {Math.round((scan.confidence || 0) * 100)}%</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${isAnemic ? "bg-[#F43F5E]/10 text-[#F43F5E]" : isNormal ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-orange-100 text-orange-600"}`}>
                          {scan.prediction ? t(`models.prediction.${scan.prediction.toLowerCase()}`, scan.prediction) : t("patient.dashboard.done", "Done")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Upcoming Appointments */}
          {visibleWidgets.appointments && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 border border-gray-100 glass-card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#0F172A]">{t("patient.dashboard.upcoming_visits", "Upcoming Visits")}</h2>
                  <Button variant="ghost" size="sm" className="text-[#0EA5E9] text-xs" onClick={() => navigate("/patient/appointments")}>
                    {t("common.view_all", "View All")} <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3 flex-1">
                  {upcomingAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Calendar className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm font-medium">{t("patient.dashboard.no_appointments", "No upcoming appointments")}</p>
                      <p className="text-gray-300 text-xs mt-1">{t("patient.dashboard.no_appointments_desc", "Book a consultation below")}</p>
                    </div>
                  ) : (upcomingAppointments as Array<{ 
                    id?: string; 
                    scheduled_at: string; 
                    profiles_doctor?: { 
                      name?: string; 
                      specialty?: string; 
                      avatar_url?: string 
                    } 
                  }>).map((apt, i) => {
                    const doctorName = apt.profiles_doctor?.name || t("common.doctor", "Doctor");
                    const specialty = apt.profiles_doctor?.specialty || t("common.specialist", "Specialist");
                    const time = new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const date = new Date(apt.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <div key={apt.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] font-bold shrink-0 overflow-hidden">
                          {apt.profiles_doctor?.avatar_url
                            ? <img src={apt.profiles_doctor.avatar_url} alt="" className="w-full h-full object-cover" />
                            : doctorName.charAt(0)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#0F172A] truncate">{t("common.dr_prefix", "Dr.")} {doctorName.replace(t("common.dr_prefix", "Dr.") + " ", "").replace("Dr. ", "")}</p>
                          <p className="text-xs text-[#64748B] capitalize">{specialty.replace("_", " ")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#0F172A]">{time}</p>
                          <p className="text-[10px] text-gray-400">{date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <Button
                    onClick={() => navigate("/patient/doctors")}
                    className="w-full bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] hover:from-[#0F766E] hover:to-[#0284C7] text-white font-bold h-10 rounded-xl shadow-sm text-sm"
                  >
                    {t("patient.dashboard.book_consultation", "Book Consultation")}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ── Assigned Health Surveys (PROs) ───────────────────── */}
        {!isLoadingPRO && questionnaires.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="w-5 h-5 text-[#0EA5E9]" />
              <h2 className="text-xl font-bold text-[#0F172A]">{t("patient.dashboard.assigned_surveys", "Assigned Health Surveys")}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(questionnaires as Array<{ id: string; name: string; questions?: Array<{ id: string; text: string; type: string }> }>).map((q) => (
                <Dialog key={q.id} open={activePRO?.id === q.id} onOpenChange={(open: boolean) => {
                  if (open) setActivePRO({ ...q, questions: q.questions || [] });
                  else { setActivePRO(null); setProAnswers({}); }
                }}>
                  <DialogTrigger asChild>
                    <Card className="p-4 border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0EA5E9] glass-card px-2 py-0.5 rounded shadow-sm">{t("patient.dashboard.required", "Required")}</span>
                      </div>
                      <h3 className="font-bold text-[#0F172A] text-sm mb-1">{q.name}</h3>
                      <p className="text-xs text-[#64748B] mb-3">{t("patient.dashboard.survey_desc", "Complete your routine health outcome assessment.")}</p>
                      <div className="flex items-center text-xs font-bold text-[#0EA5E9] gap-1">
                        {t("common.start", "Start")} <ArrowRight className="w-3 h-3" />
                      </div>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl">{q.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePROSubmit} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto px-2">
                      {(q.questions || []).map((qst, idx) => (
                        <div key={qst.id} className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <Label className="text-slate-700 font-bold leading-tight">
                            {idx + 1}. {qst.text}
                          </Label>
                          <Input
                            type={qst.type === 'number' ? 'number' : 'text'}
                            placeholder={qst.type === 'number' ? t("patient.dashboard.enter_number", 'Enter a number (0-10)') : t("patient.dashboard.enter_response", 'Enter your response')}
                            required
                            value={proAnswers[qst.id] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProAnswers(prev => ({ ...prev, [qst.id]: e.target.value }))
                            }
                            className="glass-card border-slate-200 shadow-sm"
                          />
                        </div>
                      ))}
                      <DialogFooter>
                        <Button type="submit" disabled={submitPRO.isPending} className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
                          {submitPRO.isPending ? t("common.submitting", "Submitting...") : t("common.submit_answers", "Submit Answers")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </motion.div>
        )}

      </div>

    </div>
  );
}

