import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, Calendar, Save, PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patientAPI } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";

export default function MedicationSchedulePage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  interface Medication {
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    time: string;
    taken: boolean;
  }

  const [schedule, setSchedule] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load existing schedule from profile or fetch from DB
    if (profile?.medication_schedule) {
      setSchedule(profile.medication_schedule);
    }
    setLoading(false);
  }, [profile]);

  const handleAddMedication = () => {
    setSchedule([...schedule, { 
      id: `temp-${Date.now()}`, 
      medication_name: "", 
      dosage: "", 
      frequency: "daily",
      time: "09:00", 
      taken: false 
    }]);
  };

  const handleRemoveMedication = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule.splice(index, 1);
    setSchedule(newSchedule);
  };

  const updateMedication = (index: number, field: keyof Medication, value: string | boolean) => {
    const newSchedule = [...schedule];
    (newSchedule[index][field] as string | boolean) = value;
    setSchedule(newSchedule);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await patientAPI.updateMedicationSchedule(schedule);
      toast.success(t('patient.medication.save_success', 'Medication schedule synced with the Autonomous Nurse System!'));
    } catch (e) {
      toast.error(t('patient.medication.save_error', 'Failed to save medication schedule.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">{t('patient.medication.title', 'Nurse AI Schedule')}</h1>
              <p className="text-gray-500">{t('patient.medication.subtitle', 'Configure the medications our Autonomous Voice Agent will check on during its daily call.')}</p>
            </div>
          </div>

          <Card className="p-8 shadow-xl border border-gray-100 mb-8">
            <div className="space-y-8">
              {schedule.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-xl">
                  {t('patient.medication.no_medications', 'No medications scheduled. Add one to enable proactive AI tracking.')}
                </div>
              ) : (
                schedule.map((med, index) => (
                  <div key={index} className="p-6 border border-gray-200 rounded-xl bg-gray-50 relative group">
                    <button 
                      onClick={() => handleRemoveMedication(index)}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="space-y-2">
                        <Label>{t('patient.medication.medication_name', 'Medication Name')}</Label>
                        <Input value={med.medication_name} onChange={(e) => updateMedication(index, "medication_name", e.target.value)} placeholder={t('patient.medication.name_placeholder', 'e.g. Amlodipine')} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('patient.medication.dosage', 'Dosage')}</Label>
                        <Input value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder={t('patient.medication.dosage_placeholder', 'e.g. 10mg')} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('patient.medication.time', 'Time')}</Label>
                        <Input type="time" value={med.time} onChange={(e) => updateMedication(index, "time", e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {t('patient.medication.frequency', 'Frequency')}</Label>
                      <Input value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} placeholder={t('patient.medication.frequency_placeholder', 'e.g. daily, twice daily')} />
                    </div>
                  </div>
                ))
              )}

              <Button onClick={handleAddMedication} variant="outline" className="w-full py-6 border-dashed border-2 text-teal-600 hover:bg-teal-50">
                <Plus className="w-5 h-5 mr-2" /> {t('patient.medication.add_medication', 'Add Active Medication')}
              </Button>
            </div>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white font-semibold py-6 text-lg shadow-lg">
            <Save className="w-5 h-5 mr-2" />
            {saving ? t('patient.medication.saving', 'Deploying Instructions to AI...') : t('patient.medication.sync_schedule', 'Sync Schedule to Nurse Agent')}
          </Button>

          <div className="text-sm text-teal-700 mt-6 text-center bg-teal-50/50 p-4 rounded-xl border border-teal-100 font-medium">
            {t('patient.medication.info', 'ℹ️ If you miss the AI Nurse\'s call, it will automatically try again in 30 minutes.')}
          </div>

        </motion.div>
      </div>
    </div>
  );
}

