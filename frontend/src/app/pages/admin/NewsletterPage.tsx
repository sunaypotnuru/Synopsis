import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Mail, Send, FileText, Trash2, Plus, Edit3, Check,
    Users, Eye, MailOpen, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Newsletter {
    id: number;
    subject: string;
    body: string;
    audience: string;
    status: "draft" | "sent";
    created_at: string;
    sent_at?: string;
}

export default function AdminNewsletterPage() {
    const { t } = useTranslation();

    const AUDIENCE_OPTIONS = [
        { value: "all", label: t("admin.newsletter.all_users", "All Users"), icon: Users },
        { value: "patients", label: t("admin.newsletter.patients_only", "Patients Only"), icon: Eye },
        { value: "doctors", label: t("admin.newsletter.doctors_only", "Doctors Only"), icon: MailOpen },
    ];
    const queryClient = useQueryClient();
    const [composing, setComposing] = useState(false);
    const [editing, setEditing] = useState<Newsletter | null>(null);
    const [form, setForm] = useState({ subject: "", body: "", audience: "all" });

    const { data, isLoading } = useQuery({
        queryKey: ["newsletters"],
        queryFn: () => api.get("/newsletters").then((r) => r.data.data as Newsletter[]),
    });

    const createMutation = useMutation({
        mutationFn: (payload: typeof form) => api.post("/newsletters", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["newsletters"] });
            toast.success(t("admin.newsletter.created_success", "Newsletter draft created!"));
            setComposing(false);
            setForm({ subject: "", body: "", audience: "all" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...payload }: Partial<Newsletter> & { id: number }) =>
            api.put(`/newsletters/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["newsletters"] });
            toast.success(t("admin.newsletter.updated_success", "Newsletter updated!"));
            setEditing(null);
        },
    });

    const sendMutation = useMutation({
        mutationFn: (id: number) => api.post(`/newsletters/${id}/send`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["newsletters"] });
            toast.success(t("admin.newsletter.sent_success", "Newsletter sent successfully!"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/newsletters/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["newsletters"] });
            toast.success(t("admin.newsletter.deleted_success", "Newsletter deleted."));
        },
    });

    const newsletters = data ?? [];
    const drafts = newsletters.filter((n) => n.status === "draft");
    const sent = newsletters.filter((n) => n.status === "sent");

    const openEdit = (n: Newsletter) => {
        setEditing(n);
        setForm({ subject: n.subject, body: n.body, audience: n.audience });
    };

    const handleSave = () => {
        if (!form.subject.trim() || !form.body.trim()) {
            toast.error(t("admin.newsletter.missing_fields", "Subject and body are required"));
            return;
        }
        if (editing) {
            updateMutation.mutate({ id: editing.id, ...form });
        } else {
            createMutation.mutate(form);
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                <Mail className="w-5 h-5 text-white" />
                            </div>
                            {t("admin.newsletter.title", "Newsletter Center")}
                        </h1>
                        <p className="text-[#64748B] mt-1">{t("admin.newsletter.subtitle", "Compose and send newsletters to your platform users")}</p>
                    </div>
                    <Button
                        onClick={() => { setComposing(true); setEditing(null); setForm({ subject: "", body: "", audience: "all" }); }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg transition-shadow"
                    >
                        <Plus className="w-4 h-4 mr-2" /> {t("admin.newsletter.compose_btn", "Compose Newsletter")}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: t("admin.newsletter.total_created", "Total Created"), value: newsletters.length, color: "blue" },
                        { label: t("common.drafts", "Drafts"), value: drafts.length, color: "amber" },
                        { label: t("common.sent", "Sent"), value: sent.length, color: "green" },
                    ].map((s) => (
                        <Card key={s.label} className="p-5 border border-gray-100">
                            <p className="text-sm text-[#64748B]">{s.label}</p>
                            <p className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
                        </Card>
                    ))}
                </div>

                {/* Compose / Edit Form */}
                <AnimatePresence>
                    {(composing || editing) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-8"
                        >
                            <Card className="p-6 border border-blue-100 shadow-lg">
                                <h2 className="text-lg font-bold text-[#0F172A] mb-5 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    {editing ? t("admin.newsletter.edit_draft", "Edit Draft") : t("admin.newsletter.new_newsletter", "New Newsletter")}
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-[#64748B] block mb-1">{t("admin.newsletter.audience_label", "Audience")}</label>
                                        <div className="flex gap-3">
                                            {AUDIENCE_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setForm((f) => ({ ...f, audience: opt.value }))}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${form.audience === opt.value
                                                        ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                                        }`}
                                                >
                                                    <opt.icon className="w-4 h-4" />
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-[#64748B] block mb-1">{t("admin.newsletter.subject_label", "Subject *")}</label>
                                        <input
                                            type="text"
                                            value={form.subject}
                                            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                                            placeholder={t("admin.newsletter.subject_placeholder", "Monthly Health Update – March 2026")}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-[#64748B] block mb-1">{t("admin.newsletter.body_label", "Body *")}</label>
                                        <textarea
                                            value={form.body}
                                            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                                            placeholder={t("admin.newsletter.body_placeholder", "Write your newsletter content here...")}
                                            rows={8}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-5">
                                    <Button
                                        onClick={handleSave}
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        {editing ? t("common.save_changes", "Save Changes") : t("admin.newsletter.save_draft", "Save as Draft")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setComposing(false); setEditing(null); }}
                                    >
                                        {t("common.cancel", "Cancel")}
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Newsletter List */}
                {isLoading ? (
                    <div className="text-center py-16 text-[#64748B]">{t("admin.newsletter.loading", "Loading newsletters...")}</div>
                ) : newsletters.length === 0 ? (
                    <Card className="p-16 text-center border-dashed border-2 border-gray-200">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400">{t("admin.newsletter.no_newsletters", "No newsletters yet")}</h3>
                        <p className="text-gray-400 text-sm mt-1">{t("admin.newsletter.no_newsletters_desc", "Click \"Compose Newsletter\" to get started")}</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {newsletters.map((n) => (
                            <motion.div key={n.id} layout>
                                <Card className="p-5 hover:shadow-md transition-shadow border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${n.status === "sent"
                                            ? "bg-green-50 text-green-600"
                                            : "bg-amber-50 text-amber-600"
                                            }`}>
                                            {n.status === "sent" ? <Send className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-[#0F172A] truncate">{n.subject}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${n.status === "sent"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-amber-100 text-amber-700"
                                                    }`}>
                                                    {n.status === "sent" ? t("common.sent", "Sent") : t("common.draft", "Draft")}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize">
                                                    {t(`common.${n.audience}`, n.audience)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#64748B] line-clamp-1">{n.body}</p>
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {t("common.created_on", "Created {{date}}", { date: new Date(n.created_at).toLocaleDateString() })}
                                                {n.sent_at && ` · ${t("common.sent_on", "Sent {{date}}", { date: new Date(n.sent_at).toLocaleDateString() })}`}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {n.status === "draft" && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEdit(n)}
                                                        className="text-[#64748B]"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => sendMutation.mutate(n.id)}
                                                        disabled={sendMutation.isPending}
                                                        className="bg-green-500 hover:bg-green-600 text-white"
                                                    >
                                                        <Send className="w-4 h-4 mr-1" /> {t("common.send", "Send")}
                                                    </Button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => deleteMutation.mutate(n.id)}
                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

