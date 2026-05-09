import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { Search, Video, Clock, Filter, Eye, MapPin, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { adminAPI } from '@/lib/api';
import { Skeleton } from "@mui/material";
import { getWebSocketManager } from '@/app/services/websocket';

interface Appointment {
    id: string;
    consultation_type?: string;
    profiles_patient?: { full_name?: string };
    profiles_doctor?: { full_name?: string; consultation_fee?: number };
    scheduled_at?: string;
    status?: string;
}

export default function AdminAppointmentsPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        const setupWS = async () => {
            try {
                const manager = getWebSocketManager();
                if (manager) {
                    const conn = await manager.connect('notifications');
                    conn.on('appointment_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['adminAppointments'] });
                    });
                }
            } catch (err) {
                console.error("WS setup failed for admin appointments:", err);
            }
        };
        setupWS();
    }, [queryClient]);

    const { data: appointments, isLoading, error } = useQuery({
        queryKey: ['adminAppointments'],
        queryFn: () => adminAPI.getAppointments().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton width={300} height={40} />
                <Card className="p-8">
                    <Skeleton height={400} variant="rounded" />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-red-50 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("admin.appointments.failed_load", "Failed to load appointments")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    const filtered = (appointments || []).filter((a: Appointment) => {
        const matchesSearch =
            (a.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.profiles_patient?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.profiles_doctor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' ? true : (a.status || '').toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{t("admin.appointments.title", "Platform Appointments")}</h1>
                <p className="text-[#64748B]">{t("admin.appointments.subtitle", "Monitor all scheduled, completed, and cancelled consultations")}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t("admin.appointments.search_placeholder", "Search APT ID, Patient, or Doctor...")}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#8B5CF6] transition-colors bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                    <Filter className="w-5 h-5 text-gray-400 shrink-0 mr-1" />
                    {['All', 'Scheduled', 'Completed', 'Cancelled'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${statusFilter === s
                                ? "bg-[#0F172A] text-white shadow-md"
                                : "bg-white border border-gray-200 text-[#64748B] hover:bg-gray-50"
                                }`}
                        >
                            {t(`common.filter_${s.toLowerCase()}`, s)}
                        </button>
                    ))}
                </div>
            </div>

            <Card className="border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-500">
                                <th className="p-4">{t("admin.appointments.col_id_type", "Appt ID & Type")}</th>
                                <th className="p-4">{t("admin.appointments.col_patient", "Patient")}</th>
                                <th className="p-4">{t("admin.appointments.col_doctor", "Doctor")}</th>
                                <th className="p-4">{t("admin.appointments.col_date_time", "Date & Time")}</th>
                                <th className="p-4">{t("admin.appointments.col_status_fee", "Status & Fee")}</th>
                                <th className="p-4 text-right">{t("admin.appointments.col_details", "Details")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((apt: Appointment) => (
                                <tr key={apt.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-[#0F172A] font-mono text-sm">{apt.id.slice(0, 8)}...</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            {apt.consultation_type === "video" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                            {apt.consultation_type === "video" ? t("common.video_call", "Video Call") : t("common.in_person", "In-Person")}
                                        </p>
                                    </td>
                                    <td className="p-4 font-medium text-[#0F172A] text-sm">
                                        {apt.profiles_patient?.full_name || t("common.unknown_patient", "Unknown Patient")}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {apt.profiles_doctor?.full_name || t("common.unknown_doctor", "Unknown Doctor")}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-[#0F172A]">
                                            {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleDateString() : t("common.na", "N/A")}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t("common.na", "N/A")}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${apt.status === "scheduled" ? "bg-[#0EA5E9]/10 text-[#0EA5E9]" :
                                                apt.status === "completed" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                                                    "bg-[#F43F5E]/10 text-[#F43F5E]"
                                                }`}>
                                                {apt.status ? String(t(`common.status_${apt.status}`, apt.status)) : t("common.unknown", "Unknown")}
                                            </span>
                                            <span className="text-xs font-semibold text-[#64748B]">
                                                {apt.profiles_doctor?.consultation_fee ? `₹${apt.profiles_doctor.consultation_fee}` : t("common.na", "N/A")}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                                            onClick={() => navigate(`/admin/appointments/${apt.id}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" /> {t("common.view", "View")}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        {t("admin.appointments.no_results", "No appointments found matching filters.")}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </motion.div>
    );
}




