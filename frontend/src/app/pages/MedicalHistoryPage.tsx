import { motion } from "motion/react";
import { FileText, Eye, Video, Download, Share2, Calendar, Clock, ChevronDown, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { patientAPI } from "../../lib/api";
import { Skeleton } from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useTranslation } from "../../lib/i18n";

interface MedicalRecord {
    id: string | number;
    type: string;
    date: string;
    doctor?: string;
    summary?: string;
    details?: string;
    result?: string;
    prediction?: string;
    confidence?: number;
    created_at?: string;
    duration?: string;
    hemoglobin_level?: string;
    prescription?: string;
    specialty?: string;
    profiles_doctor?: {
        name?: string;
        specialty?: string;
    };
}

export default function MedicalHistoryPage() {
    const navigate = useNavigate();
    const [expandedId, setExpandedId] = useState<string | number | null>(null);
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    const { data: recordsData, isLoading, error } = useQuery({
        queryKey: ['patientHistory'],
        queryFn: () => patientAPI.getHistory().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
                <div className="max-w-3xl mx-auto space-y-8">
                    <div className="mb-8">
                        <Skeleton width={250} height={40} animation="wave" />
                        <Skeleton width={400} height={20} animation="wave" />
                    </div>
                    <div className="space-y-6">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={100} animation="wave" className="rounded-2xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("patient.history.error_title", "Unable to load history")}</h2>
                <p className="text-[#64748B] max-w-md mb-6">{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['patientHistory'] })} className="bg-[#0D9488] hover:bg-[#0F766E] text-white">{t("common.try_again", "Try Again")}</Button>
            </div>
        );
    }

    const records: MedicalRecord[] = Array.isArray(recordsData?.records) ? recordsData.records : [];

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(t("patient.history.title", "Medical History"), 14, 15);
        autoTable(doc, {
            head: [[t("common.date", 'Date'), t("common.type", 'Type'), t("common.doctor", 'Doctor'), t("common.summary", 'Summary'), t("common.result", 'Result')]],
            body: records.map((r) => [
                r.date,
                r.type,
                r.doctor || '-',
                r.summary || r.details || '-',
                r.result || '-'
            ]),
            startY: 20,
        });
        doc.save("medical_history.pdf");
    };

    const exportCSV = () => {
        const ws = XLSX.utils.json_to_sheet(records.map((r) => ({
            [t("common.date", "Date")]: r.date,
            [t("common.type", "Type")]: r.type,
            [t("common.doctor", "Doctor")]: r.doctor || '-',
            [t("common.summary", "Summary")]: r.summary || r.details || '-',
            [t("common.result", "Result")]: r.result || '-'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t("patient.history.sheet_name", "History"));
        XLSX.writeFile(wb, "medical_history.csv");
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
            <div className="max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{t("patient.history.title", "Medical History")}</h1>
                        <p className="text-[#64748B]">{t("patient.history.subtitle", "Your complete health timeline — scans, consultations, and prescriptions")}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={exportCSV} className="bg-white hover:bg-gray-50 text-[#0F172A]">
                            <Download className="w-4 h-4 mr-2" /> {t("common.csv", "CSV")}
                        </Button>
                        <Button variant="outline" onClick={exportPDF} className="bg-[#0D9488] hover:bg-[#0F766E] text-white border-none">
                            <FileText className="w-4 h-4 mr-2" /> {t("common.pdf", "PDF")}
                        </Button>
                    </div>
                </motion.div>

                {/* Timeline */}
                <div className="relative">
                    {/* Vertical line */}
                    {records.length > 0 && (
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0D9488] via-[#0EA5E9] to-gray-200" />
                    )}

                    <div className="space-y-6">
                        {records.map((record, i) => {
                            const isScan = record.type === "AI Scan";
                            const isAnemic = (record.result || '').toLowerCase() === "anemic";
                            const isNormal = (record.result || '').toLowerCase() === "normal";

                            return (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="relative pl-16"
                                >
                                    {/* Timeline dot */}
                                    <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-white z-10 ${isScan
                                        ? isAnemic ? "bg-[#F43F5E]" : (isNormal ? "bg-[#22C55E]" : "bg-[#F59E0B]")
                                        : "bg-[#0EA5E9]"
                                        }`} />

                                    <Card className="border border-gray-100 overflow-hidden hover:shadow-md transition-shadow bg-white">
                                        <div
                                            className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isScan ? "bg-[#0D9488]/10" : "bg-[#0EA5E9]/10"
                                                        }`}>
                                                        {isScan ? (
                                                            <Eye className="w-5 h-5 text-[#0D9488]" />
                                                        ) : (
                                                            <Video className="w-5 h-5 text-[#0EA5E9]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-[#0F172A]">{t(`patient.history.type.${record.type?.toLowerCase().replace(/ /g, '_')}`, record.type)}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-[#64748B]">
                                                            <Calendar className="w-3 h-3" /> {record.date}
                                                            {record.duration && (
                                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.duration}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isScan && (
                                                        <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${isAnemic ? "bg-[#F43F5E]/10 text-[#F43F5E]" :
                                                            isNormal ? "bg-[#22C55E]/10 text-[#22C55E]" :
                                                                "bg-[#F59E0B]/10 text-[#F59E0B]"
                                                            }`}>{record.result ? t(`models.prediction.${record.result.toLowerCase()}`, record.result) : t("patient.dashboard.done", "Done")}</span>
                                                    )}
                                                    {record.doctor && (
                                                        <span className="text-sm font-medium text-[#0F172A] hidden sm:block">{t("common.dr_prefix", "Dr.")} {record.doctor.replace(t("common.dr_prefix", "Dr.") + " ", "").replace("Dr. ", "")}</span>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === record.id ? "rotate-180" : ""}`} />
                                                </div>
                                            </div>
                                        </div>

                                        {expandedId === record.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                className="border-t border-gray-100 p-5 bg-gray-50"
                                            >
                                                {isScan ? (
                                                    <div>
                                                        <p className="text-sm text-[#0F172A] mb-3 leading-relaxed">{record.details}</p>
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className="text-xs text-[#64748B] uppercase font-bold">{t("patient.history.ai_confidence", "AI Confidence")}</p>
                                                                <p className="text-sm font-semibold text-[#0D9488]">{record.confidence}</p>
                                                            </div>
                                                            {record.hemoglobin_level && (
                                                                <div>
                                                                    <p className="text-xs text-[#64748B] uppercase font-bold">{t("patient.history.estimated_hb", "Estimated Hb")}</p>
                                                                    <p className="text-sm font-semibold text-[#0F172A]">{record.hemoglobin_level} g/dL</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-[#64748B] uppercase mb-1">{t("patient.history.consult_summary", "Consultation Summary")}</p>
                                                            <p className="text-sm text-[#0F172A] leading-relaxed">{record.summary}</p>
                                                        </div>
                                                        {record.prescription && (
                                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                <p className="text-xs font-bold text-[#64748B] uppercase mb-2 flex items-center gap-1">
                                                                    <FileText className="w-3 h-3" /> {t("patient.history.prescription", "Digital Prescription")}
                                                                </p>
                                                                <p className="text-sm text-[#0F172A] whitespace-pre-line">{record.prescription}</p>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-sm text-[#64748B]">
                                                            <span className="font-semibold text-[#0F172A]">{t(`doctor.specialty.${record.specialty?.toLowerCase().replace(/ /g, '_')}`, record.specialty)}</span>
                                                            <span>•</span>
                                                            <span>{t("common.dr_prefix", "Dr.")} {record.doctor?.replace(t("common.dr_prefix", "Dr.") + " ", "").replace("Dr. ", "")}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-2 mt-6">
                                                    <Button variant="outline" size="sm" className="h-9 px-4 border-gray-200 hover:bg-white hover:text-[#0D9488] hover:border-[#0D9488]">
                                                        <Download className="w-3.5 h-3.5 mr-2" /> {t("common.download_pdf", "Download PDF")}
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-9 px-4 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/5 hover:border-[#22C55E]">
                                                        <Share2 className="w-3.5 h-3.5 mr-2" /> {t("patient.history.share_wa", "Share via WhatsApp")}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </Card>
                                </motion.div>
                            );
                        })}

                        {records.length === 0 && (
                            <Card className="p-12 text-center border-dashed border-2 bg-white/50">
                                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-[#0F172A] mb-1">{t("patient.history.no_history", "No history yet")}</h3>
                                <p className="text-[#64748B] mb-6">{t("patient.history.no_history_desc", "Start your first scan or book a consultation to see records here.")}</p>
                                <Button onClick={() => navigate('/patient/scan')} className="bg-[#0D9488] text-white">{t("patient.history.btn_scan", "Perform AI Scan")}</Button>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

