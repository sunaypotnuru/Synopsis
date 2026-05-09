import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from '../../lib/i18n';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { doctorAPI } from '../../lib/api';
import { Skeleton } from "@mui/material";
import { toast } from 'sonner';

export default function DoctorScanDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [doctorNotes, setDoctorNotes] = useState('');
    const [finalDiagnosis, setFinalDiagnosis] = useState('');
    const [recommendedAction, setRecommendedAction] = useState('');

    const { data: scans, isLoading, error } = useQuery({
        queryKey: ['doctorScans'],
        queryFn: () => doctorAPI.getScans().then(res => res.data)
    });

    const reviewMutation = useMutation({
        mutationFn: (reviewData: { doctor_notes: string; final_diagnosis: string; recommended_action: string; doctor_reviewed: boolean }) => doctorAPI.reviewScan(id!, reviewData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorScans'] });
            queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
            toast.success(t("doctor.scan_detail.saved", "Scan review saved successfully!"));
            navigate('/doctor/scans');
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : t("doctor.scan_detail.failed", "Failed to save review");
            toast.error(errorMessage);
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton width={200} height={40} />
                    <Card className="p-8">
                        <Skeleton height={400} variant="rounded" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-red-900">{t("doctor.scan_detail.failed_load", "Failed to load scan")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    interface ScanDetail {
        id: string;
        profiles_patient?: { full_name?: string; email?: string; age?: number; gender?: string };
        created_at: string;
        image_url?: string;
        prediction?: string;
        confidence?: number;
        hemoglobin_level?: number;
        doctor_reviewed: boolean;
        doctor_notes?: string;
    }

    const scan = scans?.find((s: ScanDetail) => s.id === id);

    if (!scan) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center bg-gray-50">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-bold text-yellow-900">{t("doctor.scan_detail.not_found", "Scan not found")}</h3>
                <Button onClick={() => navigate('/doctor/scans')} className="mt-4">
                    {t("doctor.scan_detail.back_to_scans", "Back to Scans")}
                </Button>
            </div>
        );
    }

    const patientName = scan.profiles_patient?.full_name || t("common.unknown_patient", "Unknown Patient");
    const patientEmail = scan.profiles_patient?.email || t("common.na", "N/A");
    const isAnemic = (scan.prediction || '').toLowerCase() === 'anemic';
    const confidence = Math.round((scan.confidence || 0) * 100);

    const handleSaveReview = () => {
        if (!finalDiagnosis.trim()) {
            toast.error(t("doctor.scan_detail.provide_diagnosis", "Please provide a final diagnosis"));
            return;
        }

        reviewMutation.mutate({
            doctor_notes: doctorNotes,
            final_diagnosis: finalDiagnosis,
            recommended_action: recommendedAction,
            doctor_reviewed: true
        });
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-5xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/doctor/scans')}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-[#0F172A]">{t("doctor.scan_detail.title", "Scan Analysis")}</h1>
                            <p className="text-[#64748B]">{t("doctor.scan_detail.subtitle", "Review and provide medical assessment")}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Patient Info & Scan Image */}
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.scan_detail.patient_info", "Patient Information")}</h3>

                            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                                <div className="w-14 h-14 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] font-bold text-xl">
                                    {patientName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-[#0F172A]">{patientName}</p>
                                    <p className="text-sm text-gray-600">{patientEmail}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t("common.age", "Age")}: {scan.profiles_patient?.age || t("common.na", "N/A")} •
                                        {t("common.gender", "Gender")}: {scan.profiles_patient?.gender || t("common.na", "N/A")}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-600 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> {t("doctor.scan_detail.scan_date", "Scan Date")}
                                    </span>
                                    <span className="text-sm font-bold text-[#0F172A]">
                                        {new Date(scan.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-600">{t("doctor.scan_detail.scan_id", "Scan ID")}</span>
                                    <span className="text-xs font-mono text-[#0F172A]">
                                        {scan.id.slice(0, 12)}...
                                    </span>
                                </div>
                            </div>

                            {scan.image_url && (
                                <div>
                                    <h4 className="text-sm font-bold text-[#0F172A] mb-2">{t("doctor.scan_detail.conjunctiva_image", "Conjunctiva Image")}</h4>
                                    <div className="rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                                        <img
                                            src={scan.image_url}
                                            alt="Conjunctiva scan"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* AI Analysis Results */}
                        <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.scan_detail.ai_analysis", "AI Analysis Results")}</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-600">{t("doctor.scan_detail.ai_prediction", "AI Prediction")}</span>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${isAnemic
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {scan.prediction || t("common.pending", "Pending")}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-500">{t("doctor.scan_detail.confidence_level", "Confidence Level")}</span>
                                            <span className="text-xs font-bold text-[#0F172A]">{confidence}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isAnemic ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${confidence}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {scan.hemoglobin_level && (
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-900 font-medium">{t("doctor.scan_detail.estimated_hemoglobin", "Estimated Hemoglobin")}</span>
                                            <span className="text-lg font-bold text-blue-700">
                                                {scan.hemoglobin_level} g/dL
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {t("doctor.scan_detail.normal_range", "Normal range: 12-16 g/dL (female), 14-18 g/dL (male)")}
                                        </p>
                                    </div>
                                )}

                                {scan.doctor_reviewed && scan.doctor_notes && (
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-bold text-green-900">{t("doctor.scan_detail.previously_reviewed", "Previously Reviewed")}</span>
                                        </div>
                                        <p className="text-sm text-green-700">{scan.doctor_notes}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Doctor's Review Form */}
                    <Card className="p-6 border border-gray-100 bg-white shadow-sm">
                        <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t("doctor.scan_detail.medical_assessment", "Medical Assessment")}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t("doctor.scan_detail.final_diagnosis", "Final Diagnosis")} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={finalDiagnosis}
                                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#0EA5E9] transition-colors bg-white"
                                >
                                    <option value="">{t("doctor.scan_detail.select_diagnosis", "Select diagnosis...")}</option>
                                    <option value="anemic">{t("doctor.scan_detail.diag_anemic", "Anemic - Confirmed")}</option>
                                    <option value="not_anemic">{t("doctor.scan_detail.diag_not_anemic", "Not Anemic - Healthy")}</option>
                                    <option value="borderline">{t("doctor.scan_detail.diag_borderline", "Borderline - Monitor")}</option>
                                    <option value="inconclusive">{t("doctor.scan_detail.diag_inconclusive", "Inconclusive - Further Testing Required")}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t("doctor.scan_detail.doctors_notes", "Doctor's Notes")}
                                </label>
                                <textarea
                                    value={doctorNotes}
                                    onChange={(e) => setDoctorNotes(e.target.value)}
                                    placeholder={t("doctor.scan_detail.notes_placeholder", "Enter your clinical observations and notes...")}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#0EA5E9] transition-colors resize-none"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t("doctor.scan_detail.recommended_action", "Recommended Action")}
                                </label>
                                <textarea
                                    value={recommendedAction}
                                    onChange={(e) => setRecommendedAction(e.target.value)}
                                    placeholder={t("doctor.scan_detail.action_placeholder", "Prescribe treatment, recommend tests, lifestyle changes, etc...")}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#0EA5E9] transition-colors resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    onClick={handleSaveReview}
                                    disabled={reviewMutation.isPending}
                                    className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {reviewMutation.isPending ? t("common.saving", "Saving...") : t("doctor.scan_detail.save_review", "Save Review")}
                                </Button>
                                <Button
                                    onClick={() => navigate('/doctor/scans')}
                                    variant="outline"
                                    className="px-8"
                                >
                                    {t("common.cancel", "Cancel")}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
