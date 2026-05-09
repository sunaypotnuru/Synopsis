import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Calendar, Video, User, FileText, ChevronDown, Check, X, AlertCircle, Search, Filter, Bot, Copy, Sparkles, Loader2, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrescriptionSummary } from "@/components/features/domain/PrescriptionSummary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorAPI } from "../../lib/api";
import api from "../../lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isFuture } from "date-fns";
import { useTranslation } from "../../lib/i18n";
import { getWebSocketManager } from "../services/websocket";
import { useEffect } from "react";

interface PatientProfile {
  id?: string;
  name?: string;
  full_name?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  avatar_url?: string;
}

interface DoctorProfile {
  name?: string;
  specialty?: string;
}

interface DoctorAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  profiles_patient?: PatientProfile;
  profiles_doctor?: DoctorProfile;
  notes?: string;
  consultation_type?: string;
  type?: string;
  risk_level?: string;
  is_waitlist?: boolean;
}

interface WaitlistEntry {
  id: string;
  preferred_date?: string;
  joined_at: string;
  profiles_doctor?: DoctorProfile;
  reason: string;
  urgency?: string;
}

export default function DoctorAppointmentsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "waitlist">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [selectedPatientForRx, setSelectedPatientForRx] = useState<DoctorAppointment | null>(null);
    const [scribeOpen, setScribeOpen] = useState(false);
    const [scribeNotes, setScribeNotes] = useState("");
    const [scribeResult, setScribeResult] = useState("");
    const [scribeLoading, setScribeLoading] = useState(false);
    const [scribeAppointment, setScribeAppointment] = useState<DoctorAppointment | null>(null);
    const [intakeOpen, setIntakeOpen] = useState(false);
    const [intakeData, setIntakeData] = useState<Record<string, unknown> | null>(null);
    const [intakeLoading, setIntakeLoading] = useState(false);
    const [intakeAppointment, setIntakeAppointment] = useState<DoctorAppointment | null>(null);

    const openIntake = async (appointment: DoctorAppointment) => {
        setIntakeAppointment(appointment);
        setIntakeData(null);
        setIntakeOpen(true);
        setIntakeLoading(true);
        try {
            const res = await api.get(`/api/v1/intake/response/${appointment.id}`);
            setIntakeData(res.data);
        } catch {
            setIntakeData(null);
        } finally {
            setIntakeLoading(false);
        }
    };

    const openScribe = (appointment: DoctorAppointment) => {
        setScribeAppointment(appointment);
        setScribeNotes("");
        setScribeResult("");
        setScribeOpen(true);
    };

    const runScribe = async () => {
        if (!scribeNotes.trim()) { toast.error(t("doctor.appointments.enter_notes", "Enter consultation notes first")); return; }
        setScribeLoading(true);
        try {
            const res = await api.post("/api/v1/ai/scribe", {
                notes: scribeNotes,
                patient_name: scribeAppointment?.profiles_patient?.full_name || "Patient",
                appointment_type: scribeAppointment?.consultation_type || "consultation",
            });
            setScribeResult(res.data.soap_note || res.data.response || "");
        } catch {
            toast.error(t("doctor.appointments.scribe_failed", "Scribe failed — check your AI key."));
        } finally {
            setScribeLoading(false);
        }
    };

    const { data: appointments, isLoading, error } = useQuery<DoctorAppointment[]>({
        queryKey: ['doctorAppointments'],
        queryFn: () => doctorAPI.getAppointments().then((res) => res.data)
    });

    const { data: waitlist, isLoading: waitlistLoading } = useQuery<WaitlistEntry[]>({
        queryKey: ['doctorWaitlist'],
        queryFn: () => doctorAPI.getWaitlist().then((res) => res.data?.data || res.data || [])
    });

    useEffect(() => {
        const setupRealtime = async () => {
            try {
                const manager = getWebSocketManager();
                if (manager) {
                    const conn = await manager.connect('notifications');
                    conn.on('appointment_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
                        toast.info("Schedule updated in real-time");
                    });
                    conn.on('waitlist_update', () => {
                        queryClient.invalidateQueries({ queryKey: ['doctorWaitlist'] });
                        toast.info("Waitlist updated");
                    });
                }
            } catch (err) {
                console.error("Failed to setup real-time schedule updates:", err);
            }
        };
        setupRealtime();
    }, [queryClient]);

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) =>
            doctorAPI.updateAppointmentStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] });
            toast.success(t("doctor.appointments.status_updated", "Appointment status updated"));
        },
        onError: () => {
            toast.error(t("doctor.appointments.status_failed", "Failed to update status"));
        }
    });

    const waitlistStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) =>
            doctorAPI.updateWaitlistStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorWaitlist'] });
            toast.success(t("doctor.appointments.waitlist_updated", "Waitlist status updated"));
        },
        onError: () => {
            toast.error(t("doctor.appointments.waitlist_failed", "Failed to update waitlist status"));
        }
    });

    const handleApproveRx = () => {
        setSelectedPatientForRx(null);
        toast.success(t("doctor.appointments.prescription_sent", "Prescription signed and sent to patient."));
    };

    if (isLoading || waitlistLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="w-[300px] h-[60px]" />
                    <Skeleton className="w-[200px] h-[30px] mb-8" />
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("doctor.appointments.failed_load", "Failed to load appointments")}</h2>
                <p className="text-[#64748B] mb-6">{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] })}>{t("common.retry", "Retry")}</Button>
            </div>
        );
    }

    const filtered: DoctorAppointment[] = (filter === "waitlist" ? (Array.isArray(waitlist) ? waitlist : []).map((w): DoctorAppointment => ({
        ...w,
        scheduled_at: w.preferred_date || w.joined_at,
        notes: t("doctor.appointments.waitlist_label", "Waitlist: ") + w.reason,
        type: w.urgency === 'high' ? t("doctor.appointments.urgent", "Urgent") : t("doctor.appointments.waitlist_tab", "Waitlist"),
        is_waitlist: true,
        status: 'waitlist'
    })) : (Array.isArray(appointments) ? appointments : []).filter((a) => {
        const d = new Date(a.scheduled_at);
        if (filter === "today") return isToday(d);
        if (filter === "upcoming") return isFuture(d) && !isToday(d);
        return true;
    })).filter((a) => {
        const patientName = (a.profiles_patient?.full_name || a.profiles_patient?.name || "").toLowerCase();
        const type = (a.consultation_type || a.type || "").toLowerCase();

        const matchesSearch = patientName.includes(searchTerm.toLowerCase());
        const matchesType = filterType === "all" || type.includes(filterType.toLowerCase());

        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{t("doctor.appointments.title", "Patient Schedule")}</h1>
                    <p className="text-[#64748B]">{t("doctor.appointments.subtitle", "Manage your consultations and patient records")}</p>
                </motion.div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                        {(["all", "today", "upcoming", "waitlist"] as const).map((f) => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === f ? "bg-[#0EA5E9] text-white shadow-md" : "bg-white text-[#64748B] hover:bg-gray-50 border border-gray-100"
                                    }`}>
                                {f === "waitlist"
                                    ? `${t("doctor.appointments.waitlist_tab", "Waitlist")} (${waitlist?.length || 0})`
                                    : t(`doctor.appointments.tab_${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t("doctor.appointments.search_placeholder", "Search patients...")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition-all text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-transparent text-sm focus:outline-none text-[#1F2D3D] font-medium"
                            >
                                <option value="all">{t("doctor.appointments.all_types", "All Types")}</option>
                                <option value="in-person">{t("doctor.appointments.in_person", "In-person")}</option>
                                <option value="video">{t("doctor.appointments.video", "Video")}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {filtered.map((apt, i: number) => {
                        const patient = apt.profiles_patient || {};
                        const dateObj = new Date(apt.scheduled_at);
                        const isExpanded = expandedId === apt.id;

                        return (
                            <motion.div key={apt.id}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                                <Card className={`border border-gray-100 overflow-hidden transition-all ${isExpanded ? 'shadow-lg ring-1 ring-[#0EA5E9]/20' : 'hover:shadow-md'}`}>
                                    <div className="p-5 flex items-center gap-4 cursor-pointer"
                                        onClick={() => setExpandedId(isExpanded ? null : apt.id)}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-[#0EA5E9]/10 text-[#0EA5E9]`}>
                                            {patient.avatar_url ? (
                                                <img src={patient.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                            ) : (
                                                (patient.name || "P").charAt(0)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-[#0F172A] truncate">{patient.full_name || patient.name || t("common.unknown_patient", "Unknown Patient")}</h3>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${apt.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                    }`}>
                                                    {t(`common.status_${apt.status}`, apt.status)}
                                                </span>
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
                                            <p className="text-xs text-[#64748B] font-medium">{apt.notes || t("doctor.appointments.general_consultation", "General Consultation")}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-[#0F172A]">{format(dateObj, "MMM d")} — {format(dateObj, "h:mm a")}</p>
                                            <div className="flex items-center gap-1 text-[10px] font-black text-[#0EA5E9] justify-end uppercase tracking-widest">
                                                <Video className="w-3 h-3" /> {apt.type || 'Video'}
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-gray-50 p-6 bg-gray-50/30"
                                            >
                                                <div className="grid sm:grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <User className="w-4 h-4" /> {t("doctor.appointments.personal_details", "Personal Details")}
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-[#64748B] font-medium">{t("doctor.appointments.age_gender", "Age / Gender")}</span>
                                                                <span className="text-[#0F172A] font-bold">{patient.age || t("common.na", "N/A")} / {patient.gender || t("common.na", "N/A")}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-[#64748B] font-medium">{t("doctor.appointments.blood_type", "Blood Type")}</span>
                                                                <span className="text-rose-600 font-bold">{patient.blood_type || t("common.unknown", "Unknown")}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-[#64748B] font-medium">{t("doctor.appointments.reason_for_visit", "Reason for Visit")}</span>
                                                                <span className="text-[#0F172A] font-bold">{apt.notes || t("doctor.appointments.routine_checkup", "Routine Checkup")}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <FileText className="w-4 h-4" /> {t("doctor.appointments.clinical_history", "Clinical History")}
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t("doctor.appointments.medications", "Medications")}</p>
                                                                <p className="text-sm text-[#0F172A] font-medium">{t("doctor.appointments.no_medications", "None currently listed in profile.")}</p>
                                                            </div>
                                                            <div className="p-3 bg-white border border-gray-100 rounded-xl">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t("doctor.appointments.allergies", "Allergies")}</p>
                                                                <p className="text-sm text-[#0F172A] font-medium">{t("doctor.appointments.no_allergies", "No recorded allergies.")}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                                                    <Button
                                                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold h-11 px-6 rounded-xl shadow-lg"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/doctor/consultation/${apt.id}`); }}
                                                    >
                                                        <Video className="w-4 h-4 mr-2" /> {t("doctor.appointments.join_room", "Join Room")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/5 font-bold h-11 px-6 rounded-xl"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedPatientForRx(apt); }}
                                                    >
                                                        <FileText className="w-4 h-4 mr-2" /> {t("doctor.appointments.review_scans", "Review Scans")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="border-violet-400 text-violet-600 hover:bg-violet-50 font-bold h-11 px-4 rounded-xl"
                                                        onClick={(e) => { e.stopPropagation(); openScribe(apt); }}
                                                        title={t("doctor.appointments.ai_scribe", "AI Scribe")}
                                                    >
                                                        <Bot className="w-4 h-4 mr-1.5" /> {t("doctor.appointments.ai_scribe", "AI Scribe")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="border-emerald-400 text-emerald-600 hover:bg-emerald-50 font-bold h-11 px-4 rounded-xl"
                                                        onClick={(e) => { e.stopPropagation(); openIntake(apt); }}
                                                        title={t("doctor.appointments.view_intake", "View Patient Intake Q&A")}
                                                    >
                                                        <ClipboardList className="w-4 h-4 mr-1.5" /> {t("doctor.appointments.view_intake", "Intake Q&A")}
                                                    </Button>

                                                    {apt.is_waitlist ? (
                                                        <>
                                                            <Button
                                                                className="bg-green-500 hover:bg-green-600 text-white font-bold h-11 px-6 rounded-xl ml-auto"
                                                                onClick={(e) => { e.stopPropagation(); waitlistStatusMutation.mutate({ id: apt.id, status: 'fulfilled' }); }}
                                                                loading={waitlistStatusMutation.isPending}
                                                            >
                                                                <Check className="w-4 h-4 mr-2" /> {t("doctor.appointments.accept_waitlist", "Accept from Waitlist")}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="border-rose-500 text-rose-500 hover:bg-rose-50 font-bold h-11 px-6 rounded-xl"
                                                                onClick={(e) => { e.stopPropagation(); waitlistStatusMutation.mutate({ id: apt.id, status: 'cancelled' }); }}
                                                                loading={waitlistStatusMutation.isPending}
                                                            >
                                                                <X className="w-4 h-4 mr-2" /> {t("common.remove", "Remove")}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {apt.status === 'scheduled' && (
                                                                <Button
                                                                    variant="outline"
                                                                    className="border-green-500 text-green-600 hover:bg-green-50 font-bold h-11 px-6 rounded-xl ml-auto"
                                                                    onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: apt.id, status: 'confirmed' }); }}
                                                                    loading={statusMutation.isPending}
                                                                >
                                                                    <Check className="w-4 h-4 mr-2" /> {t("common.confirm", "Confirm")}
                                                                </Button>
                                                            )}

                                                            {apt.status !== 'cancelled' && (
                                                                <Button
                                                                    variant="outline"
                                                                    className="border-rose-500 text-rose-500 hover:bg-rose-50 font-bold h-11 px-6 rounded-xl"
                                                                    onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: apt.id, status: 'cancelled' }); }}
                                                                    loading={statusMutation.isPending}
                                                                >
                                                                    <X className="w-4 h-4 mr-2" /> {t("common.cancel", "Cancel")}
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-400">{t("doctor.appointments.empty_schedule", "Empty Schedule")}</h3>
                            <p className="text-sm text-gray-300">{t("doctor.appointments.empty_desc", "No appointments found for the selected filter.")}</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Intake Q&A Modal */}
            <Dialog open={intakeOpen} onOpenChange={setIntakeOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="intake-desc">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                <ClipboardList className="w-4 h-4 text-white" />
                            </div>
                            {t("doctor.appointments.intake_title", "Patient Intake Form")}
                        </DialogTitle>
                    </DialogHeader>
                    <p id="intake-desc" className="text-sm text-[#64748B] mb-4">
                        {intakeAppointment && (
                            <span className="font-medium text-[#0F172A]">
                                {t("common.patient", "Patient")}: {intakeAppointment?.profiles_patient?.full_name || intakeAppointment?.profiles_patient?.name || t("common.unknown_patient", "Unknown")}
                            </span>
                        )}
                    </p>
                    {intakeLoading ? (
                        <div className="space-y-3">
                            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                        </div>
                    ) : intakeData ? (
                        <div className="space-y-4">
                            {Array.isArray((intakeData as { responses?: Array<{ question?: string; label?: string; answer?: unknown; value?: unknown }> }).responses) ? (
                                (intakeData as { responses: Array<{ question?: string; label?: string; answer?: unknown; value?: unknown }> }).responses.map((r, i) => (
                                    <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Q{i + 1}</p>
                                        <p className="text-sm font-semibold text-[#0F172A] mb-2">{r.question || r.label || `Question ${i + 1}`}</p>
                                        <p className="text-sm text-[#475569] bg-white border border-gray-100 rounded-lg px-3 py-2">{String(r.answer ?? r.value ?? "—")}</p>
                                    </div>
                                ))
                            ) : (
                                Object.entries(intakeData as Record<string, unknown>).map(([key, val], i) => (
                                    <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-sm text-[#475569] bg-white border border-gray-100 rounded-lg px-3 py-2">{String(val ?? "—")}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ClipboardList className="w-12 h-12 text-gray-200 mb-4" />
                            <h3 className="text-base font-bold text-gray-400">{t("doctor.appointments.no_intake", "No Intake Data Found")}</h3>
                            <p className="text-sm text-gray-300 mt-1">{t("doctor.appointments.no_intake_desc", "The patient has not submitted an intake form for this appointment.")}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* AI Scribe Modal */}
            <Dialog open={scribeOpen} onOpenChange={setScribeOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="scribe-desc">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            {t("doctor.appointments.scribe_modal_title", "AI Consultation Scribe")}
                            <Sparkles className="w-4 h-4 text-violet-500" />
                        </DialogTitle>
                    </DialogHeader>
                    <p id="scribe-desc" className="text-sm text-[#64748B] mb-4">
                        {t("doctor.appointments.scribe_desc", "Enter rough notes — AI will structure them into a clinical SOAP note.")}
                        {scribeAppointment && <span className="font-medium text-[#0F172A]"> {t("common.patient", "Patient")}: {scribeAppointment?.profiles_patient?.full_name || t("common.unknown_patient", "Unknown")}</span>}
                    </p>
                    <div className="space-y-4">
                        <textarea
                            value={scribeNotes}
                            onChange={e => setScribeNotes(e.target.value)}
                            placeholder={t("doctor.appointments.scribe_placeholder", "E.g.:\nPatient c/o fatigue and pale skin x 2 weeks.\nHb: 8.5 g/dL. No fever.\nImpression: Iron deficiency anemia.\nRx: Ferrous sulfate 200mg OD x 4 weeks.")}
                            rows={7}
                            className="w-full resize-none px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none text-sm bg-gray-50"
                        />
                        <Button
                            onClick={runScribe}
                            disabled={scribeLoading || !scribeNotes.trim()}
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                        >
                            {scribeLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("doctor.appointments.generating_soap", "Generating SOAP note...")}</>
                                : <><Sparkles className="w-4 h-4 mr-2" /> {t("doctor.appointments.generate_soap", "Generate SOAP Note")}</>}
                        </Button>
                        {scribeResult && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-[#0F172A]">{t("doctor.appointments.structured_soap", "Structured SOAP Note")}</p>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(scribeResult); toast.success(t("common.copied", "Copied!")); }}
                                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> {t("common.copy", "Copy")}
                                    </button>
                                </div>
                                <pre className="text-xs text-[#0F172A] whitespace-pre-wrap font-sans leading-relaxed">{scribeResult}</pre>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI Prescription Modal */}
            <AnimatePresence>
                {selectedPatientForRx && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedPatientForRx(null)}
                        />
                        <motion.div
                            className="relative w-full max-w-4xl z-10"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            <PrescriptionSummary
                                patient={{
                                    id: selectedPatientForRx.profiles_patient?.id || '',
                                    name: selectedPatientForRx.profiles_patient?.full_name || '',
                                    age: selectedPatientForRx.profiles_patient?.age || 0,
                                    sex: selectedPatientForRx.profiles_patient?.gender || '',
                                    blood: selectedPatientForRx.profiles_patient?.blood_type || 'O+'
                                }}
                                onApprove={handleApproveRx}
                                onCancel={() => setSelectedPatientForRx(null)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

