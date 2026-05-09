import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    FileText, Download, Plus, Clock, FileBarChart, Zap, ShieldCheck, Activity, FileSpreadsheet
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { getRequiredApiBaseUrl, getSupabaseAccessToken } from '../../services/authSession';

interface _JsPDFWithAutoTable extends jsPDF {
    autoTable: (options: Record<string, unknown>) => void;
}

interface JsPDFWithInternal {
    internal: { 
        getNumberOfPages: () => number;
    };
    setPage: (page: number) => void;
    setFontSize: (size: number) => void;
    setTextColor: (r: number, g: number, b: number) => void;
    text: (text: string, x: number, y: number, options?: { align?: string }) => void;
}

interface ReportData {
    date_range?: {
        start: string;
        end: string;
    };
    doctor_name?: string;
    occupation?: string;
    total_revenue?: number;
    completed_consultations?: number;
    total_scans_performed?: number;
    active_patients?: number;
}

interface Report {
    id: string;
    title: string;
    type: string;
    created_at: string;
    data?: ReportData;
}

interface GenerateReportResponse {
    message?: string;
    report?: Report;
}

interface NewReportState {
    title: string;
    report_type: string;
    date_range: { start: string; end: string };
    metrics: string[];
}

export default function AdminReportsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [newReport, setNewReport] = useState<NewReportState>({
        title: '',
        report_type: 'financial',
        date_range: { start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
        metrics: ['revenue', 'consultations']
    });
    const [activeFilter, setActiveFilter] = useState('all');
    const apiBaseUrl = getRequiredApiBaseUrl();

    const { data: reports, isLoading } = useQuery<Report[]>({
        queryKey: ['adminReports'],
        queryFn: () => adminAPI.getReports().then((res) => res.data?.data || [])
    });

    const generateMutation = useMutation({
        mutationFn: (data: { title: string; report_type: string; start_date: string; end_date: string; metrics: string[] }) => 
            adminAPI.generateReport(data).then((res) => res.data as GenerateReportResponse),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['adminReports'] });
            toast.success(data.message || t("admin.reports.generate_success", "Report generated successfully"));
            setIsGenerateOpen(false);

            // Auto-download the newly generated report
            if (data.report) {
                handleDownloadPDF(data.report);
            }
        },
        onError: () => toast.error(t("admin.reports.generate_error", "Failed to generate report"))
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReport.title) {
            toast.error(t("admin.reports.provide_title", "Please provide a report title."));
            return;
        }

        // Set appropriate metrics based on type
        const metrics = newReport.report_type === 'financial'
            ? ['total_revenue', 'completed_consultations']
            : ['total_scans_performed', 'active_patients'];

        // Prepare payload according to backend schema
        const payload = {
            title: newReport.title,
            report_type: newReport.report_type,
            start_date: newReport.date_range.start,
            end_date: newReport.date_range.end,
            metrics
        };

        generateMutation.mutate(payload);
    };

    const handleDownloadPDF = (report: Report) => {
        const doc = new jsPDF();

        // Header Section
        doc.setFillColor(13, 148, 136); // Teal header
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(t("admin.reports.pdf_header", "NETRA AI - HEALTH REPORT"), 14, 20);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`${t("admin.reports.generated_at", "Generated:")} ${new Date(report.created_at || new Date()).toLocaleDateString()}`, 14, 30);

        // Document Metadata
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(report.title || t("admin.reports.custom_report", "Custom Report"), 14, 55);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`${t("admin.reports.report_type_label", "Report Type:")} ${report.type?.toUpperCase() || t("admin.reports.type_general", "GENERAL")}`, 14, 62);

        if (report.data?.date_range) {
            doc.text(`${t("admin.reports.period", "Period:")} ${report.data.date_range.start} ${t("common.to", "to")} ${report.data.date_range.end}`, 14, 68);
        }

        // Doctor / Provider Information Box (Per User Request)
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 75, 180, 30, 3, 3, 'FD');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(t("admin.reports.provider_info", "Provider Information"), 20, 83);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`${t("common.name", "Name:")} ${report.data?.doctor_name || t("admin.reports.sys_admin", "System Administrator")}`, 20, 92);
        doc.text(`${t("admin.reports.occupation", "Occupation / Specialty:")} ${report.data?.occupation || t("admin.reports.platform_ops", "Platform Operations")}`, 20, 99);

        // Data Metrics Section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(t("admin.reports.key_metrics", "Key Metrics summary"), 14, 120);

        const tableColumn = [t("admin.analytics.metric", "Metric"), t("admin.analytics.value", "Value")];
        const tableRows = [];

        if (report.data) {
            if (report.data.total_revenue !== undefined) {
                tableRows.push([t("admin.reports.total_revenue", "Total Revenue (Est)"), `$${report.data.total_revenue}`]);
            }
            if (report.data.completed_consultations !== undefined) {
                tableRows.push([t("admin.reports.completed_consultations", "Completed Consultations"), report.data.completed_consultations]);
            }
            if (report.data.total_scans_performed !== undefined) {
                tableRows.push([t("admin.reports.total_ai_scans", "Total AI Scans Performed"), report.data.total_scans_performed]);
            }
            if (report.data.active_patients !== undefined) {
                tableRows.push([t("admin.reports.active_patients", "Active Patients"), report.data.active_patients]);
            }
        }

        if (tableRows.length === 0) {
            tableRows.push([t("common.data", "Data"), t("admin.reports.no_metrics", "No specific metrics found for this report period.")]);
        }

        (doc as _JsPDFWithAutoTable).autoTable({
            startY: 125,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [71, 85, 105] },
            styles: { fontSize: 11, cellPadding: 6 }
        });

        // Footer
        const pageCount = (doc as unknown as JsPDFWithInternal).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(t("admin.reports.pdf_footer", "© {{year}} Netra AI Healthcare. Confidentital and Proprietary.", { year: new Date().getFullYear() }), 14, 285);
            doc.text(t("common.page_n_of_m", "Page {{n}} of {{m}}", { n: i, m: pageCount }), 190, 285, { align: 'right' });
        }

        doc.save(`NetraAI_Report_${report.title.replace(/\s+/g, '_')}.pdf`);
    };

    const handleExportMCP = async (type: 'analytics' | 'audit', format: 'pdf' | 'excel') => {
        try {
            let endpoint = '';
            let filename = '';
            
            if (type === 'analytics') {
                endpoint = `${apiBaseUrl}/api/v1/admin/mcp/export/analytics-report?format=${format}`;
                filename = `NetraAI_MCP_Analytics_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            } else {
                endpoint = format === 'pdf' 
                    ? `${apiBaseUrl}/api/v1/admin/mcp/export/audit-logs-pdf`
                    : `${apiBaseUrl}/api/v1/admin/mcp/export/audit-logs-excel`;
                filename = `NetraAI_Audit_Logs_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            }

            const token = getSupabaseAccessToken();
            const response = await fetch(endpoint, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                }
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();

            toast.success(`${type === 'analytics' ? 'MCP Analytics' : 'Audit Logs'} exported as ${format.toUpperCase()}!`);
        } catch (error) {
            toast.error(`Failed to export ${type} report`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                        <FileBarChart className="w-6 h-6 text-[#0D9488]" />
                        {t("admin.reports.title", "Advanced Reporting")}
                    </h1>
                    <p className="text-[#64748B] mt-1">{t("admin.reports.subtitle", "Generate, schedule, and export custom platform reports")}</p>
                </div>

                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex gap-2 items-center">
                            <Plus className="w-4 h-4" /> {t("admin.reports.custom_report_btn", "Custom Report")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{t("admin.reports.generate_new", "Generate New Report")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleGenerate} className="space-y-5 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t("admin.reports.report_title", "Report Title")}</Label>
                                <Input
                                    id="title"
                                    placeholder={t("admin.reports.title_placeholder", "e.g., Q1 Financial Summary")}
                                    value={newReport.title}
                                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">{t("admin.reports.report_type", "Report Type")}</Label>
                                <select
                                    id="type"
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newReport.report_type}
                                    onChange={(e) => setNewReport({ ...newReport, report_type: e.target.value })}
                                >
                                    <option value="financial">{t("admin.reports.type_financial", "Financial Performance")}</option>
                                    <option value="clinical">{t("admin.reports.type_clinical", "Clinical Outcomes (Scans & Patients)")}</option>
                                    <option value="operational">{t("admin.reports.type_operational", "Operational Metrics")}</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">{t("common.start_date", "Start Date")}</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={newReport.date_range.start}
                                        onChange={(e) => setNewReport({ ...newReport, date_range: { ...newReport.date_range, start: e.target.value } })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">{t("common.end_date", "End Date")}</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={newReport.date_range.end}
                                        onChange={(e) => setNewReport({ ...newReport, date_range: { ...newReport.date_range, end: e.target.value } })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>
                                    {t("common.cancel", "Cancel")}
                                </Button>
                                <Button type="submit" disabled={generateMutation.isPending} className="bg-[#0D9488] hover:bg-[#0F766E] text-white">
                                    {generateMutation.isPending ? t("admin.reports.generating", "Generating...") : t("admin.reports.generate_download", "Generate & Download")}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Industrial Grade MCP Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 bg-gradient-to-br from-[#0D9488] to-[#0F766E] border-none shadow-xl text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold">MCP Diagnostics Analytics</h3>
                    </div>
                    <p className="text-sm text-white/80 mb-6 max-w-md">
                        Generate enterprise-grade reports of all ML tool invocations, success rates, and latency metrics across the protocol.
                    </p>
                    <div className="flex gap-3">
                        <Button 
                            onClick={() => handleExportMCP('analytics', 'pdf')}
                            className="bg-white text-[#0D9488] hover:bg-gray-100 font-bold rounded-xl h-10 px-4"
                        >
                            <FileText className="w-4 h-4 mr-2" /> PDF Report
                        </Button>
                        <Button 
                            onClick={() => handleExportMCP('analytics', 'excel')}
                            className="bg-white/20 hover:bg-white/30 border border-white/20 text-white font-bold rounded-xl h-10 px-4"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel Sheet
                        </Button>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-none shadow-xl text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold">HIPAA Audit Logs</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-6 max-w-md">
                        Export complete HIPAA-compliant audit trails for all diagnostic operations and data access events.
                    </p>
                    <div className="flex gap-3">
                        <Button 
                            onClick={() => handleExportMCP('audit', 'pdf')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl h-10 px-4"
                        >
                            <FileText className="w-4 h-4 mr-2 text-red-400" /> PDF Audit
                        </Button>
                        <Button 
                            onClick={() => handleExportMCP('audit', 'excel')}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl h-10 px-4"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" /> Excel Audit
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-[#0F172A]">{t("admin.reports.historical_reports", "Historical Reports")}</h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveFilter('all')}
                            className={`text-sm h-8 px-3 transition-all ${activeFilter === 'all' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t("common.all", "All")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveFilter('financial')}
                            className={`text-sm h-8 px-3 transition-all ${activeFilter === 'financial' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t("common.financial", "Financial")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveFilter('clinical')}
                            className={`text-sm h-8 px-3 transition-all ${activeFilter === 'clinical' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t("common.clinical", "Clinical")}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveFilter('operational')}
                            className={`text-sm h-8 px-3 transition-all ${activeFilter === 'operational' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {t("common.operational", "Operational")}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (reports && reports.filter((r) => activeFilter === 'all' || r.type === activeFilter).length > 0) ? (
                        (reports.filter((r) => activeFilter === 'all' || r.type === activeFilter)).map((report) => (
                            <motion.div
                                key={report.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.type === 'financial' ? 'bg-green-100 text-green-600' :
                                        report.type === 'clinical' ? 'bg-blue-100 text-blue-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A]">{report.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1">
                                            <span className="flex items-center gap-1 uppercase font-medium"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> {report.type}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(report.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-200 hover:bg-white hover:text-[#0D9488] hover:border-[#0D9488]"
                                    onClick={() => handleDownloadPDF(report)}
                                >
                                    <Download className="w-4 h-4 mr-2" /> PDF
                                </Button>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <FileBarChart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">{t("admin.reports.no_reports", "No reports generated yet")}</h3>
                            <p className="text-gray-500 mt-1">{t("admin.reports.no_reports_desc", "Generate a custom report to see it listed here.")}</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

