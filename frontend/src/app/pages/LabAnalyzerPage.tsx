import { useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Droplet, Activity, FileText, CheckCircle, Loader2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { aiAPI } from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

interface LabMetric {
    name: string;
    value: string;
    unit: string;
    status: "Normal" | "Low" | "High" | string;
}

export default function LabAnalyzerPage() {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [previewURL, setPreviewURL] = useState<string | null>(null);
    const [results, setResults] = useState<{ patient_name?: string; test_date?: string; metrics: LabMetric[] } | null>(null);

    const analyzeMutation = useMutation({
        mutationFn: (f: File) => {
            if (!f) throw new Error("No file selected");
            const formData = new FormData();
            formData.append("file", f);
            return aiAPI.extractLabVitals(formData);
        },
        onSuccess: (res: { data?: { data?: { patient_name?: string; test_date?: string; metrics?: LabMetric[] } | LabMetric[] } }) => {
            const rawData = res.data?.data;
            if (rawData) {
                const normalized = Array.isArray(rawData)
                    ? { metrics: rawData }
                    : rawData as { patient_name?: string; test_date?: string; metrics: LabMetric[] };
                setResults(normalized);
                toast.success(t('patient.lab.analysis_complete', "Analysis complete! Key vitals extracted."));
            } else {
                toast.error(t('patient.lab.parse_failed', "Failed to parse report data."));
            }
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
            const errorDetail = err instanceof Error && 'response' in err && (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
            toast.error(errorDetail || t('patient.lab.extraction_failed', "AI Extraction Failed"));
        }
    });

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            if (selected.size > 10 * 1024 * 1024) {
                toast.error(t('patient.lab.file_too_large', "File excessively large. Please upload < 10MB"));
                return;
            }
            setFile(selected);
            // For images, we can do a local preview
            if (selected.type.startsWith("image/")) {
                setPreviewURL(URL.createObjectURL(selected));
            } else {
                setPreviewURL(null); // Clear image preview if PDF
            }
            setResults(null);
        }
    };

    const handleAnalyze = () => {
        if (!file) return;
        analyzeMutation.mutate(file);
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("high")) return "text-orange-600 bg-orange-100 border-orange-200";
        if (s.includes("low")) return "text-blue-600 bg-blue-100 border-blue-200";
        if (s.includes("normal")) return "text-emerald-600 bg-emerald-100 border-emerald-200";
        return "text-gray-600 bg-gray-100 border-gray-200";
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-[#F8FAFC] to-white">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <div className="inline-flex w-16 h-16 rounded-2xl bg-[#0D9488]/10 items-center justify-center text-[#0D9488] mb-2 shadow-inner">
                        <Activity className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">{t('patient.lab.title', "AI Lab Report Analyzer")}</h1>
                    <p className="text-lg text-[#64748B]">
                        {t('patient.lab.subtitle', "Upload your blood test or lab report. Our Gemini AI model will instantly extract and interpret your key health metrics.")}
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Left: Uploader */}
                    <Card className="p-8 border border-[#0D9488]/20 shadow-xl shadow-teal-900/5 bg-white rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <h3 className="text-xl font-bold text-[#0F172A] mb-4 relative z-10 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-[#0D9488]" /> {t('patient.lab.add_document', "Add Document")}
                        </h3>

                        <div className="border-2 border-dashed border-[#0D9488]/30 rounded-2xl p-8 hover:bg-teal-50 hover:border-teal-400 transition-all cursor-pointer relative group min-h-[250px] flex flex-col items-center justify-center">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                onChange={handleFileChange}
                                accept=".pdf,image/jpeg,image/png,image/jpg"
                            />

                            <AnimatePresence mode="popLayout">
                                {file ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center text-center space-y-3 relative z-10"
                                    >
                                        {previewURL ? (
                                            <img src={previewURL} alt="Preview" className="w-32 h-32 object-cover rounded-xl shadow-md border border-gray-200" />
                                        ) : (
                                            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center shadow-inner">
                                                <FileText className="w-10 h-10" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-[#0F172A] max-w-[200px] truncate">{file.name}</h4>
                                            <p className="text-xs font-medium text-gray-500">{formatBytes(file.size)} • {t('patient.lab.ready_to_scan', "Ready to scan")}</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div className="flex flex-col items-center text-[#64748B] space-y-4 group-hover:text-[#0D9488] transition-colors relative z-10">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-700 group-hover:text-[#0D9488]">{t('patient.lab.select_file', "Select PDF or Image")}</p>
                                            <p className="text-xs mt-1">{t('patient.lab.drag_drop', "Drag and drop your report here")}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            className="w-full mt-6 bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-lg h-12 text-lg rounded-xl transition-all"
                            onClick={handleAnalyze}
                            disabled={!file || analyzeMutation.isPending}
                        >
                            {analyzeMutation.isPending ? (
                                <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> {t('patient.lab.analyzing', "Analyzing Report...")}</>
                            ) : (
                                t('patient.lab.extract_vitals', "Extract Vitals")
                            )}
                        </Button>

                        <p className="flex items-center justify-center mt-4 text-xs text-gray-500">
                            <Info className="w-3 h-3 mr-1" /> {t('patient.lab.disclaimer', "Models may hallucinate. Always verify numbers.")}
                        </p>
                    </Card>

                    {/* Right: Results */}
                    <div>
                        <AnimatePresence mode="popLayout">
                            {analyzeMutation.isPending ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full min-h-[400px] flex items-center justify-center"
                                >
                                    <div className="flex flex-col items-center text-teal-600 gap-4">
                                        <div className="relative">
                                            <div className="w-24 h-24 border-8 border-teal-100 rounded-full" />
                                            <div className="w-24 h-24 border-8 border-teal-500 rounded-full border-t-transparent animate-spin absolute inset-0" />
                                            <Activity className="w-8 h-8 text-teal-500 absolute inset-0 m-auto animate-pulse" />
                                        </div>
                                        <p className="font-bold animate-pulse text-lg">{t('patient.lab.parsing', "Parsing clinical data via AI...")}</p>
                                    </div>
                                </motion.div>
                            ) : results ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-4"
                                >
                                    <Card className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-bold flex items-center gap-2 text-[#0F172A]">
                                                <CheckCircle className="w-6 h-6 text-emerald-500" /> {t('patient.lab.extracted_vitals', "Extracted Vitals")}
                                            </h2>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-700">{results.patient_name || t('common.unknown_patient', "Unknown Patient")}</p>
                                                <p className="text-xs text-emerald-600 font-medium">{t('patient.lab.valid_check', "Valid Check: ")} {results.test_date || t('common.unknown_date', "Unknown Date")}</p>
                                            </div>
                                        </div>

                                        {results.metrics && results.metrics.length > 0 ? (
                                            <div className="grid gap-3">
                                                {results.metrics.map((metric: LabMetric, i: number) => (
                                                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex flex-col items-center justify-center shrink-0">
                                                                <Droplet className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[#0F172A] text-sm">{metric.name}</h4>
                                                                <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(metric.status)}`}>
                                                                    {t(`patient.lab.status_${(metric.status || '').toLowerCase()}`, metric.status || "Unknown")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-xl text-[#0F172A]">{metric.value}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.unit}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl">
                                                {t('patient.lab.no_vitals', "No clear vitals identified in this document.")}
                                            </div>
                                        )}
                                    </Card>
                                </motion.div>
                            ) : (
                                <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50">
                                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="font-medium text-lg text-gray-500">{t('patient.lab.awaiting_report', "Awaiting Lab Report")}</p>
                                    <p className="text-sm">{t('patient.lab.upload_insights', "Upload your document to see AI-extracted insights here immediately.")}</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
