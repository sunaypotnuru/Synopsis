import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Search, Download, Filter, RefreshCw, User, Clock, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    ip_address?: string;
    user_agent?: string;
    status: string;
    created_at: string;
    details?: Record<string, unknown>;
}

const ACTION_COLORS: Record<string, string> = {
    'GET': 'bg-blue-100 text-blue-700',
    'POST': 'bg-green-100 text-green-700',
    'PUT': 'bg-yellow-100 text-yellow-700',
    'DELETE': 'bg-red-100 text-red-700',
    'PATCH': 'bg-purple-100 text-purple-700',
};

export default function AdminAuditLogsPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['auditLogs', actionFilter, dateFrom, dateTo],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '200' });
            if (actionFilter) params.set('action', actionFilter);
            if (dateFrom) params.set('start_date', dateFrom);
            if (dateTo) params.set('end_date', dateTo);
            const res = await api.get(`/api/v1/admin/audit/logs?${params}`);
            return res.data;
        },
        staleTime: 30 * 1000,
    });

    const logs: AuditLog[] = data?.logs || [];

    const filtered = logs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            log.action?.toLowerCase().includes(q) ||
            log.user_id?.toLowerCase().includes(q) ||
            log.resource_type?.toLowerCase().includes(q) ||
            log.ip_address?.toLowerCase().includes(q)
        );
    });

    const exportCSV = () => {
        if (!filtered.length) { toast.error(t("admin.audit.no_data", "No data to export")); return; }
        const headers = [t("common.time", "Time"), t("admin.audit.user_id", "User ID"), t("admin.audit.action", "Action"), t("admin.audit.resource", "Resource"), t("admin.audit.ip_address", "IP Address"), t("common.status", "Status")];
        const rows = filtered.map(l => [
            new Date(l.created_at).toLocaleString(),
            l.user_id || '',
            l.action || '',
            `${l.resource_type || ''} ${l.resource_id || ''}`.trim(),
            l.ip_address || '',
            l.status || ''
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'audit_logs.csv'; a.click();
        toast.success(t("admin.audit.exported", "Audit logs exported"));
    };

    const getMethodColor = (action: string) => {
        const method = action?.split(' ')[0] || '';
        return ACTION_COLORS[method] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                        <Shield className="w-6 h-6 text-[#8B5CF6]" />
                        {t("admin.audit.title", "Audit Logs")}
                    </h1>
                    <p className="text-[#64748B] mt-1">{t("admin.audit.subtitle", "Track all user actions across the platform")}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => refetch()} variant="outline" className="flex gap-2 items-center text-sm">
                        <RefreshCw className="w-4 h-4" /> {t("common.refresh", "Refresh")}
                    </Button>
                    <Button onClick={exportCSV} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex gap-2 items-center text-sm">
                        <Download className="w-4 h-4" /> {t("common.export_csv", "Export CSV")}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t("admin.audit.search_placeholder", "Search by user, action, IP...")}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={actionFilter}
                            onChange={e => setActionFilter(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] bg-white"
                        >
                            <option value="">{t("admin.audit.all_methods", "All Methods")}</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                    <input
                        type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        placeholder={t("admin.audit.from_date", "From date")}
                    />
                    <input
                        type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        placeholder={t("admin.audit.to_date", "To date")}
                    />
                </div>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t("admin.audit.total_logs", "Total Logs"), value: logs.length, icon: Shield, color: 'text-purple-600 bg-purple-50' },
                    { label: t("admin.audit.filtered", "Filtered"), value: filtered.length, icon: Filter, color: 'text-blue-600 bg-blue-50' },
                    { label: t("admin.audit.unique_users", "Unique Users"), value: new Set(logs.map(l => l.user_id)).size, icon: User, color: 'text-green-600 bg-green-50' },
                    { label: t("admin.audit.unique_ips", "Unique IPs"), value: new Set(logs.map(l => l.ip_address).filter(Boolean)).size, icon: Globe, color: 'text-orange-600 bg-orange-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-[#0F172A]">{value}</p>
                            <p className="text-xs text-[#64748B]">{label}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Logs Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("common.time", "Time")}</th>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("admin.audit.user_id", "User ID")}</th>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("admin.audit.action", "Action")}</th>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("admin.audit.resource", "Resource")}</th>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("admin.audit.ip_address", "IP Address")}</th>
                                <th className="text-left px-4 py-3 font-semibold text-[#64748B]">{t("common.status", "Status")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center text-[#64748B]">
                                        <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                        <p>{t("admin.audit.no_logs", "No audit logs found")}</p>
                                        <p className="text-xs mt-1">{t("admin.audit.no_logs_desc", "Logs appear here as users interact with the platform")}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((log, i) => (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.01 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">
                                            {log.user_id ? `${log.user_id.slice(0, 8)}...` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getMethodColor(log.action)}`}>
                                                {log.action?.split(' ')[0]}
                                            </span>
                                            <span className="ml-2 text-[#64748B] text-xs font-mono truncate max-w-[200px] inline-block align-middle">
                                                {log.action?.split(' ').slice(1).join(' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[#64748B]">
                                            {[log.resource_type, log.resource_id].filter(Boolean).join(' / ') || '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-[#64748B]">
                                            {log.ip_address || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.status || 'success'}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

