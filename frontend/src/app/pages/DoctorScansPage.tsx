import { useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Activity, Eye, AlertCircle, CheckCircle2, Filter, Download, FileText } from 'lucide-react';
import { doctorAPI } from '../../lib/api';
import { Skeleton } from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function DoctorScansPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const navigate = useNavigate();

    const { data: scans, isLoading, error } = useQuery({
        queryKey: ['doctorScans'],
        queryFn: () => doctorAPI.getScans().then(res => res.data)
    });

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton width={300} height={40} />
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
                <h3 className="text-lg font-bold text-red-900">{t("doctor.scans.failed_load", "Failed to load scans")}</h3>
                <p className="text-red-700">{(error as Error).message}</p>
            </div>
        );
    }

    interface ScanRecord {
        id: string;
        profiles_patient?: { full_name?: string };
        doctor_reviewed: boolean;
        prediction?: string;
        confidence?: number;
        hemoglobin_level?: number;
        created_at: string;
        image_url?: string;
    }

    const filteredScans = (scans || []).filter((scan: ScanRecord) => {
        const matchesSearch =
            (scan.profiles_patient?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (scan.id || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filterStatus === 'all' ? true :
                filterStatus === 'pending' ? !scan.doctor_reviewed :
                    filterStatus === 'reviewed' ? scan.doctor_reviewed : true;

        return matchesSearch && matchesFilter;
    });

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text("Doctor Scan Analysis", 14, 15);
        autoTable(doc, {
            head: [['Date', 'Patient Name', 'Prediction', 'Confidence', 'Hemoglobin', 'Status']],
            body: filteredScans.map((s: ScanRecord) => [
                new Date(s.created_at).toLocaleDateString(),
                s.profiles_patient?.full_name || 'Unknown Patient',
                s.prediction || 'Pending',
                `${Math.round((s.confidence || 0) * 100)}%`,
                s.hemoglobin_level ? `${s.hemoglobin_level} g/dL` : 'N/A',
                s.doctor_reviewed ? 'Reviewed' : 'Pending'
            ]),
            startY: 20,
        });
        doc.save("doctor_scans.pdf");
    };

    const exportCSV = () => {
        const ws = XLSX.utils.json_to_sheet(filteredScans.map((s: ScanRecord) => ({
            Date: new Date(s.created_at).toLocaleDateString(),
            PatientName: s.profiles_patient?.full_name || 'Unknown Patient',
            Prediction: s.prediction || 'Pending',
            Confidence: `${Math.round((s.confidence || 0) * 100)}%`,
            Hemoglobin: s.hemoglobin_level ? `${s.hemoglobin_level} g/dL` : 'N/A',
            Status: s.doctor_reviewed ? 'Reviewed' : 'Pending'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scans");
        XLSX.writeFile(wb, "doctor_scans.csv");
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{t("doctor.scans.title", "Scan Analysis")}</h1>
                            <p className="text-[#64748B]">{t("doctor.scans.subtitle", "Review and analyze patient conjunctiva scans")}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={exportCSV} className="bg-white hover:bg-gray-50 text-[#0F172A]">
                                <Download className="w-4 h-4 mr-2" /> {t("common.csv", "CSV")}
                            </Button>
                            <Button variant="outline" onClick={exportPDF} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-none">
                                <FileText className="w-4 h-4 mr-2" /> {t("common.pdf", "PDF")}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder={t("doctor.scans.search_placeholder", "Search by patient name or scan ID...")}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#0EA5E9] transition-colors bg-white shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400 shrink-0" />
                            {['all', 'pending', 'reviewed'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${filterStatus === status
                                        ? "bg-[#0EA5E9] text-white shadow-md"
                                        : "bg-white border border-gray-200 text-[#64748B] hover:bg-gray-50"
                                        }`}
                                >
                                    {t(`doctor.scans.filter_${status}`, status)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredScans.map((scan: ScanRecord) => {
                            const patientName = scan.profiles_patient?.full_name || t("common.unknown_patient", "Unknown Patient");
                            const isAnemic = (scan.prediction || '').toLowerCase() === 'anemic';
                            const confidence = Math.round((scan.confidence || 0) * 100);
                            const isReviewed = scan.doctor_reviewed;

                            return (
                                <motion.div
                                    key={scan.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card className="p-5 border border-gray-100 hover:shadow-lg transition-all bg-white">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] font-bold">
                                                    {patientName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#0F172A]">{patientName}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(scan.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {isReviewed && (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            )}
                                        </div>

                                        {scan.image_url && (
                                            <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 aspect-video">
                                                <img
                                                    src={scan.image_url}
                                                    alt="Conjunctiva scan"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">{t("doctor.scans.ai_prediction", "AI Prediction:")}</span>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isAnemic
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {scan.prediction || t("common.pending", "Pending")}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-gray-600">{t("doctor.scans.confidence", "Confidence:")}</span>
                                                    <span className="text-sm font-bold text-[#0F172A]">{confidence}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${isAnemic ? 'bg-red-500' : 'bg-green-500'}`}
                                                        style={{ width: `${confidence}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {scan.hemoglobin_level && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">{t("doctor.scans.hemoglobin", "Hemoglobin:")}</span>
                                                    <span className="text-sm font-bold text-[#0F172A]">
                                                        {scan.hemoglobin_level} g/dL
                                                    </span>
                                                </div>
                                            )}

                                            <Button
                                                onClick={() => navigate(`/doctor/scans/${scan.id}`)}
                                                className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                {isReviewed ? t("doctor.scans.view_analysis", "View Analysis") : t("doctor.scans.analyze_scan", "Analyze Scan")}
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}

                        {filteredScans.length === 0 && (
                            <div className="col-span-full py-12 text-center">
                                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">{t("doctor.scans.no_scans", "No scans found matching your criteria")}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
