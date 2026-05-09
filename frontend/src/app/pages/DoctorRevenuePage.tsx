import { useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Users, Download, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { doctorAPI } from '../../lib/api';
import { Skeleton } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DoctorRevenuePage() {
    const { t } = useTranslation();
    const [timeFilter, setTimeFilter] = useState('month');

    const { data: revenueData, isLoading, error } = useQuery({
        queryKey: ['doctorRevenue', timeFilter],
        queryFn: () => doctorAPI.getRevenue(timeFilter).then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton width={300} height={40} />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} variant="rounded" />)}
                    </div>
                    <Card className="p-8">
                        <Skeleton height={400} variant="rounded" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("doctor.revenue.failed_load", "Failed to load revenue data")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    const stats = revenueData?.stats || {
        today: 0,
        week: 0,
        month: 0,
        total: 0,
        total_appointments: 0,
        completed_appointments: 0,
        average_per_appointment: 0,
        growth_percentage: 0
    };

    const chartData = revenueData?.chart_data || [];
    const appointmentTypes = revenueData?.appointment_types || [];
    const recentTransactions = revenueData?.recent_transactions || [];

    const COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#22C55E'];

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{t("doctor.revenue.title", "Revenue & Earnings")}</h1>
                            <p className="text-[#64748B]">{t("doctor.revenue.subtitle", "Track your consultation income and financial performance")}</p>
                        </div>
                        <Button className="gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
                            <Download className="w-4 h-4" />
                            {t("doctor.revenue.export_report", "Export Report")}
                        </Button>
                    </div>

                    {/* Time Filter */}
                    <div className="flex gap-2">
                        {['today', 'week', 'month', 'year'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${timeFilter === filter
                                    ? "bg-[#0EA5E9] text-white shadow-md"
                                    : "bg-white border border-gray-200 text-[#64748B] hover:bg-gray-50"
                                    }`}
                            >
                                {filter === 'today' ? t("common.today", "Today") : t(`common.this_${filter}`, `This ${filter}`)}
                            </button>
                        ))}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="p-6 border border-gray-100 bg-white hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                        <DollarSign className="w-6 h-6 text-green-600" />
                                    </div>
                                    {stats.growth_percentage >= 0 ? (
                                        <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                                            <ArrowUpRight className="w-4 h-4" />
                                            {stats.growth_percentage}%
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
                                            <ArrowDownRight className="w-4 h-4" />
                                            {Math.abs(stats.growth_percentage)}%
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{t("doctor.revenue.todays_revenue", "Today's Revenue")}</p>
                                <p className="text-3xl font-bold text-[#0F172A]">₹{stats.today}</p>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card className="p-6 border border-gray-100 bg-white hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{t("common.this_week", "This Week")}</p>
                                <p className="text-3xl font-bold text-[#0F172A]">₹{stats.week}</p>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card className="p-6 border border-gray-100 bg-white hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{t("common.this_month", "This Month")}</p>
                                <p className="text-3xl font-bold text-[#0F172A]">₹{stats.month}</p>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            <Card className="p-6 border border-gray-100 bg-white hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{t("doctor.revenue.avg_per_appointment", "Avg per Appointment")}</p>
                                <p className="text-3xl font-bold text-[#0F172A]">₹{stats.average_per_appointment}</p>
                            </Card>
                        </motion.div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Revenue Trend Chart */}
                        <Card className="lg:col-span-2 p-6 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[#0F172A]">{t("doctor.revenue.revenue_trend", "Revenue Trend")}</h3>
                                    <p className="text-sm text-gray-500">{t("doctor.revenue.daily_earnings", "Daily earnings over time")}</p>
                                </div>
                            </div>
                            <div className="h-80">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => [`₹${value}`, t("doctor.revenue.revenue", "Revenue")]}
                                            />
                                            <Line type="monotone" dataKey="revenue" stroke="#0EA5E9" strokeWidth={3} dot={{ fill: '#0EA5E9', r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <div className="text-center">
                                            <TrendingUp className="w-16 h-16 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">{t("doctor.revenue.no_data_yet", "No revenue data available yet")}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Appointment Types Breakdown */}
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.revenue.revenue_by_type", "Revenue by Type")}</h3>
                            <div className="h-64">
                                {appointmentTypes.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={appointmentTypes}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {appointmentTypes.map((entry: { name: string; value: number }, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `₹${value}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <p className="text-sm">{t("common.no_data", "No data")}</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 space-y-2">
                                {appointmentTypes.map((type: { name: string; value: number }, index: number) => (
                                    <div key={type.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-sm text-gray-700">{type.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#0F172A]">₹{type.value}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Recent Transactions */}
                    <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.revenue.recent_transactions", "Recent Transactions")}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 text-sm text-gray-600">
                                        <th className="text-left py-3 px-4">{t("common.date", "Date")}</th>
                                        <th className="text-left py-3 px-4">{t("common.patient", "Patient")}</th>
                                        <th className="text-left py-3 px-4">{t("common.type", "Type")}</th>
                                        <th className="text-left py-3 px-4">{t("common.status", "Status")}</th>
                                        <th className="text-right py-3 px-4">{t("doctor.revenue.amount", "Amount")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((transaction: { id: string; date: string; patient_name: string; type: string; status: string; amount: number }) => (
                                            <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm text-gray-700">
                                                    {new Date(transaction.date).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-medium text-[#0F172A]">
                                                    {transaction.patient_name}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-700">
                                                    {transaction.type}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${transaction.status === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {String(t(`common.status_${transaction.status.toLowerCase()}`, transaction.status))}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-sm font-bold text-green-600">
                                                    ₹{transaction.amount}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                {t("doctor.revenue.no_transactions", "No transactions yet")}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Summary Stats */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="p-5 border border-gray-100 bg-white">
                            <p className="text-sm text-gray-600 mb-1">{t("doctor.revenue.total_appointments", "Total Appointments")}</p>
                            <p className="text-2xl font-bold text-[#0F172A]">{stats.total_appointments}</p>
                        </Card>
                        <Card className="p-5 border border-gray-100 bg-white">
                            <p className="text-sm text-gray-600 mb-1">{t("common.completed", "Completed")}</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completed_appointments}</p>
                        </Card>
                        <Card className="p-5 border border-gray-100 bg-white">
                            <p className="text-sm text-gray-600 mb-1">{t("doctor.revenue.total_earnings", "Total Earnings")}</p>
                            <p className="text-2xl font-bold text-[#0F172A]">₹{stats.total}</p>
                        </Card>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
