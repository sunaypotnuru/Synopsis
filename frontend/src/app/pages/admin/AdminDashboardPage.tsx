import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Users, UserRoundPlus, Calendar, Scan, TrendingUp, AlertCircle, ArrowUpRight, Zap, ShieldCheck, FileText, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { adminAPI } from '@/lib/api';
import { Skeleton } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getWebSocketManager } from '../../services/websocket';
import { toast } from 'sonner';

interface DayData {
    name: string;
    count: number;
}

interface DashboardStats {
    total_patients?: number;
    total_doctors?: number;
    total_appointments?: number;
    total_scans?: number;
    total_doctors_pending?: number;
    growth_data?: Array<{ name: string; users: number; scans: number }>;
    appointments_weekly?: DayData[];
}

export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: dashboardData, isLoading, error } = useQuery<DashboardStats>({
        queryKey: ['adminStats'],
        queryFn: () => adminAPI.getStats().then(res => res.data)
    });

    useEffect(() => {
        const setupRealtime = async () => {
            try {
                const manager = getWebSocketManager();
                if (manager) {
                    const conn = await manager.connect('notifications');
                    conn.on('admin_dashboard_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
                        toast.info("Admin dashboard refreshed");
                    });
                    conn.on('system_alert', (data) => {
                        toast.error(`System Alert: ${data.message || 'Critical Issue Detected'}`);
                    });
                }
            } catch (err) {
                console.error("Failed to setup real-time admin updates:", err);
            }
        };
        setupRealtime();
    }, [queryClient]);

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <Skeleton width={320} height={50} animation="wave" />
                            <Skeleton width={200} height={30} animation="wave" />
                        </div>
                        <Skeleton variant="rounded" width={140} height={40} animation="wave" className="rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={140} animation="wave" className="rounded-2xl" />)}
                    </div>
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Skeleton variant="rounded" height={400} animation="wave" className="lg:col-span-2 rounded-2xl" />
                        <Skeleton variant="rounded" height={400} animation="wave" className="rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <div className="w-16 h-16 bg-red-100 text-[#F43F5E] rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("admin.dashboard.unable_to_load", "Unable to load dashboard")}</h2>
                <p className="text-[#64748B] max-w-md mb-6">{t("admin.dashboard.fetch_error", "We encountered an issue fetching platform statistics:")} {(error as Error).message}</p>
                <Button onClick={() => window.location.reload()} className="bg-[#0D9488] hover:bg-[#0F766E] text-white px-8">
                    {t("common.try_again", "Try Again")}
                </Button>
            </div>
        );
    }

    const statsData = dashboardData || {};

    // Dynamic Stats Array mapping
    const dynamicStats = [
        { title: t("admin.dashboard.stats.total_patients", "Total Patients"), value: statsData.total_patients || 0, change: '+12%', icon: Users, color: '#0D9488', bg: '#F0FDFA' },
        { title: t("admin.dashboard.stats.total_doctors", "Total Doctors"), value: statsData.total_doctors || 0, change: '+5%', icon: UserRoundPlus, color: '#0EA5E9', bg: '#F0F9FF' },
        { title: t("admin.dashboard.stats.total_appointments", "Total Appointments"), value: statsData.total_appointments || 0, change: '+18%', icon: Calendar, color: '#F43F5E', bg: '#FFF1F2' },
        { title: t("admin.dashboard.stats.total_scans", "AI Scans Processed"), value: statsData.total_scans || 0, change: '+24%', icon: Scan, color: '#8B5CF6', bg: '#F5F3FF' },
    ];

    // Chart data - will be populated from API in future
    // For now showing empty structure ready for real data
    const growthData = statsData.growth_data || [];
    const appointmentsData = statsData.appointments_weekly || [];

    // Show empty state message if no data
    const hasGrowthData = growthData.length > 0;
    const hasAppointmentsData = appointmentsData.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            <div>
                <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{t("admin.dashboard.title", "Platform Overview")}</h1>
                <p className="text-[#64748B]">{t("admin.dashboard.subtitle", "Welcome to Netra AI Admin Dashboard")}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dynamicStats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="p-6 border border-gray-100 hover:shadow-lg transition-shadow bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <stat.icon className="w-24 h-24" style={{ color: stat.color }} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: stat.bg }}>
                                        <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-semibold bg-[#22C55E]/10 text-[#22C55E] px-2 py-1 rounded-full">
                                        <TrendingUp className="w-3 h-3" />
                                        {stat.change}
                                    </div>
                                </div>
                                <h3 className="text-gray-500 font-medium text-sm mb-1">{stat.title}</h3>
                                <p className="text-3xl font-bold text-[#0F172A]">{stat.value}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Growth Area Chart */}
                <Card className="p-6 border border-gray-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-[#0F172A]">{t("admin.dashboard.platform_growth", "Platform Growth")}</h3>
                            <p className="text-sm text-gray-500">{t("admin.dashboard.growth_subtitle", "Users and Scans over time")}</p>
                        </div>
                        <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-[#8B5CF6]">
                            <option>{t("common.last_6_months", "Last 6 Months")}</option>
                            <option>{t("common.this_year", "This Year")}</option>
                        </select>
                    </div>
                    <div className="h-72 w-full">
                        {hasGrowthData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="scans" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorScans)" />
                                    <Area type="monotone" dataKey="users" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <TrendingUp className="w-16 h-16 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">{t("admin.dashboard.no_growth_data", "No growth data available yet")}</p>
                                    <p className="text-xs mt-1">{t("admin.dashboard.no_growth_data_desc", "Data will appear as users join the platform")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Weekly Appointments Bar Chart */}
                <Card className="p-6 border border-gray-100">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-[#0F172A]">{t("admin.dashboard.weekly_appointments", "Weekly Appointments")}</h3>
                        <p className="text-sm text-gray-500">{t("admin.dashboard.weekly_appointments_desc", "Consultations scheduled this week")}</p>
                    </div>
                    <div className="h-64 w-full">
                        {hasAppointmentsData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={appointmentsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}
                                    />
                                    <Bar dataKey="count" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <Calendar className="w-16 h-16 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">{t("admin.dashboard.no_appointment_data", "No appointment data available yet")}</p>
                                    <p className="text-xs mt-1">{t("admin.dashboard.no_appointment_data_desc", "Data will appear as appointments are scheduled")}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t("common.total_this_week", "Total this week")}</p>
                            <p className="font-semibold text-[#0F172A]">
                                {hasAppointmentsData ? appointmentsData.reduce((sum, day) => sum + (day.count || 0), 0) : 0}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#F43F5E]/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#F43F5E]" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Action Needed Section */}
            <h3 className="text-xl font-bold text-[#0F172A] mt-10 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                {t("admin.dashboard.requires_attention", "Requires Attention")}
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { title: t("admin.dashboard.action.pending_doctors", "Pending Doctor Approvals"), count: (statsData.total_doctors_pending || 0), action: t("admin.dashboard.action.review_profiles", "Review Profiles"), color: "#F59E0B", path: "/admin/doctors" },
                    { title: t("admin.dashboard.action.reported_issues", "Reported Issues"), count: 0, action: t("admin.dashboard.action.view_tickets", "View Tickets"), color: "#F43F5E", path: "/admin/patients" },
                    { title: t("admin.dashboard.action.system_updates", "System Updates"), count: 1, action: t("admin.dashboard.action.view_logs", "View Logs"), color: "#0EA5E9", path: "/admin/scans" }
                ].map(item => (
                    <Card key={item.title} className="p-5 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</p>
                                <p className="font-medium text-[#0F172A] mt-1">{item.title}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(item.path)}
                            className="text-sm font-semibold flex items-center gap-1 hover:underline w-full transition-all hover:gap-2"
                            style={{ color: item.color }}
                        >
                            {item.action} <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </Card>
                ))}
            </div>

            {/* Operational Intelligence (MCP) */}
            <h3 className="text-xl font-bold text-[#0F172A] mt-10 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#0D9488]" />
                {t("admin.dashboard.operational_intelligence", "Operational Intelligence")}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white border border-gray-100 hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <Activity className="w-24 h-24 text-[#0D9488]" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#0D9488]/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-[#0D9488]" />
                        </div>
                        <h4 className="font-bold text-[#0F172A]">Diagnostic Performance</h4>
                    </div>
                    <p className="text-sm text-[#64748B] mb-6">Analyze ML model accuracy, latency, and success rates across all clinical tools.</p>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => navigate('/admin/reports')}
                            size="sm" 
                            className="bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-bold"
                        >
                            Generate Analytics
                        </Button>
                        <Button 
                            onClick={() => navigate('/admin/mcp')}
                            variant="ghost" 
                            size="sm" 
                            className="text-[#0D9488] hover:bg-[#0D9488]/10 rounded-xl font-bold"
                        >
                            Live Monitor
                        </Button>
                    </div>
                </Card>

                <Card className="p-6 bg-white border border-gray-100 hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-[#0F172A]">Compliance Audit Trails</h4>
                    </div>
                    <p className="text-sm text-[#64748B] mb-6">Access HIPAA-compliant logs for all patient data access and diagnostic operations.</p>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => navigate('/admin/reports')}
                            size="sm" 
                            className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-bold"
                        >
                            Export Audit Logs
                        </Button>
                        <Button 
                            onClick={() => navigate('/admin/security')}
                            variant="ghost" 
                            size="sm" 
                            className="text-[#0F172A] hover:bg-gray-100 rounded-xl font-bold"
                        >
                            Security Overview
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap gap-4">
                <Button
                    onClick={() => navigate('/admin/appointments')}
                    className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
                >
                    <Calendar className="w-4 h-4" />
                    {t("admin.dashboard.view_appointments", "View All Appointments")}
                </Button>
                <Button
                    onClick={() => navigate('/admin/patients')}
                    variant="outline"
                    className="gap-2"
                >
                    <Users className="w-4 h-4" />
                    {t("admin.dashboard.manage_patients", "Manage Patients")}
                </Button>
                <Button
                    onClick={() => navigate('/admin/scans')}
                    variant="outline"
                    className="gap-2"
                >
                    <Scan className="w-4 h-4" />
                    {t("admin.dashboard.view_scans", "View AI Scans")}
                </Button>
            </div>
        </motion.div>
    );
}

