import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Activity, FileText, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Skeleton } from "@mui/material";
import { useTranslation } from 'react-i18next';

interface PatientRecord {
    id: string;
    name?: string;
    full_name?: string;
    email: string;
    phone?: string;
    city?: string;
    blood_type?: string;
    gender?: string;
    age?: number;
    created_at?: string;
}

export default function AdminPatientDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: patient, isLoading, error } = useQuery<PatientRecord>({
        queryKey: ['adminPatient', id],
        queryFn: () => adminAPI.getPatient(id!).then(res => res.data),
        enabled: !!id
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton width={200} height={40} />
                <Card className="p-8">
                    <Skeleton height={300} variant="rounded" />
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center bg-red-50 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("admin.patient_detail.failed_load", "Failed to load patient")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }



    if (!patient) {
        return (
            <div className="p-12 text-center bg-yellow-50 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-yellow-900">{t("admin.patient_detail.not_found", "Patient not found")}</h3>
                <Button onClick={() => navigate('/admin/patients')} className="mt-4">
                    {t("admin.patient_detail.back_to_list", "Back to Patients")}
                </Button>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/patients')}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-[#0F172A]">{t("admin.patient_detail.title", "Patient Profile")}</h1>
                    <p className="text-[#64748B]">{t("admin.patient_detail.subtitle", "Detailed information for {{name}}", { name: patient.full_name || patient.name || t("common.patient", "Patient") })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient Info Card */}
                <Card className="lg:col-span-2 p-6 border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-start gap-6 mb-6">
                        <div className="w-20 h-20 rounded-full bg-[#0D9488]/10 flex items-center justify-center text-3xl font-bold text-[#0D9488]">
                            {patient.full_name?.charAt(0) || patient.name?.charAt(0) || patient.email?.charAt(0) || 'P'}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#0F172A] mb-1">{patient.full_name || patient.name || t("common.anonymous_patient", "Anonymous Patient")}</h2>
                            <p className="text-sm text-gray-500 font-mono mb-3">ID: {patient.id}</p>
                            <div className="flex gap-2">
                                <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    {patient.blood_type || t("common.na", "N/A")}
                                </span>
                                <span className="text-xs font-semibold px-3 py-1 bg-pink-100 text-pink-700 rounded-full">
                                    {patient.gender || t("common.na", "N/A")}
                                </span>
                                {patient.age && (
                                    <span className="text-xs font-semibold px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                                        {t("common.age_label", "Age:")} {patient.age}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.email", "Email")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{patient.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.phone", "Phone")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{patient.phone || t("common.not_provided", "Not provided")}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.location", "Location")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">{patient.city || t("common.unknown", "Unknown")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                                <div>
                                    <p className="text-xs text-gray-500">{t("common.registered", "Registered")}</p>
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : t("common.unknown", "Unknown")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats Card */}
                <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("admin.patient_detail.quick_stats", "Quick Stats")}</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">{t("common.total_scans", "Total Scans")}</span>
                            </div>
                            <span className="text-xl font-bold text-blue-600">0</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">{t("common.appointments", "Appointments")}</span>
                            </div>
                            <span className="text-xl font-bold text-green-600">0</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">{t("common.prescriptions", "Prescriptions")}</span>
                            </div>
                            <span className="text-xl font-bold text-purple-600">0</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Medical History Section */}
            <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("common.medical_history", "Medical History")}</h3>
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{t("admin.patient_detail.no_history", "No medical history available yet")}</p>
                </div>
            </Card>
        </motion.div>
    );
}

