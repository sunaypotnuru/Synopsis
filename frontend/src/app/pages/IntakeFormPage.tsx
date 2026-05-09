import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ClipboardList, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "../../lib/api";
import { useTranslation } from "../../lib/i18n";

interface FormField {
    id: string;
    type: "text" | "boolean" | "date" | "number" | "scale" | "multiselect";
    label: string;
    min?: number;
    max?: number;
    labels?: string[];
    options?: string[];
}

interface IntakeFormSchema {
    specialty: string;
    title: string;
    description: string;
    fields: FormField[];
}

export default function IntakeFormPage() {
    const { t } = useTranslation();
    const { specialty, appointmentId } = useParams<{ specialty: string; appointmentId: string }>();
    const navigate = useNavigate();

    const [schema, setSchema] = useState<IntakeFormSchema | null>(null);
    const [responses, setResponses] = useState<Record<string, string | number | boolean | string[]>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!specialty) return;
        
        const loadForm = async () => {
            try {
                const res = await api.get(`/api/v1/intake/form/${specialty}`);
                setSchema(res.data);
                // Init responses
                const initial: Record<string, string | number | boolean | string[]> = {};
                res.data.fields.forEach((f: FormField) => {
                    if (f.type === "boolean") initial[f.id] = false;
                    else if (f.type === "scale") initial[f.id] = f.min ?? 0;
                    else if (f.type === "multiselect") initial[f.id] = [];
                    else initial[f.id] = "";
                });
                setResponses(initial);
            } catch {
                toast.error(t('patient.intake.load_failed', "Failed to load intake form"));
            } finally {
                setLoading(false);
            }
        };
        
        loadForm();
    }, [specialty, t]);

    const handleChange = (id: string, value: string | number | boolean | string[]) => {
        setResponses(prev => ({ ...prev, [id]: value }));
    };

    const toggleMultiselect = (id: string, option: string) => {
        setResponses(prev => {
            const currentValue = prev[id];
            const arr: string[] = Array.isArray(currentValue) ? currentValue : [];
            return {
                ...prev,
                [id]: arr.includes(option) ? arr.filter(x => x !== option) : [...arr, option]
            };
        });
    };

    const handleSubmit = async () => {
        if (!appointmentId || !specialty) return;
        setSubmitting(true);
        try {
            await api.post("/api/v1/intake/response", {
                appointment_id: appointmentId,
                specialty,
                responses,
            });
            setSubmitted(true);
            toast.success(t('patient.intake.submit_success', "Intake form submitted successfully!"));
        } catch {
            toast.error(t('patient.intake.submit_failed', "Failed to submit form. Please try again."));
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field: FormField) => {
        const value = responses[field.id];

        switch (field.type) {
            case "text":
                return (
                    <textarea
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none bg-gray-50 transition-all"
                        rows={3}
                        placeholder={t('patient.intake.answer_placeholder', "Type your answer...")}
                        value={typeof value === 'string' ? value : ''}
                        onChange={e => handleChange(field.id, e.target.value)}
                    />
                );
            case "date":
                return (
                    <input
                        type="date"
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-gray-50"
                        value={typeof value === 'string' ? value : ''}
                        onChange={e => handleChange(field.id, e.target.value)}
                    />
                );
            case "number":
                return (
                    <input
                        type="number"
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-gray-50 w-40"
                        value={typeof value === 'number' ? value : ''}
                        onChange={e => handleChange(field.id, parseFloat(e.target.value))}
                    />
                );
            case "boolean":
                return (
                    <div className="flex gap-3">
                        {["Yes", "No"].map(opt => {
                            const boolValue = opt === "Yes";
                            return (
                                <button
                                    key={opt}
                                    onClick={() => handleChange(field.id, boolValue)}
                                    className={`px-6 py-2 rounded-xl border text-sm font-medium transition-all ${(value === true && opt === "Yes") || (value === false && opt === "No")
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                                        }`}
                                >
                                    {t(`common.${opt.toLowerCase()}`, opt)}
                                </button>
                            );
                        })}
                    </div>
                );
            case "scale":
                return (
                    <div className="space-y-2">
                        <input
                            type="range"
                            min={field.min ?? 0}
                            max={field.max ?? 3}
                            value={typeof value === 'number' ? value : 0}
                            onChange={e => handleChange(field.id, parseInt(e.target.value))}
                            className="w-full accent-teal-600"
                        />
                        {field.labels && (
                            <div className="flex justify-between text-xs text-gray-500">
                                {field.labels.map((l, i) => <span key={i}>{l}</span>)}
                            </div>
                        )}
                        <p className="text-sm font-medium text-teal-700">
                            {t('patient.intake.selected', "Selected: ")} {typeof value === 'number' && field.labels?.[value] ? field.labels[value] : value}
                        </p>
                    </div>
                );
            case "multiselect":
                return (
                    <div className="flex flex-wrap gap-2">
                        {field.options?.map(opt => {
                            const isSelected = Array.isArray(value) && value.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    onClick={() => toggleMultiselect(field.id, opt)}
                                    className={`px-4 py-1.5 rounded-full text-sm transition-all border ${isSelected
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                                        }`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('patient.intake.submitted_title', "Intake Form Submitted!")}</h2>
                    <p className="text-gray-500 mb-6">{t('patient.intake.submitted_desc', "Your doctor will review your answers before the consultation.")}</p>
                    <Button onClick={() => navigate("/patient/appointments")} className="bg-teal-600 hover:bg-teal-700 text-white">
                        {t('common.view_appointments', "View My Appointments")}
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
            <div className="max-w-2xl mx-auto px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> {t('common.back', "Back")}
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                            <ClipboardList className="w-6 h-6 text-teal-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{schema?.title}</h1>
                            <p className="text-sm text-gray-500">{schema?.description}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {schema?.fields.map((field, idx) => (
                            <motion.div
                                key={field.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                            >
                                <label className="block text-sm font-semibold text-gray-800 mb-3">
                                    {idx + 1}. {field.label}
                                </label>
                                {renderField(field)}
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-8">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white py-3 rounded-xl shadow-lg"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('patient.intake.submit_button', "Submit Intake Form")}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
