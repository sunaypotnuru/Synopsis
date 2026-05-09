import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pill, Plus, Clock, CalendarIcon, X, ArrowLeft, Trash2, BellRing, BellOff } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { patientAPI } from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    time_slots: string[];
    start_date: string;
    end_date: string;
    is_active: boolean;
}

export default function MedicationRemindersPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Add Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDosage, setNewDosage] = useState("");
    const [newFrequency, setNewFrequency] = useState("Daily");
    const [newTime, setNewTime] = useState("");

    const fetchMedications = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await patientAPI.getMedications();
            setMedications(res.data || []);
        } catch (error) {
            toast.error(t('patient.medication.load_failed', "Failed to load generic medications."));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    const validateDosage = (dosage: string) => {
        // Check for valid dosage format (number + unit)
        const dosageRegex = /^\d+(\.\d+)?\s*(mg|g|ml|tablets?|capsules?|drops?|units?)$/i;
        return dosageRegex.test(dosage.trim());
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newName.trim()) {
            toast.error(t('patient.medication.name_required', "Medication name is required"));
            return;
        }
        
        if (!newDosage.trim()) {
            toast.error(t('patient.medication.dosage_required', "Dosage is required"));
            return;
        }
        
        if (!validateDosage(newDosage)) {
            toast.error(t('patient.medication.invalid_dosage', "Please enter a valid dosage (e.g., 500mg, 2 tablets, 5ml)"));
            return;
        }
        
        try {
            const today = new Date().toISOString();
            await patientAPI.addMedication({
                name: newName,
                dosage: newDosage,
                frequency: newFrequency,
                time_slots: newTime ? [newTime] : ["09:00"],
                start_date: today,
                end_date: null
            });
            toast.success(t('patient.medication.add_success', "Medication reminder added."));
            setShowAddForm(false);
            setNewName(""); setNewDosage(""); setNewTime("");
            fetchMedications();
        } catch (error) {
            toast.error(t('patient.medication.add_failed', "Failed to add reminder."));
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await patientAPI.toggleMedication(id, !currentStatus);
            setMedications(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
            toast.success(!currentStatus ? t('patient.medication.reminder_enabled', "Reminder enabled") : t('patient.medication.reminder_disabled', "Reminder disabled"));
        } catch (error) {
            toast.error(t('patient.medication.update_failed', "Failed to update status."));
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await patientAPI.deleteMedication(id);
            setMedications(prev => prev.filter(m => m.id !== id));
            toast.success(t('patient.medication.removed', "Medication removed."));
        } catch (error) {
            toast.error(t('patient.medication.delete_failed', "Failed to delete medication."));
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-10 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4">
                <button
                    onClick={() => navigate("/patient/dashboard")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.back_to_dashboard', "Back to Dashboard")}
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                            <Pill className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('patient.medication.title', "Medication Reminders")}</h1>
                            <p className="text-gray-500 text-sm">{t('patient.medication.desc', "Track your daily intake and manage notification alerts.")}</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl">
                        {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAddForm ? t('common.cancel', "Cancel") : t('patient.medication.add_button', "Add Medication")}
                    </Button>
                </div>

                <AnimatePresence>
                    {showAddForm && (
                        <motion.form
                            initial={{ opacity: 0, height: 0, scale: 0.98 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.98 }}
                            onSubmit={handleAdd}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6"
                        >
                            <h3 className="font-semibold text-gray-800 mb-4">{t('patient.medication.setup_title', "New Reminder Setup")}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">{t('patient.medication.name', "Medication Name")}</label>
                                    <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500" placeholder={t('patient.medication.name_placeholder', "e.g. Paracetamol")} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">{t('patient.medication.dosage', "Dosage")}</label>
                                    <input required value={newDosage} onChange={e => setNewDosage(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500" placeholder={t('patient.medication.dosage_placeholder', "e.g. 500mg")} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">{t('patient.medication.time', "Time of Day")}</label>
                                    <input required value={newTime} onChange={e => setNewTime(e.target.value)} type="time" className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700">{t('patient.medication.frequency', "Frequency")}</label>
                                    <select value={newFrequency} onChange={e => setNewFrequency(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500">
                                        <option value="Daily">{t('patient.medication.freq_daily', "Daily")}</option>
                                        <option value="Twice a Day">{t('patient.medication.freq_twice', "Twice a Day")}</option>
                                        <option value="Weekly">{t('patient.medication.freq_weekly', "Weekly")}</option>
                                        <option value="As Needed">{t('patient.medication.freq_as_needed', "As Needed")}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end">
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                    {t('patient.medication.save', "Save Reminder")}
                                </Button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12 text-gray-400">{t('patient.medication.loading', "Loading medications...")}</div>
                ) : medications.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                        <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-medium mb-1">{t('patient.medication.no_reminders', "No Active Reminders")}</h3>
                        <p className="text-gray-500 text-sm">{t('patient.medication.no_reminders_desc', "You haven't added any medications to track yet.")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {medications.map((med) => (
                            <div key={med.id} className={`bg-white rounded-2xl border ${med.is_active ? 'border-indigo-100 shadow-md shadow-indigo-50/50' : 'border-gray-100 opacity-60'} p-5 relative transition-all`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{med.name}</h3>
                                        <span className="text-indigo-600 font-medium text-sm">{med.dosage}</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggle(med.id, med.is_active)}
                                        className={`p-2 rounded-full transition-colors ${med.is_active ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        {med.is_active ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="space-y-2 mt-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{med.time_slots?.join(", ") || t('patient.medication.no_time', "No time set")} ({t(`patient.medication.freq_${(med.frequency || '').toLowerCase().replace(/\s+/g, '_')}`, med.frequency)})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span>{t('patient.medication.started', "Started ")} {med.start_date ? new Date(med.start_date).toLocaleDateString() : t('common.unknown', "Unknown")}</span>
                                    </div>
                                </div>

                                <div className="mt-5 pt-3 border-t border-gray-50 flex justify-end">
                                    <button
                                        onClick={() => handleDelete(med.id)}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" /> {t('common.remove', "Remove")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
