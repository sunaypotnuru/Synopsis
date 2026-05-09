import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { FileText, Eye, Video, Activity, Loader2, ChevronDown, Plus, Download, AlertCircle, ArrowLeft, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorAPI, aiAPI } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

interface PatientDetails {
    full_name?: string;
    name?: string;
    age?: number;
    gender?: string;
    sex?: string;
    blood_type?: string;
}

interface TimelineRecord {
    id: string;
    type: string;
    title: string;
    summary?: string;
    date: string;
    status?: string;
    confidence?: string;
    result?: string;
    details?: string;
    prescription?: string;
    is_manual?: boolean;
    note_type?: string;
}

interface PROData {
    submitted_at: string;
    answers?: Record<string, string | number>;
    pro_questionnaires?: { name?: string };
}

export default function PatientTimelineView() {
    const { t, i18n } = useTranslation();
    const { id: patientId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [expandedId, setExpandedId] = useState<string | number | null>(null);
    const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
    const [newNote, setNewNote] = useState({ content: "", note_type: "soap", is_ai_generated: false });
    const [isAIEnhancing, setIsAIEnhancing] = useState(false);

    // Fetch patient info
    const { data: patient, isLoading: loadingPatient } = useQuery<PatientDetails>({
        queryKey: ['doctorPatientDetails', patientId],
        queryFn: () => doctorAPI.getPatientDetails(patientId!).then(res => res.data),
        enabled: !!patientId
    });

    // Fetch timeline
    const { data: timelineData, isLoading: loadingTimeline, error: timelineError } = useQuery<{ records: TimelineRecord[] }>({
        queryKey: ['doctorPatientTimeline', patientId],
        queryFn: () => doctorAPI.getPatientTimeline(patientId!).then(res => res.data),
        enabled: !!patientId
    });

    // Fetch PRO Data
    const { data: proData = [] } = useQuery<PROData[]>({
        queryKey: ['doctorPatientPRO', patientId],
        queryFn: () => doctorAPI.getPatientPROData(patientId!).then(res => res.data),
        enabled: !!patientId
    });

    // Add note mutation
    const addNoteMutation = useMutation({
        mutationFn: (data: { content: string; note_type: string; is_ai_generated: boolean }) => doctorAPI.addClinicalNote(patientId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorPatientTimeline'] });
            toast.success(t("doctor.timeline.add_note_success", "Clinical note added successfully"));
            setIsAddNoteOpen(false);
            setNewNote({ content: "", note_type: "soap", is_ai_generated: false });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : t("doctor.timeline.add_note_error", "Failed to add clinical note"))
    });

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.content.trim()) return;
        addNoteMutation.mutate(newNote);
    };

    const handleAIEnhance = async () => {
        if (!newNote.content.trim()) {
            toast.error(t("doctor.timeline.empty_note_error", "Please enter some rough notes first."));
            return;
        }
        setIsAIEnhancing(true);
        try {
            const formData = new FormData();
            formData.append("notes", newNote.content);
            formData.append("patient_name", patient?.full_name || t("common.patient", "Patient"));
            formData.append("doctor_name", t("common.doctor", "Doctor"));
            const res = await aiAPI.doctorScribe({
                consultation_notes: newNote.content,
                patient_name: patient?.full_name || t("common.patient", "Patient"),
                doctor_name: t("common.doctor", "Doctor")
            });
            if (res.data?.soap_note) {
                setNewNote({ ...newNote, content: res.data.soap_note, is_ai_generated: true, note_type: "soap" });
                toast.success(t("doctor.timeline.ai_enhance_success", "Note structured successfully by AI!"));
            }
        } catch (error) {
            const detail = error instanceof Error && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data ? String(error.response.data.detail) : (error instanceof Error ? error.message : '');
            toast.error(detail || t("doctor.timeline.ai_enhance_error", "Failed to structure note via AI"));
        } finally {
            setIsAIEnhancing(false);
        }
    };

    const handleExportPDF = () => {
        if (!timelineData?.records?.length) {
            toast.error(t("doctor.timeline.no_records_export", "No timeline records to export."));
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`${t("common.patient_history", "Patient History")}: ${patient?.full_name || t("common.unknown", "Unknown")}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(t("doctor.timeline.pdf_generated_by", "Generated by NetraAI Telemedicine Engine"), 14, 30);

        const tableColumn = [t("common.date", "Date"), t("common.type", "Type"), t("common.title", "Title"), t("common.summary", "Summary")];
        const tableRows = timelineData.records.map((r) => [
            r.date,
            r.type,
            r.title,
            (r.summary || "").substring(0, 50) + ((r.summary && r.summary.length > 50) ? "..." : "")
        ]);

        (doc as unknown as { autoTable: (options: Record<string, unknown>) => void }).autoTable({
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: "grid",
            headStyles: { fillColor: [14, 165, 233] },
        });

        doc.save(`patient_history_${patientId?.substring(0, 6)}.pdf`);
    };

    const isLoading = loadingPatient || loadingTimeline;
    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    if (timelineError) {
        return (
            <div className="p-12 text-center flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800">{t("doctor.timeline.cannot_load", "Cannot load Patient Timeline")}</h2>
                <p className="text-gray-500 mb-6">{t("doctor.timeline.cannot_load_desc", "Unauthorized, or patient not found.")}</p>
                <Button variant="outline" onClick={() => navigate(-1)}>{t("common.go_back", "Go Back")}</Button>
            </div>
        );
    }

    const records = timelineData?.records || [];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full shadow-sm"><ArrowLeft className="w-4 h-4" /></Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{patient?.full_name || patient?.name}</h1>
                        <p className="text-sm font-medium text-[#64748B]">{t("common.age", "Age")}: {patient?.age || "--"} • {t("common.sex", "Sex")}: {patient?.gender || patient?.sex || "--"} • {t("common.blood", "Blood")}: {patient?.blood_type || "--"} • {t("common.patient_id", "Patient ID")}: #{patientId?.substring(0, 8)}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportPDF} className="bg-white hover:bg-slate-50 border-slate-200">
                        <Download className="w-4 h-4 mr-2" /> {t("common.export_pdf", "Export PDF")}
                    </Button>
                    <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-md">
                                <Plus className="w-4 h-4 mr-2" /> {t("doctor.timeline.btn_note", "Note / SOAP")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{t("doctor.timeline.add_note_title", "Add Clinical Note for")} {patient?.full_name?.split(' ')[0]}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddNote} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>{t("doctor.timeline.field_note_type", "Note Type")}</Label>
                                    <select
                                        className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newNote.note_type}
                                        onChange={e => setNewNote({ ...newNote, note_type: e.target.value })}
                                    >
                                        <option value="soap">{t("doctor.timeline.note_type_soap", "SOAP Note")}</option>
                                        <option value="general">{t("doctor.timeline.note_type_general", "General Follow-up")}</option>
                                        <option value="critical">{t("doctor.timeline.note_type_critical", "Critical Finding")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("common.content", "Content")}</Label>
                                    <Textarea
                                        rows={8}
                                        placeholder={t("doctor.timeline.placeholder_soap", "S: ...\nO: ...\nA: ...\nP: ...")}
                                        value={newNote.content}
                                        onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAIEnhance}
                                        disabled={isAIEnhancing}
                                        className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 font-medium"
                                    >
                                        {isAIEnhancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {t("doctor.timeline.btn_enhance_ai", "Enhance with AI")}
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="ghost" onClick={() => setIsAddNoteOpen(false)}>{t("common.cancel", "Cancel")}</Button>
                                        <Button type="submit" disabled={addNoteMutation.isPending} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
                                            {addNoteMutation.isPending ? t("common.saving", "Saving...") : t("doctor.timeline.btn_save_note", "Save Note")}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* PRO Outcomes Area */}
            {proData.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/30 p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-100 mt-6 pb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-6 h-6 text-indigo-500" />
                        <h2 className="text-xl font-bold tracking-tight text-slate-800">{t("doctor.timeline.pro_title", "Patient-Reported Outcomes (PRO)")}</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {Array.from(new Set(proData.map((d) => d.pro_questionnaires?.name))).map(qName => {
                            // Extract submissions for this questionnaire
                            const submissions = proData.filter((d) => d.pro_questionnaires?.name === qName).reverse();
                            // Try to find numeric answers to plot
                            const chartData = submissions.map((sub) => {
                                const dataPoint: Record<string, string | number> = { date: new Intl.DateTimeFormat(i18n.language || 'en').format(new Date(sub.submitted_at)) };
                                Object.entries(sub.answers || {}).forEach(([k, v]) => {
                                    if (!isNaN(Number(v)) && String(v).trim() !== '') {
                                        dataPoint[k.substring(0, 6)] = Number(v);
                                    }
                                });
                                return dataPoint;
                            });

                            // Only keys that are numeric metrics
                            const dataKeys = Object.keys(chartData[0] || {}).filter(k => k !== 'date');

                            return (
                                <Card key={qName as string} className="p-5 border-none shadow-sm bg-white/80 backdrop-blur">
                                    <h3 className="font-bold text-sm text-slate-700 mb-4">{qName as string}</h3>
                                    {dataKeys.length > 0 ? (
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                                                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={30} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    {dataKeys.map((k, i) => (
                                                        <Line key={k} type="monotone" dataKey={k} stroke={['#0EA5E9', '#F43F5E', '#8B5CF6'][i % 3]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-24 flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-lg">{t("doctor.timeline.no_numeric_data", "No numeric data available to chart")}</div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Timeline Wrapper */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 relative z-0">

                {records.length > 0 && <div className="absolute left-10 md:left-14 top-10 bottom-10 w-0.5 bg-gradient-to-b from-[#0EA5E9] to-slate-200 z-[-1]" />}

                <div className="space-y-6">
                    {records.map((record, i: number) => {
                        const isScan = record.type === "AI Scan";
                        const isConsultation = record.type === "Consultation" || record.type === "Video Consultation";
                        const isClinicalNote = record.type === "Clinical Note";
                        const isAnemic = (record.result || record.summary || '').toLowerCase().includes("anemi");

                        return (
                            <motion.div
                                key={record.id || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className="relative md:pl-20 pl-14"
                            >
                                {/* Dot Indicator */}
                                <div className={`absolute md:left-4 left-[0.25rem] top-5 w-4 h-4 rounded-full border-[3px] border-white shadow-sm ring-2 ring-white
                                    ${isScan ? (isAnemic ? "bg-rose-500 ring-rose-200" : "bg-emerald-500 ring-emerald-200") :
                                        isConsultation ? "bg-[#0EA5E9] ring-blue-200" :
                                            isClinicalNote ? "bg-amber-500 ring-amber-200" : "bg-slate-400 ring-slate-200"}`}
                                />

                                <Card className="border border-slate-100 hover:border-blue-100 hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                    >
                                        <div className="flex gap-4">
                                            {/* Icon block */}
                                            <div className="hidden sm:flex flex-col items-center">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                                                    ${isScan ? "bg-teal-50 text-teal-600" :
                                                        isConsultation ? "bg-blue-50 text-[#0EA5E9]" :
                                                            isClinicalNote ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
                                                    {isScan ? <Eye className="w-5 h-5" /> : isConsultation ? <Video className="w-5 h-5" /> : isClinicalNote ? <FileText className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                                </div>
                                            </div>

                                            {/* Content Block */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                                    <h3 className="font-bold text-base text-slate-900 truncate">
                                                        {record.title}
                                                        {isClinicalNote && <span className="ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-100 text-amber-700">{record.note_type}</span>}
                                                    </h3>
                                                    <span className="text-xs font-semibold text-slate-500 flex items-center shrink-0">
                                                        <Clock className="w-3 h-3 mr-1" /> {record.date}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-slate-600 line-clamp-1">{record.summary}</p>

                                                {/* Mini Badges/Tags */}
                                                {(record.status || record.confidence) && (
                                                    <div className="flex gap-2 mt-2">
                                                        {record.status && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600">{String(t(`common.status_${record.status.toLowerCase()}`, record.status))}</span>}
                                                        {record.confidence && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-600">{t("common.conf", "Conf")}: {record.confidence}</span>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expand Arrow */}
                                            <div className="flex items-center text-slate-300">
                                                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expandedId === record.id ? 'rotate-180 text-blue-500' : ''}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Region */}
                                    {expandedId === record.id && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-t border-slate-100 bg-slate-50/50 p-4 sm:pl-[5.5rem]">
                                            <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap">
                                                {isClinicalNote ? (
                                                    <div className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm text-sm">
                                                        {record.summary}
                                                    </div>
                                                ) : isConsultation ? (
                                                    <div className="space-y-4">
                                                        <p><strong>{t("common.reason", "Reason")}:</strong> {record.summary}</p>
                                                        {record.prescription && (
                                                            <div className="bg-white p-3 border-l-2 border-[#0EA5E9] shadow-sm rounded-r-lg">
                                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t("common.prescription", "Prescription")}</p>
                                                                <p className="text-[#0F172A] italic">{t("common.rx", "Rx")}: {record.prescription}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isScan ? (
                                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t("common.final_result", "Final Result")}</p>
                                                                <p className="font-semibold">{(record.summary || '').replace('Result: ', '')}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t("common.hemoglobin", "Hemoglobin")}</p>
                                                                <p className="font-semibold text-rose-600">{(record.details || '').replace('Hemoglobin: ', '').replace(' g/dL', '')} <span className="text-xs font-normal">g/dL</span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p>{record.summary}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}

                    {records.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                                <Activity className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{t("doctor.timeline.empty_timeline", "Empty Timeline")}</h3>
                            <p className="text-slate-500">{t("doctor.timeline.empty_timeline_desc", "This patient's medical history timeline is currently empty.")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

