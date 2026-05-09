import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Mail, Phone, FileText, Download, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Skeleton } from "@mui/material";

interface Patient {
    id: string;
    name?: string;
    full_name?: string;
    email: string;
    phone?: string;
    city?: string;
    blood_type?: string;
    gender?: string;
}

export default function AdminPatientsPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const { data: patients, isLoading, error } = useQuery({
        queryKey: ['adminPatients'],
        queryFn: () => adminAPI.getPatients().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton width={300} height={40} />
                    <Skeleton width={400} height={24} />
                </div>
                <Card className="p-0 border border-gray-200">
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={60} variant="rounded" />)}
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-red-50 rounded-2xl border border-red-100">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("admin.patients.failed_load", "Failed to load patients")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    const filteredPatients = (patients || []).filter((p: Patient) =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{t("admin.patients.title", "Patient Directory")}</h1>
                <p className="text-[#64748B]">{t("admin.patients.subtitle", "View and manage patient accounts and records")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={t("admin.patients.search_placeholder", "Search by ID, name or email...")}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#8B5CF6] transition-colors bg-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="bg-white border-gray-200 gap-2 text-[#64748B]">
                    <Download className="w-4 h-4" /> {t("common.export_csv", "Export CSV")}
                </Button>
            </div>

            <Card className="border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-500">
                                <th className="p-4">{t("admin.patients.col_patient_info", "Patient Info")}</th>
                                <th className="p-4">{t("admin.patients.col_contact", "Contact Details")}</th>
                                <th className="p-4">{t("admin.patients.col_location", "Location")}</th>
                                <th className="p-4">{t("admin.patients.col_blood_gender", "Blood/Gender")}</th>
                                <th className="p-4 text-right">{t("admin.patients.col_actions", "Actions")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPatients.map((patient: Patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center font-bold text-[#0D9488]">
                                                {patient.name?.charAt(0) || patient.email?.charAt(0) || t("common.p", "P")}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#0F172A]">{patient.full_name || patient.name || t("common.anonymous_patient", "Anonymous Patient")}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{patient.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-[#0F172A] flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {patient.email}</p>
                                            <p className="text-sm text-[#0F172A] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {patient.phone || t("common.no_phone", "No phone")}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-[#0F172A] flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {patient.city || t("common.unknown", "Unknown")}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{patient.blood_type || t("common.na", "N/A")}</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">{patient.gender || t("common.na", "N/A")}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-[#8B5CF6] hover:bg-[#8B5CF6]/5 border-[#8B5CF6]/20 shadow-sm"
                                            onClick={() => navigate(`/admin/patients/${patient.id}`)}
                                        >
                                            <FileText className="w-4 h-4 mr-1.5" /> {t("common.view_profile", "View Profile")}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPatients.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        {t("admin.patients.no_results", "No patients found matching your search.")}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </motion.div>
    );
}


