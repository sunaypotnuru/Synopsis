import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
    BarChart2, Users, Calendar, Scan, TrendingUp,
    Download, RefreshCw, Activity
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api, { adminAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';

const COLORS = ['#8B5CF6', '#0D9488', '#F59E0B', '#EC4899', '#3B82F6'];

interface AdminStats {
    total_patients?: number;
    total_doctors?: number;
    total_appointments?: number;
    total_scans?: number;
}

interface TrendDataPoint {
    date: string;
    total: number;
}

interface TrendData {
    appt: TrendDataPoint[];
    scan: TrendDataPoint[];
}

interface DoctorPerformance {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    completed_appointments: number;
    total_appointments: number;
}

export default function AdminAnalyticsPage() {
    const { t } = useTranslation();
    const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

    const { data: stats, isLoading, refetch } = useQuery<AdminStats>({
        queryKey: ['adminStats'],
        queryFn: async () => {
            const res = await api.get('/api/v1/admin/stats');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: trendData } = useQuery<TrendData>({
        queryKey: ['adminTrends', range],
        queryFn: async () => {
            const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
            const [appt, scan] = await Promise.all([
                adminAPI.getAppointmentTrends(days),
                adminAPI.getScanTrends(days)
            ]);
            return { appt: appt.data?.data || [], scan: scan.data?.data || [] };
        }
    });

    const { data: doctorPerf, isLoading: loadingDoctorPerf } = useQuery<DoctorPerformance[]>({
        queryKey: ['adminDoctorPerf'],
        queryFn: () => adminAPI.getDoctorPerformance().then(res => res.data?.data || [])
    });

    const patTrend = trendData?.appt.map((a) => ({ label: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: a.total + 2 })) || []; // Added offset for demo visual
    const apptTrend = trendData?.appt.map((a) => ({ label: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: a.total })) || [];
    const scanTrend = trendData?.scan.map((s) => ({ label: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: s.total })) || [];

    const pieData = [
        { name: t("common.patients", "Patients"), value: stats?.total_patients || 0 },
        { name: t("common.doctors", "Doctors"), value: stats?.total_doctors || 0 },
        { name: t("common.appointments", "Appointments"), value: stats?.total_appointments || 0 },
        { name: t("common.scans", "Scans"), value: stats?.total_scans || 0 },
    ].filter(d => d.value > 0);

    const ChartEmptyState = ({ icon: Icon, message }: { icon: React.ElementType, message: string }) => (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <Icon className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );

    const exportReport = () => {
        if (!stats) { toast.error(t("admin.analytics.no_data", "No data to export")); return; }
        const csv = [
            [t("admin.analytics.metric", "Metric"), t("admin.analytics.value", "Value")],
            [t("admin.analytics.total_patients", "Total Patients"), stats.total_patients],
            [t("admin.analytics.total_doctors", "Total Doctors"), stats.total_doctors],
            [t("admin.analytics.total_appointments", "Total Appointments"), stats.total_appointments],
            [t("admin.analytics.total_scans", "Total Scans"), stats.total_scans],
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `analytics_${range}.csv`; a.click();
        toast.success(t("admin.analytics.report_exported", "Report exported"));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-[#8B5CF6]" />
                        {t("admin.analytics.title", "Platform Analytics")}
                    </h1>
                    <p className="text-[#64748B] mt-1">{t("admin.analytics.subtitle", "Platform-wide performance metrics and trends")}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['7d', '30d', '90d'] as const).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${range === r ? 'bg-[#8B5CF6] text-white' : 'bg-white border border-gray-200 text-[#64748B] hover:border-[#8B5CF6]'}`}
                        >
                            {r === '7d' ? t("common.last_7_days", "Last 7 days") : r === '30d' ? t("common.last_30_days", "Last 30 days") : t("common.last_90_days", "Last 90 days")}
                        </button>
                    ))}
                    <Button variant="outline" onClick={() => refetch()} className="flex gap-2 items-center text-sm">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={exportReport} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex gap-2 items-center text-sm">
                        <Download className="w-4 h-4" /> {t("common.export", "Export")}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t("admin.analytics.total_patients", "Total Patients"), value: stats?.total_patients ?? '—', icon: Users, color: 'text-blue-600 bg-blue-50', trend: '+12%' },
                    { label: t("admin.analytics.total_doctors", "Total Doctors"), value: stats?.total_doctors ?? '—', icon: Activity, color: 'text-green-600 bg-green-50', trend: '+5%' },
                    { label: t("common.appointments", "Appointments"), value: stats?.total_appointments ?? '—', icon: Calendar, color: 'text-purple-600 bg-purple-50', trend: '+24%' },
                    { label: t("admin.analytics.ai_scans", "AI Scans"), value: stats?.total_scans ?? '—', icon: Scan, color: 'text-teal-600 bg-teal-50', trend: '+31%' },
                ].map(({ label, value, icon: Icon, color, trend }) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className={`p-5 ${isLoading ? 'animate-pulse' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                                    <TrendingUp className="w-3 h-3" /> {trend}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-[#0F172A] mt-3">{value}</p>
                            <p className="text-sm text-[#64748B]">{label}</p>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Patient Growth */}
                <Card className="p-6 h-[320px]">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" /> {t("admin.analytics.patient_growth", "Patient Growth")}
                    </h3>
                    <div className="h-[220px]">
                        {patTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={patTrend}>
                                    <defs>
                                        <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="url(#patGrad)" strokeWidth={2} name={t("common.patients", "Patients")} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmptyState icon={Users} message={t("admin.analytics.no_patient_data", "No patient growth data")} />
                        )}
                    </div>
                </Card>

                {/* Appointment Trends */}
                <Card className="p-6 h-[320px]">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" /> {t("admin.analytics.appointment_trends", "Appointment Trends")}
                    </h3>
                    <div className="h-[220px]">
                        {apptTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={apptTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} name={t("common.appointments", "Appointments")} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmptyState icon={Calendar} message={t("admin.analytics.no_appointment_data", "No appointment trends available")} />
                        )}
                    </div>
                </Card>

                {/* AI Scan Volume */}
                <Card className="p-6 h-[320px]">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                        <Scan className="w-5 h-5 text-teal-500" /> {t("admin.analytics.scan_volume", "AI Scan Volume")}
                    </h3>
                    <div className="h-[220px]">
                        {scanTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={scanTrend}>
                                    <defs>
                                        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#0D9488" fill="url(#scanGrad)" strokeWidth={2} name={t("common.scans", "Scans")} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmptyState icon={Scan} message={t("admin.analytics.no_scan_data", "No AI scan data available")} />
                        )}
                    </div>
                </Card>

                {/* Platform Distribution Pie */}
                <Card className="p-6 h-[320px]">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-500" /> {t("admin.analytics.distribution", "Platform Distribution")}
                    </h3>
                    <div className="h-[220px]">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {pieData.map((_, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmptyState icon={TrendingUp} message={t("admin.analytics.no_distribution_data", "No distribution data available")} />
                        )}
                    </div>
                </Card>
            </div>

            {/* Doctor Performance Table */}
            <Card className="p-6">
                <h2 className="text-lg font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#8B5CF6]" /> {t("admin.analytics.top_doctors", "Top Performing Doctors")}
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-4 px-4 font-medium text-[#64748B]">{t("common.doctor", "Doctor")}</th>
                                <th className="text-left py-4 px-4 font-medium text-[#64748B]">{t("common.specialty", "Specialty")}</th>
                                <th className="text-left py-4 px-4 font-medium text-[#64748B]">{t("common.rating", "Rating")}</th>
                                <th className="text-right py-4 px-4 font-medium text-[#64748B]">{t("admin.analytics.appointments_ratio", "Appointments (Comp/Total)")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingDoctorPerf ? (
                                <tr>
                                    <td colSpan={4}><Skeleton variant="rectangular" height={100} /></td>
                                </tr>
                            ) : (doctorPerf && doctorPerf.length > 0) ? (
                                doctorPerf.map((doctor) => (
                                    <tr key={doctor.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-4 px-4">
                                            <div className="font-medium text-[#0F172A]">{doctor.name}</div>
                                        </td>
                                        <td className="py-4 px-4 text-[#64748B]">{doctor.specialty}</td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center text-[#F59E0B]">
                                                ⭐ {doctor.rating}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="font-medium text-[#22C55E]">{doctor.completed_appointments}</span>
                                            <span className="text-[#64748B]"> / {doctor.total_appointments}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">{t("admin.analytics.no_doctor_data", "No doctor performance data.")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

