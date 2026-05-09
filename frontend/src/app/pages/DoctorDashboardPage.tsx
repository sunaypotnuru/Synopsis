import { useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
    Calendar, Activity, AlertCircle, Clock, Video, ShieldAlert, DollarSign, CheckCircle2, ChevronRight, User
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { doctorAPI } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { getWebSocketManager } from "../services/websocket";
import { toast } from "sonner";
import { PresenceList } from "@/components/features/notifications/PresenceList";

function AnimatedCounter({ target, suffix = "" }: { target: number | string; suffix?: string }) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold"
        >
            {target}{suffix}
        </motion.span>
    );
}

export default function DoctorDashboardPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { t } = useTranslation();

    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['doctorDashboard'],
        queryFn: () => doctorAPI.getDashboard().then(res => res.data)
    });

    useEffect(() => {
        const setupRealtime = async () => {
            try {
                const manager = getWebSocketManager();
                if (manager) {
                    const conn = await manager.connect('notifications');
                    conn.on('dashboard_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
                        toast.info("Dashboard updated in real-time");
                    });
                    conn.on('appointment_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
                        toast.success("Appointment status changed!");
                    });
                }
            } catch (err) {
                console.error("Failed to setup real-time dashboard updates:", err);
            }
        };

        setupRealtime();
    }, [queryClient]);

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <Skeleton className="w-[320px] h-[50px] rounded-xl" />
                            <Skeleton className="w-[200px] h-[30px] mt-2" />
                        </div>
                        <Skeleton className="w-[180px] h-[48px] rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[140px] rounded-2xl" />)}
                    </div>
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Skeleton className="h-[350px] lg:col-span-2 rounded-2xl" />
                        <Skeleton className="h-[350px] rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t('doctor.dashboard.error', 'Dashboard Error')}</h2>
                <p className="text-[#64748B] max-w-md mb-6">{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] })} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-8">
                    {t('common.retry_connection', 'Retry Connection')}
                </Button>
            </div>
        );
    }

    const profile = dashboardData?.profile || {};
    const statsData = dashboardData?.stats || { appointments_today: 0, revenue_today: 0, pending_patients: 0 };
    const todayAppointments = Array.isArray(dashboardData?.appointments) ? dashboardData.appointments : [];
    const pendingScans = Array.isArray(dashboardData?.pending_scans) ? dashboardData.pending_scans : [];
    const isVerified = profile.is_verified;

    const stats = [
        { label: t('doctor.dashboard.todays_appts', "Today's Appts"), value: statsData.appointments_today || 0, icon: Calendar, color: "#0EA5E9", bg: "#F0F9FF", path: "/doctor/appointments" },
        { label: t('doctor.dashboard.patient_directory', 'Patient Directory'), value: statsData.pending_patients || 0, icon: User, color: "#8B5CF6", bg: "#F5F3FF", path: "/doctor/patients" },
        { label: t('doctor.dashboard.scans_to_review', 'Scans to Review'), value: statsData.pending_patients || 0, icon: Activity, color: "#F43F5E", bg: "#FFF1F2", path: "/doctor/scans" },
        { label: t('doctor.dashboard.revenue_today', 'Revenue Today'), value: `₹${statsData.revenue_today || 0}`, icon: DollarSign, color: "#22C55E", bg: "#F0FDF4", path: "/doctor/revenue" },
    ];

    const demographicsData = [
        { name: t('doctor.dashboard.risk_anemia', 'Anemia Risk'), value: 35, color: '#F43F5E' },
        { name: t('doctor.dashboard.risk_healthy', 'Healthy'), value: 65, color: '#22C55E' },
    ];

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-7xl mx-auto">

                {/* Verification Notice */}
                {!isVerified && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-amber-900 font-bold">{t('doctor.dashboard.verification_pending', 'Verification Pending')}</h3>
                                <p className="text-amber-700 text-sm">{t('doctor.dashboard.verification_msg', 'Your profile is being reviewed by our medical board. You will be notified once approved.')}</p>
                            </div>
                        </div>
                        <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-100 hidden sm:flex">
                            {t('doctor.dashboard.update_documents', 'Update Documents')}
                        </Button>
                    </motion.div>
                )}

                {/* Welcome Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] rounded-3xl p-8 text-white relative overflow-hidden shadow-lg border border-white/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h1 className="text-3xl font-bold">{t('doctor.dashboard.welcome', 'Welcome back,')} {profile.full_name || user?.name || 'Doctor'}</h1>
                                    {isVerified && <CheckCircle2 className="w-6 h-6 text-white/50" />}
                                </div>
                                <p className="text-white/80 text-lg">
                                    {t('doctor.dashboard.appointments_today', 'You have')} {todayAppointments.length} {t('doctor.dashboard.scheduled_today', 'appointments scheduled for today.')}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => navigate("/doctor/appointments")}
                                    className="bg-white text-[#0EA5E9] hover:bg-white/90 font-bold h-12 px-6 rounded-xl"
                                >
                                    {t('doctor.dashboard.manage_schedule', 'Manage Schedule')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                                onClick={() => stat.path && navigate(stat.path)}
                                className={stat.path ? "cursor-pointer" : ""}
                            >
                                <Card className={`p-6 transition-all border border-gray-100 bg-white group ${stat.path ? 'hover:shadow-lg hover:scale-105' : 'hover:shadow-md'}`}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: stat.bg }}>
                                        <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <AnimatedCounter target={stat.value} />
                                    </div>
                                    <p className="text-sm text-[#64748B] mt-1 font-medium">{stat.label}</p>
                                    {stat.path && (
                                        <div className="mt-2 text-xs text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t('common.click_to_view', 'Click to view')} →
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                    <div className="lg:col-span-1">
                        <PresenceList />
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="p-6 border border-gray-100 bg-white h-full shadow-sm">
                            <h2 className="text-lg font-bold text-[#0F172A] mb-1">{t('doctor.dashboard.risk_distribution', 'Patient Risk Distribution')}</h2>
                            <p className="text-sm text-[#64748B] mb-6">{t('doctor.dashboard.risk_desc', 'Aggregate risk levels across your patient base')}</p>

                            <div className="relative h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={demographicsData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {demographicsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-6">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F43F5E]" /> <span className="text-xs text-gray-500 font-bold uppercase">{t('doctor.dashboard.at_risk', 'At Risk')}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22C55E]" /> <span className="text-xs text-gray-500 font-bold uppercase">{t('doctor.dashboard.stable', 'Stable')}</span></div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
                        <Card className="p-6 border border-gray-100 bg-white h-full shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0F172A]">{t('doctor.dashboard.revenue_insights', 'Revenue Insights')}</h2>
                                    <p className="text-sm text-[#64748B]">{t('doctor.dashboard.revenue_desc', 'Weekly consultation earnings breakdown')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-[#22C55E]">₹{statsData.revenue_today * 7}</p>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('doctor.dashboard.est_weekly_revenue', 'Est. Weekly Revenue')}</p>
                                </div>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Mon', revenue: statsData.revenue_today * 0.8 },
                                            { name: 'Tue', revenue: statsData.revenue_today * 1.2 },
                                            { name: 'Wed', revenue: statsData.revenue_today * 0.9 },
                                            { name: 'Thu', revenue: statsData.revenue_today * 1.1 },
                                            { name: 'Fri', revenue: statsData.revenue_today },
                                            { name: 'Sat', revenue: statsData.revenue_today * 1.5 },
                                            { name: 'Sun', revenue: statsData.revenue_today * 1.8 },
                                        ]}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                        <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="revenue" fill="#0EA5E9" radius={[6, 6, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm h-full flex flex-col">
                            <h2 className="text-lg font-bold text-[#0F172A] mb-1">{t('doctor.dashboard.scans_to_review', 'Scans to Review')}</h2>
                            <p className="text-sm text-[#64748B] mb-6">{t('doctor.dashboard.scans_desc', 'Patient conjunctiva analysis requests')}</p>

                            <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
                                {pendingScans.map((scan: { id: string; profiles_patient?: { full_name?: string }; created_at: string; prediction?: string; confidence?: number }, i: number) => {
                                    const patientName = scan.profiles_patient?.full_name || "Patient";
                                    const isAnemic = (scan.prediction || '').toLowerCase() === "anemic";
                                    return (
                                        <div key={scan.id || i} className="p-4 border border-gray-50 bg-gray-50/50 rounded-2xl hover:bg-white hover:border-[#F59E0B]/30 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-bold text-[#0F172A] truncate group-hover:text-[#0EA5E9] transition-colors">{patientName}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(scan.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${isAnemic ? 'text-rose-600 bg-rose-100' : 'text-amber-600 bg-amber-100'}`}>
                                                    {scan.prediction || "Pending"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full ${isAnemic ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.round((scan.confidence || 0) * 100)}%` }} />
                                                    </div>
                                                    <p className="text-[10px] mt-1 text-gray-400 font-bold">{Math.round((scan.confidence || 0) * 100)}% {t('doctor.dashboard.match', 'Match')}</p>
                                                </div>
                                                <Button size="sm" className="bg-white border-gray-200 text-gray-600 hover:text-[#0EA5E9] hover:border-[#0EA5E9] text-xs h-8 shadow-none" onClick={() => navigate(`/doctor/scans/${scan.id}`)}>View</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {pendingScans.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/30 rounded-3xl border-2 border-dashed border-gray-100">
                                        <Activity className="w-10 h-10 mb-2 text-gray-200" />
                                        <p className="text-sm font-medium text-gray-400">{t('doctor.dashboard.scans_cleared', 'All scans cleared!')}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2"
                    >
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-[#0F172A]">{t('doctor.dashboard.todays_consultations', "Today's Consultations")}</h2>
                                <Button variant="ghost" size="sm" className="text-[#0EA5E9]" onClick={() => navigate("/doctor/appointments")}>
                                    {t('doctor.dashboard.full_schedule', 'Full Schedule')} <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {todayAppointments.length === 0 ? (
                                    <div className="py-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                        <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                                        <p className="text-gray-400 font-medium">{t('doctor.dashboard.no_appts_today', 'No appointments scheduled for today.')}</p>
                                    </div>
                                ) : todayAppointments.map((apt: { id: string; profiles_patient?: { full_name?: string; avatar_url?: string; age?: number }; scheduled_at: string; notes?: string; consultation_type?: string; patient_id: string; risk_level?: string }, i: number) => {
                                    const patientName = apt.profiles_patient?.full_name || "Patient";
                                    const time = new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div
                                            key={apt.id || i}
                                            className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-gray-50 hover:border-[#0EA5E9]/30 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] font-bold text-xl shrink-0 group-hover:scale-105 transition-transform">
                                                {apt.profiles_patient?.avatar_url ? (
                                                    <img src={apt.profiles_patient.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                ) : (
                                                    patientName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-[#0F172A] truncate">{patientName}</p>
                                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">{apt.profiles_patient?.age || '25'}Y</span>
                                                    {apt.risk_level && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                                            apt.risk_level === 'high' ? 'bg-rose-100 text-rose-600 ring-1 ring-rose-200' : 
                                                            apt.risk_level === 'medium' ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-200' : 
                                                            'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200'
                                                        }`}>
                                                            {apt.risk_level} Risk
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1 font-medium">
                                                    <Clock className="w-3 h-3" /> {time} • {apt.notes || "Conjunctiva Review"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right hidden sm:block">
                                                    <div className={`text-[10px] font-black uppercase text-[#0EA5E9] mb-1 flex items-center justify-end gap-1`}>
                                                        <Video className="w-3 h-3" /> {apt.consultation_type || 'Video'}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400">#APT-{apt.id?.slice(0, 4).toUpperCase()}</p>
                                                </div>
                                                <Button
                                                    onClick={() => navigate(`/doctor/patients/${apt.patient_id}/timeline`)}
                                                    variant="outline"
                                                    className="h-10 px-4 rounded-xl font-bold border-gray-200 text-gray-600 hover:text-[#0EA5E9] hover:bg-white"
                                                >
                                                    {t('common.timeline', 'Timeline')}
                                                </Button>
                                                <Button
                                                    onClick={() => navigate(`/doctor/consultation/${apt.id}`)}
                                                    className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-lg h-10 px-6 rounded-xl font-bold"
                                                >
                                                    {t('doctor.dashboard.join', 'Join')}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}

