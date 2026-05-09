import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from '@/lib/i18n';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Mail, Phone, FileText, Download, AlertCircle, User, Activity } from 'lucide-react';
import { doctorAPI } from '@/lib/api';

interface Patient {
    id: string;
    full_name?: string;
    email: string;
    phone?: string;
    city?: string;
    blood_type?: string;
    gender?: string;
    age?: number;
    risk_level?: string;
}

export default function DoctorPatientsPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const { data: patients, isLoading, error } = useQuery({
        queryKey: ['doctorPatients'],
        queryFn: () => doctorAPI.getPatients().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="animate-pulse">
                        <div className="h-10 w-64 bg-gray-200 rounded-lg mb-2"></div>
                        <div className="h-6 w-96 bg-gray-100 rounded-lg"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 bg-gray-50 rounded-2xl border border-gray-100"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">{t("doctor.patients.failed_load", "Failed to load patients")}</h3>
                <p className="text-[#64748B] max-w-md">{(error as Error).message}</p>
            </div>
        );
    }

    const filteredPatients = (Array.isArray(patients) ? patients : []).filter((p: Patient) =>
        (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="max-w-7xl mx-auto space-y-8"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-[#0F172A] mb-1">{t("doctor.patients.title", "My Patients")}</h1>
                        <p className="text-[#64748B] font-medium">{t("doctor.patients.subtitle", "Track medical history and clinical records of your assigned patients")}</p>
                    </div>
                    <Button variant="outline" className="bg-white border-gray-200 gap-2 text-[#64748B] shadow-sm hover:bg-gray-50">
                        <Download className="w-4 h-4" /> {t("common.export_csv", "Export Report")}
                    </Button>
                </div>

                <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t("doctor.patients.search_placeholder", "Search patients by name, ID or email...")}
                        className="w-full pl-12 pr-4 py-4 border border-gray-100 rounded-2xl outline-none focus:border-[#0EA5E9] transition-all bg-white shadow-xl text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.map((patient: Patient) => (
                        <motion.div
                            key={patient.id}
                            whileHover={{ y: -5 }}
                            className="group"
                        >
                            <Card className="p-6 border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#0EA5E9]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                
                                <div className="flex items-start gap-4 mb-6 relative">
                                    <div className="w-16 h-16 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center font-bold text-2xl text-[#0EA5E9] group-hover:scale-105 transition-transform">
                                        {patient.full_name?.charAt(0) || <User className="w-8 h-8" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-[#0F172A] truncate text-lg">{patient.full_name || "Patient"}</h3>
                                            {patient.risk_level && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                                    patient.risk_level === 'high' ? 'bg-rose-100 text-rose-600' : 
                                                    patient.risk_level === 'medium' ? 'bg-amber-100 text-amber-600' : 
                                                    'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                    {patient.risk_level}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#64748B] flex items-center gap-1.5 font-medium">
                                            <Mail className="w-3.5 h-3.5" /> {patient.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Blood Group</p>
                                        <p className="font-black text-[#0F172A]">{patient.blood_type || "N/A"}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Age</p>
                                        <p className="font-black text-[#0F172A]">{patient.age ? `${patient.age} Yrs` : "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-sm text-[#64748B] font-medium">
                                        <Phone className="w-4 h-4 text-[#0EA5E9]" />
                                        {patient.phone || "No phone added"}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-[#64748B] font-medium">
                                        <MapPin className="w-4 h-4 text-[#0EA5E9]" />
                                        {patient.city || "Location unknown"}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold h-12 rounded-2xl shadow-lg shadow-[#0EA5E9]/20"
                                        onClick={() => navigate(`/doctor/patients/${patient.id}/timeline`)}
                                    >
                                        <Activity className="w-4 h-4 mr-2" /> {t("common.timeline", "Timeline")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 w-12 rounded-2xl border-gray-100 text-[#64748B] hover:bg-gray-50"
                                        onClick={() => navigate(`/doctor/patients/${patient.id}/pro-analytics`)}
                                        title="PRO Analytics"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}

                    {filteredPatients.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
                            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-400">
                                {t("doctor.patients.no_results", "No patients found matching your search.")}
                            </h3>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

