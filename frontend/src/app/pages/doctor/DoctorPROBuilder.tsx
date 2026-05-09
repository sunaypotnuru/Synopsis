import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ListChecks, Loader2, Save, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { doctorAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Question {
    id: string;
    type: string;
    text: string;
    options: string[];
}

interface QuestionnaireForm {
    name: string;
    frequency: string;
    is_active: boolean;
    questions: Question[];
}

interface Questionnaire extends QuestionnaireForm {
    id: string;
}

export default function DoctorPROBuilder() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formState, setFormState] = useState<QuestionnaireForm>({
        name: "",
        frequency: "weekly",
        is_active: true,
        questions: []
    });

    const { data: questionnaires = [], isLoading } = useQuery<Questionnaire[]>({
        queryKey: ["proQuestionnaires"],
        queryFn: () => doctorAPI.getPROQuestionnaires().then(res => res.data)
    });

    const createMutation = useMutation({
        mutationFn: (data: QuestionnaireForm) => doctorAPI.createPROQuestionnaire(data as unknown as Record<string, unknown>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["proQuestionnaires"] });
            toast.success(t("doctor.pro.create_success", "Questionnaire Created"));
            handleClose();
        },
        onError: () => toast.error(t("doctor.pro.create_error", "Failed to create Questionnaire"))
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: QuestionnaireForm }) => doctorAPI.updatePROQuestionnaire(id, data as unknown as Record<string, unknown>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["proQuestionnaires"] });
            toast.success(t("doctor.pro.update_success", "Questionnaire Updated"));
            handleClose();
        },
        onError: () => toast.error(t("doctor.pro.update_error", "Failed to update Questionnaire"))
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => doctorAPI.deletePROQuestionnaire(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["proQuestionnaires"] });
            toast.success(t("doctor.pro.delete_success", "Questionnaire Deleted"));
        },
        onError: () => toast.error(t("doctor.pro.delete_error", "Failed to delete Questionnaire"))
    });

    const handleOpenEdit = (q: Questionnaire) => {
        setIsEditing(q.id);
        setFormState({
            name: q.name,
            frequency: q.frequency || "weekly",
            is_active: q.is_active,
            questions: q.questions || []
        });
        setIsDialogOpen(true);
    };

    const handleClose = () => {
        setIsEditing(null);
        setFormState({
            name: "",
            frequency: "weekly",
            is_active: true,
            questions: []
        });
        setIsDialogOpen(false);
    };

    const addQuestion = (type: string) => {
        setFormState(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: crypto.randomUUID(),
                    type,
                    text: "",
                    options: type === 'multiple_choice' ? ["Yes", "No"] : []
                }
            ]
        }));
    };

    const removeQuestion = (id: string) => {
        setFormState(prev => ({
            ...prev,
            questions: prev.questions.filter(q => q.id !== id)
        }));
    };

    const updateQuestion = (id: string, field: string, value: string) => {
        setFormState(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.questions.length === 0) return toast.error(t("doctor.pro.error_min_question", "Please add at least one question."));
        if (isEditing) updateMutation.mutate({ id: isEditing, data: formState });
        else createMutation.mutate(formState);
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" /></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans text-slate-800">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{t("doctor.pro.title", "Patient Outcomes Builder")}</h1>
                    <p className="text-sm text-[#64748B] mt-1 font-medium">{t("doctor.pro.subtitle", "Create longitudinal assessment questionnaires assigned automatically.")}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#0EA5E9] text-white shadow-md hover:bg-[#0284C7]"><Plus className="w-4 h-4 mr-2" /> {t("doctor.pro.btn_builder", "Builder Workflow")}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">{isEditing ? t("doctor.pro.edit_title", "Edit Questionnaire") : t("doctor.pro.new_title", "New PRO Questionnaire")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("doctor.pro.field_title", "Questionnaire Title")}</Label>
                                    <Input value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} placeholder={t("doctor.pro.placeholder_title", "E.g., Weekly Fatigue Check-in")} required className="border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("doctor.pro.field_frequency", "Dispatch Frequency")}</Label>
                                    <select
                                        className="w-full flex h-10 w-full rounded-md border border-slate-200 bg-background px-3 py-2 text-sm shadow-sm"
                                        value={formState.frequency}
                                        onChange={e => setFormState({ ...formState, frequency: e.target.value })}
                                    >
                                        <option value="once">{t("doctor.pro.freq_once", "Send Once / On-Demand")}</option>
                                        <option value="daily">{t("doctor.pro.freq_daily", "Daily Schedule")}</option>
                                        <option value="weekly">{t("doctor.pro.freq_weekly", "Weekly Schedule")}</option>
                                        <option value="monthly">{t("doctor.pro.freq_monthly", "Monthly Schedule")}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><ListChecks className="w-5 h-5 text-[#0EA5E9]" /> {t("doctor.pro.added_questions", "Added Questions")} ({formState.questions.length})</h3>
                                    <div className="flex gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={() => addQuestion('number')} className="bg-white hover:bg-slate-100 text-[#0EA5E9] border-[#0EA5E9]/20 font-medium">+ {t("doctor.pro.btn_metric", "Metric (1-10)")}</Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => addQuestion('text')} className="bg-white hover:bg-slate-100 text-[#0EA5E9] border-[#0EA5E9]/20 font-medium">+ {t("doctor.pro.btn_text", "Text Box")}</Button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {formState.questions.map((q, idx) => (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={q.id} className="bg-white p-4 border border-slate-200 rounded-lg flex gap-3 shadow-sm relative group">
                                            <div className="bg-slate-100 text-slate-500 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">{idx + 1}</div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex justify-between w-full">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 rounded-md py-1">{q.type === 'number' ? t("doctor.pro.type_numeric", "Numeric Scale") : t("doctor.pro.type_text", "Free Text")}</span>
                                                    <button type="button" onClick={() => removeQuestion(q.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                                <Input value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} placeholder={t("doctor.pro.placeholder_question", "Enter your question text here...")} required className="font-medium" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {formState.questions.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 border border-dashed border-slate-300 rounded-lg bg-white">
                                        {t("doctor.pro.empty_questions", "Click a button above to add the first question.")}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={handleClose}>{t("common.cancel", "Cancel")}</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7]">
                                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {t("doctor.pro.btn_save", "Save Protocol")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {questionnaires.map((q) => (
                    <Card key={q.id} className="p-5 border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all bg-white group">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center shrink-0">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(q)} className="h-8 w-8 text-slate-400 hover:text-[#0EA5E9]"><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("doctor.pro.confirm_delete", "Delete PRO protocol?"))) deleteMutation.mutate(q.id); }} className="h-8 w-8 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <h3 className="font-bold text-[#0F172A] text-xl mb-1">{q.name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">{String(t(`doctor.pro.freq_${q.frequency}`, q.frequency))} {t("doctor.pro.freq_label", "Frequency")}</span>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${q.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{q.is_active ? t("common.active", "Active") : t("common.draft", "Draft")}</span>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">{q.questions?.length || 0} {t("doctor.pro.questions_configured", "Questions configured")}</div>
                                <ul className="space-y-1.5">
                                    {q.questions?.slice(0, 2).map((qst: Question, i: number) => (
                                        <li key={qst.id} className="text-sm text-slate-700 line-clamp-1 italic">
                                            {i + 1}. {qst.text}
                                        </li>
                                    ))}
                                    {(q.questions?.length || 0) > 2 && (
                                        <li className="text-xs text-slate-400 font-medium">{t("doctor.pro.more_questions", "...and {{count}} more", { count: q.questions.length - 2 }).replace('{{count}}', String(q.questions.length - 2))}</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {questionnaires.length === 0 && (
                <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
                    <ListChecks className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">{t("doctor.pro.no_protocols", "No Target Protocols")}</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">{t("doctor.pro.no_protocols_desc", "Create surveys to periodically check in on your patients' recovery and progression via automated data collection.")}</p>
                </div>
            )}
        </div>
    );
}

