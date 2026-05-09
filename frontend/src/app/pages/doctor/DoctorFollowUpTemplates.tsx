import { useState } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Mail, Loader2, Activity, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { doctorAPI } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface FollowUpTemplate {
    id: string;
    name: string;
    trigger_event: string;
    subject: string;
    body: string;
    delay_minutes: number;
    is_active: boolean;
}

interface TemplateFormState {
    name: string;
    trigger_event: string;
    subject: string;
    body: string;
    delay_minutes: number;
    is_active: boolean;
}

export default function DoctorFollowUpTemplates() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formState, setFormState] = useState<TemplateFormState>({
        name: "",
        trigger_event: "upcoming_appointment",
        subject: "",
        body: "",
        delay_minutes: 1440,
        is_active: true
    });

    const { data: templates = [], isLoading } = useQuery<FollowUpTemplate[]>({
        queryKey: ["followUpTemplates"],
        queryFn: () => doctorAPI.getFollowUpTemplates().then(res => res.data)
    });

    const createMutation = useMutation({
        mutationFn: (data: TemplateFormState) => doctorAPI.createFollowUpTemplate(data as unknown as Record<string, unknown>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["followUpTemplates"] });
            toast.success(t("doctor.templates.create_success", "Template created"));
            handleClose();
        },
        onError: () => toast.error(t("doctor.templates.create_error", "Failed to create template"))
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: TemplateFormState }) => doctorAPI.updateFollowUpTemplate(id, data as unknown as Record<string, unknown>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["followUpTemplates"] });
            toast.success(t("doctor.templates.update_success", "Template updated"));
            handleClose();
        },
        onError: () => toast.error(t("doctor.templates.update_error", "Failed to update template"))
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => doctorAPI.deleteFollowUpTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["followUpTemplates"] });
            toast.success(t("doctor.templates.delete_success", "Template deleted"));
        },
        onError: () => toast.error(t("doctor.templates.delete_error", "Failed to delete template"))
    });

    const handleOpenEdit = (template: FollowUpTemplate) => {
        setIsEditing(template.id);
        setFormState({
            name: template.name,
            trigger_event: template.trigger_event,
            subject: template.subject || "",
            body: template.body,
            delay_minutes: template.delay_minutes,
            is_active: template.is_active
        });
        setIsDialogOpen(true);
    };

    const handleClose = () => {
        setIsEditing(null);
        setFormState({
            name: "",
            trigger_event: "upcoming_appointment",
            subject: "",
            body: "",
            delay_minutes: 1440,
            is_active: true
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) updateMutation.mutate({ id: isEditing, data: formState });
        else createMutation.mutate(formState);
        setIsDialogOpen(false);
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 max-w-6xl mx-auto pb-12 font-sans text-slate-800"
        >
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{t("doctor.templates.title", "Automated Follow-ups")}</h1>
                    <p className="text-sm font-medium text-[#64748B] mt-1">{t("doctor.templates.subtitle", "Design smart reminders and post-consultation messages.")}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleClose()} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> {t("doctor.templates.new_template", "New Template")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? t("doctor.templates.edit_template", "Edit Template") : t("doctor.templates.create_template", "Create Auto-Responder Template")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("doctor.templates.field_name", "Template Name")}</Label>
                                    <Input value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("doctor.templates.field_trigger", "Trigger Event")}</Label>
                                    <select
                                        className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formState.trigger_event}
                                        onChange={e => setFormState({ ...formState, trigger_event: e.target.value })}
                                    >
                                        <option value="upcoming_appointment">{t("doctor.templates.trigger_upcoming", "Upcoming Appointment")}</option>
                                        <option value="appointment_completed">{t("doctor.templates.trigger_completed", "Appointment Completed")}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("doctor.templates.field_delay", "Delay Setting")}</Label>
                                <select
                                    className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formState.delay_minutes}
                                    onChange={e => setFormState({ ...formState, delay_minutes: parseInt(e.target.value) })}
                                >
                                    <optgroup label={t("doctor.templates.trigger_upcoming", "Upcoming Appointment")}>
                                        <option value={1440}>{t("doctor.templates.delay_24h_before", "24 Hours Before")}</option>
                                        <option value={60}>{t("doctor.templates.delay_1h_before", "1 Hour Before")}</option>
                                    </optgroup>
                                    <optgroup label={t("doctor.templates.trigger_completed", "Completed Appointment")}>
                                        <option value={60}>{t("doctor.templates.delay_1h_after", "1 Hour After")}</option>
                                        <option value={1440}>{t("doctor.templates.delay_1d_after", "1 Day After")}</option>
                                        <option value={10080}>{t("doctor.templates.delay_1w_after", "1 Week After")}</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("doctor.templates.field_subject", "Notification Subject")}</Label>
                                <Input value={formState.subject} onChange={e => setFormState({ ...formState, subject: e.target.value })} placeholder={t("doctor.templates.subject_placeholder", "E.g., Reminder: Dr. {{doctor_name}} Appointment")} required />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("doctor.templates.field_body", "Message Body")}</Label>
                                <Textarea
                                    rows={5}
                                    value={formState.body}
                                    onChange={e => setFormState({ ...formState, body: e.target.value })}
                                    placeholder={t("doctor.templates.body_placeholder", "Available placeholders: {{patient_name}}, {{doctor_name}}")}
                                    required
                                />
                                <p className="text-xs text-gray-400">{t("doctor.templates.hint", "Hint: Use {{patient_name}} and {{doctor_name}} for personalization.")}</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={handleClose}>{t("common.cancel", "Cancel")}</Button>
                                <Button type="submit" className="bg-[#0EA5E9] text-white hover:bg-[#0284C7]">{t("doctor.templates.save_btn", "Save Template")}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tpl) => (
                    <Card key={tpl.id} className="p-5 border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-shadow bg-white">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tpl.trigger_event === 'upcoming_appointment' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                    {tpl.trigger_event === 'upcoming_appointment' ? <Activity className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(tpl)} className="h-8 w-8 text-gray-500 hover:text-[#0EA5E9] bg-slate-50"><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t("doctor.templates.confirm_delete", "Delete template?"))) deleteMutation.mutate(tpl.id); }} className="h-8 w-8 text-rose-500 hover:text-rose-700 bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                            <h3 className="font-bold text-[#0F172A] text-lg mb-1">{tpl.name}</h3>
                            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4">
                                {tpl.trigger_event === 'upcoming_appointment' ? t("doctor.templates.trigger_upcoming", "Upcoming Appointment") : t("doctor.templates.trigger_completed", "Appointment Completed")} • {tpl.delay_minutes < 60 ? tpl.delay_minutes + 'm' : tpl.delay_minutes / 60 + 'h'}
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-3 italic bg-slate-50 p-3 rounded-lg border border-slate-100">{tpl.body}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
                    <Mail className="w-12 h-12 md:w-16 md:h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800">{t("doctor.templates.no_templates", "No Templates Found")}</h3>
                    <p className="text-slate-500 mt-2">{t("doctor.templates.no_templates_desc", "Automate your reminders by creating your first sequence.")}</p>
                </div>
            )}
        </motion.div>
    );
}

