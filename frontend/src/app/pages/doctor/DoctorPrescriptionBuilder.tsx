import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Plus, Trash2, Send, Loader2, FileText, Stethoscope,
  Hospital, Phone, Mail, Globe, MapPin, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import jsPDF from "jspdf";
import DrugAutocomplete from "@/components/features/domain/DrugAutocomplete";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/store";
import { doctorAPI } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface Medication {
    name: string;
    dosage: string;
    duration: string;
    frequency: string; // OD, BD, TDS
    instructions: string;
    mealAdvice: 'before' | 'after' | 'with' | '';
}

interface PatientRecord {
    id: string;
    full_name?: string;
    name?: string;
    email: string;
    age?: number;
    gender?: string;
    sex?: string;
}

interface DoctorProfile {
    id: string;
    full_name?: string;
    specialty?: string;
    hospital?: string;
    license_number?: string;
    avatar_url?: string;
}

export default function DoctorPrescriptionBuilder() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [diagnosis, setDiagnosis] = useState("");
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [medications, setMedications] = useState<Medication[]>([
        { name: "", dosage: "", duration: "", frequency: "OD", instructions: "", mealAdvice: 'after' }
    ]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

    const _prescriptionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const patRes = await doctorAPI.getPatients();
                setPatients(patRes.data || []);

                const profileRes = await supabase.from('profiles_doctor').select('*').eq('id', user?.id).maybeSingle();
                if (profileRes.data) {
                    setDoctorProfile(profileRes.data);
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };
        fetchData();
    }, [user]);

    const handleAddMedication = () => {
        setMedications([...medications, { name: "", dosage: "", duration: "", frequency: "OD", instructions: "", mealAdvice: 'after' }]);
    };

    const handleRemoveMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const handleMedChange = (index: number, field: keyof Medication, value: string) => {
        const updated = [...medications];
        if (field === 'mealAdvice') {
            updated[index][field] = value as 'before' | 'after' | 'with' | '';
        } else {
            updated[index][field] = value;
        }
        setMedications(updated);
    };

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    const handleGenerateAndSave = async () => {
        if (!selectedPatientId || !diagnosis.trim() || medications.some(m => !m.name.trim())) {
            toast.error(t("doctor.prescription.error_required", "Please fill in all required fields"));
            return;
        }

        setIsGenerating(true);
        try {
            const payload = {
                patient_id: selectedPatientId,
                diagnosis,
                medications,
                additional_notes: additionalNotes || null
            };
            const rxRes = await doctorAPI.createPrescription(payload);
            const prescriptionId = rxRes.data.id;

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            pdf.setFillColor(13, 148, 136); 
            pdf.rect(0, 0, pageWidth, 25, "F");
            
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(24);
            pdf.text("NETRA AI", 20, 16);
            
            pdf.setFontSize(8);
            pdf.text("PREMIUM TELEMEDICINE ECOSYSTEM", 20, 21);

            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(18);
            pdf.text(doctorProfile?.full_name || user?.name || "Dr. NetraAI", 20, 45);
            
            pdf.setFontSize(12);
            pdf.setTextColor(13, 148, 136);
            pdf.text(doctorProfile?.specialty || "Specialist Consultant", 20, 52);
            
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139);
            pdf.text(doctorProfile?.hospital || "NetraAI Clinical Network", 20, 58);
            pdf.text(`License: ${doctorProfile?.license_number || "MED-ONL-2024"}`, 20, 63);
            
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Email: ${user?.email || ""}`, pageWidth - 20, 45, { align: "right" });
            
            pdf.line(20, 70, pageWidth - 20, 70);
            
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(20, 75, pageWidth - 40, 30, 4, 4, "F");
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128);
            pdf.text("PATIENT INFORMATION", 25, 83);
            
            pdf.setFontSize(14);
            pdf.setTextColor(15, 23, 42);
            pdf.text(selectedPatient?.full_name || "Unknown Patient", 25, 92);
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.text(`Age: ${selectedPatient?.age || "--"} | Sex: ${selectedPatient?.gender || "--"} | Ref: #${prescriptionId.substring(0, 8)}`, 25, 99);
            
            pdf.setFont("helvetica", "bold");
            pdf.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - 30, 92, { align: "right" });
            
            let currentY = 115;
            pdf.setDrawColor(13, 148, 136);
            pdf.setLineWidth(1);
            pdf.line(20, currentY, 20, currentY + 15);
            
            pdf.setFontSize(9);
            pdf.setTextColor(107, 114, 128);
            pdf.text("CLINICAL DIAGNOSIS", 25, currentY + 4);
            
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text(diagnosis, 25, currentY + 12);
            
            currentY += 30;
            
            pdf.setFont("times", "italic");
            pdf.setFontSize(40);
            pdf.setTextColor(13, 148, 136);
            pdf.text("Rx", 20, currentY);
            
            pdf.setLineWidth(0.2);
            pdf.line(35, currentY - 5, pageWidth - 20, currentY - 5);
            currentY += 15;
            
            medications.forEach((med, idx) => {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(12);
                pdf.setTextColor(15, 23, 42);
                pdf.text(`${idx + 1}. ${med.name}`, 25, currentY);
                
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                pdf.setTextColor(55, 65, 81);
                pdf.text(`${med.dosage} - ${med.frequency} (${med.mealAdvice === 'before' ? 'Before Meal' : 'After Meal'})`, 25, currentY + 6);
                
                pdf.setFont("helvetica", "italic");
                pdf.setFontSize(9);
                pdf.setTextColor(107, 114, 128);
                pdf.text(`Duration: ${med.duration} | Instructions: ${med.instructions || 'As directed'}`, 25, currentY + 11);
                
                currentY += 22;
                if (currentY > 260) { pdf.addPage(); currentY = 20; }
            });
            
            const footerY = 270;
            pdf.setDrawColor(229, 231, 235);
            pdf.line(20, footerY - 5, pageWidth - 20, footerY - 5);
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.text(doctorProfile?.full_name || "", pageWidth - 25, footerY, { align: "right" });
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setTextColor(107, 114, 128);
            pdf.text("Digitally Signed by NetraAI", pageWidth - 25, footerY + 5, { align: "right" });
            
            const pdfBlob = pdf.output("blob");
            await doctorAPI.uploadPrescriptionPDF(prescriptionId, pdfBlob);

            toast.success(t("doctor.prescription.success", "Prescription delivered to patient successfully!"));
            navigate("/doctor/dashboard");

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : t("doctor.prescription.error", "Failed to generate prescription"));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">{t("doctor.prescription.title", "Digital Prescription Pad")}</h1>
                    <p className="text-sm text-[#64748B]">{t("doctor.prescription.subtitle", "Draft, preview, and generate official medical prescriptions.")}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-[#0D9488]/5 border border-gray-100 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[#64748B] font-semibold">{t("doctor.prescription.select_patient", "Select Patient")}</Label>
                                <select
                                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-[#0D9488]/20 transition-all outline-none"
                                    value={selectedPatientId}
                                    onChange={(e) => setSelectedPatientId(e.target.value)}
                                >
                                    <option value="">{t("doctor.prescription.choose_patient", "-- Choose a patient --")}</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#64748B] font-semibold">{t("common.diagnosis", "Diagnosis")}</Label>
                                <Input
                                    className="h-11 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#0D9488]/20"
                                    placeholder={t("doctor.prescription.diagnosis_placeholder", "e.g., Acute Pharyngitis")}
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-[#0D9488]" />
                                    {t("doctor.prescription.medications", "Prescribed Medications")}
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddMedication}
                                    className="rounded-full border-[#0D9488]/30 text-[#0D9488] hover:bg-[#0D9488]/5"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> {t("doctor.prescription.add_drug", "Add Drug")}
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {medications.map((med, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 relative group"
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-2 -right-2 bg-white text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleRemoveMedication(index)}
                                            disabled={medications.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.drug_name", "Drug Name")}</Label>
                                                    <DrugAutocomplete
                                                        value={med.name}
                                                        onChange={(val) => handleMedChange(index, "name", val)}
                                                        placeholder={t("doctor.prescription.drug_placeholder", "Search drug...")}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.frequency", "Frequency")}</Label>
                                                    <div className="flex gap-2">
                                                        {['OD', 'BD', 'TDS', 'QID'].map(freq => (
                                                            <button
                                                                key={freq}
                                                                onClick={() => handleMedChange(index, "frequency", freq)}
                                                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${med.frequency === freq ? 'bg-[#0D9488] border-[#0D9488] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0D9488]/30'}`}
                                                            >
                                                                {freq}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.dosage", "Dosage")}</Label>
                                                    <Input className="h-10 rounded-lg bg-white border-gray-200" placeholder="e.g. 500mg" value={med.dosage} onChange={(e) => handleMedChange(index, "dosage", e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.duration", "Duration")}</Label>
                                                    <Input className="h-10 rounded-lg bg-white border-gray-200" placeholder="e.g. 5 Days" value={med.duration} onChange={(e) => handleMedChange(index, "duration", e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.meal", "Meal")}</Label>
                                                    <div className="flex gap-1 h-10 p-1 bg-white border border-gray-200 rounded-lg">
                                                        <button
                                                            onClick={() => handleMedChange(index, "mealAdvice", "before")}
                                                            className={`flex-1 text-[10px] font-bold rounded-md transition-all ${med.mealAdvice === 'before' ? 'bg-[#0D9488] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                                                        >
                                                            Before
                                                        </button>
                                                        <button
                                                            onClick={() => handleMedChange(index, "mealAdvice", "after")}
                                                            className={`flex-1 text-[10px] font-bold rounded-md transition-all ${med.mealAdvice === 'after' ? 'bg-[#0D9488] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                                                        >
                                                            After
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("doctor.prescription.instructions", "Specific Instructions")}</Label>
                                                <Input className="h-10 rounded-lg bg-white border-gray-200" placeholder="e.g. Take with warm water" value={med.instructions} onChange={(e) => handleMedChange(index, "instructions", e.target.value)} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[#64748B] font-semibold">{t("doctor.prescription.notes", "Doctor's Additional Notes & Recommendations")}</Label>
                                <textarea
                                    className="w-full min-h-[120px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#0D9488]/20 transition-all outline-none resize-none"
                                    placeholder={t("doctor.prescription.notes_placeholder", "Dietary advice, next follow-up date, activities to avoid...")}
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white h-14 rounded-2xl text-lg font-bold shadow-lg shadow-[#0D9488]/20 transition-all hover:scale-[1.01]"
                            onClick={handleGenerateAndSave}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> {t("doctor.prescription.delivering", "Delivering Prescription...")}</> : <><Send className="w-6 h-6 mr-2" /> {t("doctor.prescription.publish", "Publish & Send to Patient")}</>}
                        </Button>

                        <p className="text-[10px] text-center text-gray-400">
                            {t("doctor.prescription.delivery_disclaimer", "Once published, the patient will receive a real-time notification and can access the digital pad from their mobile dashboard.")}
                        </p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
                    <div className="sticky top-24">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#0D9488]" />
                                <h3 className="font-bold text-[#0F172A]">{t("doctor.prescription.live_preview", "Live Pad Preview")}</h3>
                            </div>
                            <span className="text-[10px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-1 rounded-full uppercase tracking-widest">{t("doctor.prescription.preview_mode", "Draft Mode")}</span>
                        </div>

                        <div className="bg-white p-10 rounded-2xl shadow-2xl border border-gray-100 aspect-[1/1.414] overflow-hidden relative scale-[0.95] origin-top">
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                                <Hospital className="w-96 h-96 text-[#0D9488]" />
                            </div>

                            <div className="border-b-4 border-[#0D9488] pb-8 mb-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">{doctorProfile?.full_name || user?.name || "Dr. NetraAI"}</h2>
                                    <p className="text-[#0D9488] font-bold text-lg">{doctorProfile?.specialty || t("doctor.prescription.default_specialty", "Specialist Consultant")}</p>
                                    <div className="space-y-1 mt-2">
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium"><Hospital className="w-3.5 h-3.5" /> {doctorProfile?.hospital || t("doctor.prescription.default_hospital", "NetraAI Telemedicine Ecosystem")}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium"><MapPin className="w-3.5 h-3.5" /> License: {doctorProfile?.license_number || "MED-ONL-2024"}</p>
                                    </div>
                                </div>
                                <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-widest space-y-2">
                                    <p className="flex items-center justify-end gap-2"><Phone className="w-3.5 h-3.5 text-[#0D9488]" /> +91 9876543210</p>
                                    <p className="flex items-center justify-end gap-2"><Mail className="w-3.5 h-3.5 text-[#0D9488]" /> {user?.email}</p>
                                    <p className="flex items-center justify-end gap-2"><Globe className="w-3.5 h-3.5 text-[#0D9488]" /> netraai.com</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-8 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">{t("common.patient", "Patient Details")}</p>
                                    <p className="font-black text-[#0F172A] text-xl mb-1">{selectedPatient?.full_name || t("doctor.prescription.no_patient", "...")}</p>
                                    <p className="text-xs text-gray-500 font-bold">Age: {selectedPatient?.age || "--"}y | Sex: {selectedPatient?.gender || "--"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">{t("common.date", "Date Issued")}</p>
                                    <p className="font-bold text-[#0F172A] text-sm">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="mb-8 pl-5 border-l-4 border-red-500">
                                <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">{t("common.diagnosis", "Clinical Diagnosis")}</h3>
                                <p className="font-bold text-xl text-[#0F172A]">{diagnosis || "Diagnosis Pending..."}</p>
                            </div>

                            <div className="mb-10 flex-1 min-h-[250px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-5xl font-serif font-black text-[#0D9488] italic leading-none">Rx</span>
                                    <div className="h-0.5 bg-gradient-to-r from-[#0D9488] to-transparent flex-1 opacity-20" />
                                </div>

                                <div className="space-y-6">
                                    {medications.map((med, idx) => (
                                        <div key={idx} className="relative group pl-2">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center text-xs font-black mt-1 shrink-0">{idx + 1}</div>
                                                <div className="flex-1">
                                                    <p className="font-black text-[#0F172A] text-lg leading-tight">{med.name || "..."}</p>
                                                    <div className="flex gap-4 mt-2">
                                                        <span className="text-[10px] font-black text-[#0D9488] bg-[#0D9488]/5 px-2 py-0.5 rounded uppercase">{med.dosage || "..."}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">●</span>
                                                        <span className="text-[10px] font-black text-gray-600 uppercase">{med.frequency}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">●</span>
                                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{med.duration}</span>
                                                    </div>
                                                    {med.mealAdvice && (
                                                        <p className="text-[10px] font-bold text-teal-600 mt-2 italic flex items-center gap-1">
                                                            <Activity className="w-3 h-3" /> {med.mealAdvice === 'before' ? 'Take before meals' : 'Take after meals'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {additionalNotes && (
                                <div className="mb-12 pt-6 border-t border-gray-100 border-dashed">
                                    <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3">{t("doctor.prescription.notes_instructions", "Doctor Recommendations")}</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed font-medium bg-[#F0FDFA] p-4 rounded-xl border border-[#0D9488]/10">{additionalNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <div
                    data-prescription-container="true"
                    className="p-12 w-[800px] h-[1131px] relative font-sans" // Approximate A4 ratio 1:1.414 at 800px width
                    style={{ backgroundColor: '#ffffff', color: '#000000', display: 'none' }}
                >
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                        <Stethoscope className="w-96 h-96" style={{ color: '#0EA5E9' }} />
                    </div>

                    {/* Header */}
                    <div className="pb-8 mb-8 flex justify-between items-start" style={{ borderBottom: '4px solid #0EA5E9' }}>
                        <div>
                            <h2 className="text-4xl font-bold mb-2" style={{ color: '#0F172A' }}>{doctorProfile?.full_name || user?.name || "Dr. NetraAI"}</h2>
                            <p className="text-xl font-medium mb-2" style={{ color: '#0EA5E9' }}>{doctorProfile?.specialty || t("doctor.prescription.default_specialty", "Specialist Consultant")}</p>
                            <p className="flex items-center gap-2 mb-1" style={{ color: '#4B5563' }}><Hospital className="w-4 h-4" /> {doctorProfile?.hospital || t("doctor.prescription.default_hospital", "NetraAI Telemedicine")}</p>
                            <p className="flex items-center gap-2" style={{ color: '#4B5563' }}><MapPin className="w-4 h-4" /> {t("doctor.prescription.license", "License")}: {doctorProfile?.license_number || "MED-ONL-2024"}</p>
                        </div>
                        <div className="text-right text-sm space-y-2" style={{ color: '#4B5563' }}>
                            <p className="flex items-center justify-end gap-2"><Phone className="w-4 h-4" /> +91 9876543210</p>
                            <p className="flex items-center justify-end gap-2"><Mail className="w-4 h-4" /> {user?.email}</p>
                            <p className="flex items-center justify-end gap-2"><Globe className="w-4 h-4" /> www.netraai.com</p>
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex justify-between items-end mb-10 p-6 rounded-xl border" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
                        <div>
                            <p className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: '#6B7280' }}>{t("doctor.prescription.patient_details", "Patient Details")}</p>
                            <p className="font-bold text-2xl mb-1" style={{ color: '#0F172A' }}>{selectedPatient?.full_name || selectedPatient?.name || t("doctor.prescription.unknown_patient", "Unknown Patient")}</p>
                            <p className="font-medium" style={{ color: '#374151' }}>{t("common.age", "Age")}: {selectedPatient?.age || "--"} yrs &nbsp;&nbsp;|&nbsp;&nbsp; {t("common.sex", "Sex")}: {selectedPatient?.gender || selectedPatient?.sex || "--"} &nbsp;&nbsp;|&nbsp;&nbsp; ID: #{selectedPatient?.id?.substring(0, 8) || "0000"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: '#6B7280' }}>{t("common.date", "Date")}</p>
                            <p className="font-medium text-lg" style={{ color: '#000000' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="mb-10 pl-4 border-l-4" style={{ borderLeftColor: '#F43F5E' }}>
                        <h3 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: '#6B7280' }}>{t("doctor.prescription.clinical_diagnosis", "Clinical Diagnosis")}</h3>
                        <p className="font-medium text-xl" style={{ color: '#0F172A' }}>{diagnosis}</p>
                    </div>

                    {/* Medications */}
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-5xl font-serif font-black italic leading-none" style={{ color: '#0EA5E9' }}>Rx</span>
                            <div className="h-0.5 flex-1 mt-4" style={{ background: 'linear-gradient(to right, #0EA5E9, transparent)', opacity: 0.2 }} />
                        </div>

                        <div className="space-y-8 mt-8">
                            {medications.map((med, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-1" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-xl mb-2" style={{ color: '#0F172A' }}>{med.name}</h4>
                                        <div className="flex gap-8 font-medium mb-2 p-3 rounded-lg border inline-flex" style={{ backgroundColor: '#F9FAFB', borderColor: '#F3F4F6', color: '#374151' }}>
                                            {med.dosage && <div><span className="text-xs block uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{t("doctor.prescription.dosage", "Dosage")}</span><span style={{ color: '#0EA5E9' }}>{med.dosage}</span></div>}
                                            {med.duration && <div><span className="text-xs block uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{t("doctor.prescription.duration", "Duration")}</span><span>{med.duration}</span></div>}
                                        </div>
                                        {med.instructions && (
                                            <p className="mt-2 p-2 rounded-md border-l-2 text-sm" style={{ backgroundColor: '#FEFCE8', borderLeftColor: '#FACC15', color: '#4B5563' }}>
                                                <span className="font-semibold" style={{ color: '#374151' }}>{t("doctor.prescription.direction", "Direction:")}</span> {med.instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    {additionalNotes && (
                        <div className="mb-10 pt-8 border-t border-dashed" style={{ borderTopColor: '#E5E7EB' }}>
                            <h3 className="text-sm uppercase tracking-widest font-bold mb-4" style={{ color: '#6B7280' }}>{t("doctor.prescription.additional_instructions", "Additional Instructions & Notes")}</h3>
                            <p className="text-base whitespace-pre-wrap leading-relaxed p-6 rounded-xl" style={{ color: '#1F2937', backgroundColor: '#EFF6FF' }}>{additionalNotes}</p>
                        </div>
                    )}

                    {/* Footer / Signatures - Pinned to bottom using absolute positioning within the relative parent */}
                    <div className="absolute bottom-20 left-12 right-12 flex justify-between items-end border-t-2 pt-8 mt-12" style={{ borderTopColor: '#F3F4F6' }}>
                        <div className="text-xs max-w-sm" style={{ color: '#9CA3AF' }}>
                            <p className="font-semibold mb-1" style={{ color: '#6B7280' }}>{t("doctor.prescription.notice_pharmacy", "Notice to Pharmacy:")}</p>
                            <p>{t("doctor.prescription.notice_desc", "This is a digitally generated medical prescription and does not require a physical signature if validated through the NetraAI platform. Substitution permitted unless strictly prohibited above.")}</p>
                        </div>
                        <div className="text-right">
                            <div className="w-48 h-16 rounded-lg mb-4 flex-col flex items-center justify-center border" style={{ backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }}>
                                <span className="font-serif text-xl italic opacity-80" style={{ color: '#0EA5E9' }}>{doctorProfile?.full_name || user?.name}</span>
                                <span className="text-[10px] uppercase tracking-widest mt-1" style={{ color: '#9CA3AF' }}>{t("doctor.prescription.digital_signature_validated", "Digital Signature Validated")}</span>
                            </div>
                            <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{doctorProfile?.full_name || user?.name}</p>
                            <p className="text-sm font-medium" style={{ color: '#0EA5E9' }}>{doctorProfile?.specialty || t("doctor.prescription.default_specialty", "Specialist Consultant")}</p>
                            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{t("doctor.prescription.reg", "Reg:")} {doctorProfile?.license_number || "MED-ONL-2024"}</p>
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-widest" style={{ color: '#D1D5DB' }}>
                        {t("doctor.prescription.generated_by", "Generated by NetraAI Telemedicine Engine • Ref:")} {new Date().getTime().toString(16).toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
}

