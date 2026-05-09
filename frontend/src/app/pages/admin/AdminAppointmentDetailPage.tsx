import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Video, User, Stethoscope, FileText, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Skeleton } from "@mui/material";
import { useTranslation } from 'react-i18next';

interface AppointmentRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    scheduled_at: string;
    status: string;
    consultation_type: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
    profiles_patient?: {
        full_name?: string;
        email?: string;
    };
    profiles_doctor?: {
        full_name?: string;
        specialty?: string;
        consultation_fee?: number;
    };
}

export default function AdminAppointmentDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: appointment, isLoading, error } = useQuery<AppointmentRecord>({
        queryKey: ['adminAppointment', id],
        queryFn: () => adminAPI.getAppointment(id!).then(res => res.data),
        enabled: !!id
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton width={200} height={40} />
                <Card className="p-8">
                    <Skeleton height={300} variant="rounded" />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-red-50 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("admin.appointment_detail.failed_load", "Failed to load appointment")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="p-12 text-center bg-yellow-50 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-yellow-900">{t("admin.appointment_detail.not_found", "Appointment not found")}</h3>
                <Button onClick={() => navigate('/admin/appointments')} className="mt-4">
                    {t("admin.appointment_detail.back_to_list", "Back to Appointments")}
                </Button>
            </div>
        );
    }

    const patientName = appointment.profiles_patient?.full_name || t("common.unknown_patient", "Unknown Patient");
    const patientEmail = appointment.profiles_patient?.email || t("common.na", "N/A");
    const doctorName = appointment.profiles_doctor?.full_name || t("common.unknown_doctor", "Unknown Doctor");
    const doctorSpecialty = appointment.profiles_doctor?.specialty || t("common.na", "N/A");
    const appointmentDate = appointment.scheduled_at ? new Date(appointment.scheduled_at).toLocaleDateString() : t("common.na", "N/A");
    const appointmentTime = appointment.scheduled_at ? new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t("common.na", "N/A");
    const consultationType = appointment.consultation_type === 'video' ? t("common.video_call", "Video Call") : t("common.in_person", "In-Person");
    const consultationFee = appointment.profiles_doctor?.consultation_fee ? `₹${appointment.profiles_doctor.consultation_fee}` : t("common.na", "N/A");
    const status = appointment.status || 'unknown';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/appointments')}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-[#0F172A]">{t("admin.appointment_detail.title", "Appointment Details")}</h1>
                    <p className="text-[#64748B]">{t("admin.appointment_detail.subtitle", "Complete information for appointment {{id}}...", { id: String(appointment.id).slice(0, 8) })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details Card */}
                <Card className="lg:col-span-2 p-6 border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[#0F172A] mb-1">{appointment.id.slice(0, 16)}...</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${status === "scheduled" ? "bg-[#0EA5E9]/10 text-[#0EA5E9]" :
                                    status === "completed" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                                        "bg-[#F43F5E]/10 text-[#F43F5E]"
                                    }`}>
                                    {String(t(`common.${status}`, status))}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                    {consultationType}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">{t("admin.appointment_detail.consultation_fee", "Consultation Fee")}</p>
                            <p className="text-2xl font-bold text-[#0F172A]">{consultationFee}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <User className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.patient", "Patient")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{patientName}</p>
                                    <p className="text-xs text-gray-500">{patientEmail}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.date", "Date")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{appointmentDate}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Stethoscope className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.doctor", "Doctor")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{doctorName}</p>
                                    <p className="text-xs text-gray-500">{doctorSpecialty}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Clock className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.time", "Time")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{appointmentTime}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> {t("common.notes", "Notes")}
                        </h3>
                        <p className="text-sm text-gray-600">{appointment.notes || t("admin.appointment_detail.no_notes", "No notes available for this appointment.")}</p>
                    </div>
                </Card>

                {/* Actions Card */}
                <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("common.actions", "Actions")}</h3>
                    <div className="space-y-3">
                        {consultationType === t("common.video_call", "Video Call") && status === "scheduled" && (
                            <Button className="w-full gap-2 bg-[#0EA5E9] hover:bg-[#0284C7]">
                                <Video className="w-4 h-4" /> {t("admin.appointment_detail.join_video", "Join Video Call")}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => navigate(`/admin/patients/${appointment.patient_id}`)}
                        >
                            <User className="w-4 h-4" /> {t("admin.appointment_detail.view_patient", "View Patient Profile")}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => navigate(`/admin/doctors`)}
                        >
                            <Stethoscope className="w-4 h-4" /> {t("admin.appointment_detail.view_doctor", "View Doctor Profile")}
                        </Button>
                        {status === "scheduled" && (
                            <>
                                <Button variant="outline" className="w-full gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                                    <Calendar className="w-4 h-4" /> {t("admin.appointment_detail.reschedule", "Reschedule")}
                                </Button>
                                <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50">
                                    <AlertCircle className="w-4 h-4" /> {t("common.cancel", "Cancel")}
                                </Button>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Timeline Section */}
            <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("admin.appointment_detail.timeline", "Appointment Timeline")}</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                        <div>
                            <p className="text-sm font-medium text-[#0F172A]">{t("admin.appointment_detail.created", "Appointment Created")}</p>
                            <p className="text-xs text-gray-500">
                                {appointment.created_at ? new Date(appointment.created_at).toLocaleString() : t("common.unknown", "Unknown")}
                            </p>
                        </div>
                    </div>
                    {status === "completed" && (
                        <div className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            <div>
                                <p className="text-sm font-medium text-[#0F172A]">{t("admin.appointment_detail.completed", "Consultation Completed")}</p>
                                <p className="text-xs text-gray-500">{t("admin.appointment_detail.datetime_at", "{{date}} at {{time}}", { date: appointmentDate, time: appointmentTime })}</p>
                            </div>
                        </div>
                    )}
                    {status === "cancelled" && (
                        <div className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                            <div>
                                <p className="text-sm font-medium text-[#0F172A]">{t("admin.appointment_detail.cancelled", "Appointment Cancelled")}</p>
                                <p className="text-xs text-gray-500">
                                    {appointment.updated_at ? new Date(appointment.updated_at).toLocaleString() : t("common.unknown", "Unknown")}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}

