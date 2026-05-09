import { useState } from 'react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientAPI } from '../../lib/api';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, TrendingUp, Droplet, Heart, Scale, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from '../../lib/i18n';

interface VitalLog {
  id: string;
  tracker_type: string;
  value: number;
  unit: string;
  notes?: string;
  logged_at: string;
}

export default function ChronicDiseaseTracker() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const TRACKER_TYPES = [
        { id: 'blood_pressure', label: t('patient.tracker.blood_pressure', 'Blood Pressure'), icon: Heart, unit: 'mmHg' },
        { id: 'blood_glucose', label: t('patient.tracker.blood_glucose', 'Blood Glucose'), icon: Droplet, unit: 'mg/dL' },
        { id: 'weight', label: t('patient.tracker.weight', 'Weight'), icon: Scale, unit: 'kg' },
        { id: 'heart_rate', label: t('patient.tracker.heart_rate', 'Heart Rate'), icon: Activity, unit: 'bpm' }
    ];

    const [activeTracker, setActiveTracker] = useState(TRACKER_TYPES[0].id);
    const [isLogging, setIsLogging] = useState(false);

    // Form state
    const [value, setValue] = useState('');
    const [notes, setNotes] = useState('');

    const { data: vitals, isLoading } = useQuery<VitalLog[]>({
        queryKey: ['vitals'],
        queryFn: () => patientAPI.getVitals().then(res => res.data)
    });

    const logVital = useMutation({
        mutationFn: (data: { tracker_type: string; value: number; unit: string; notes: string }) => patientAPI.addVitalLog(data),
        onSuccess: () => {
            toast.success(t("patient.tracker.log_success", "Vital logged successfully"));
            queryClient.invalidateQueries({ queryKey: ['vitals'] });
            setIsLogging(false);
            setValue('');
            setNotes('');
        },
        onError: () => toast.error(t("patient.tracker.log_failed", "Failed to log vital"))
    });

    const handleLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value) {
            toast.error(t("patient.tracker.enter_value", "Please enter a value"));
            return;
        }

        const activeType = TRACKER_TYPES.find(t => t.id === activeTracker);

        logVital.mutate({
            tracker_type: activeTracker,
            value: parseFloat(value),
            unit: activeType?.unit || '',
            notes: notes
        });
    };

    const filterData = () => {
        if (!vitals) return [];
        return vitals
            .filter((v) => v.tracker_type === activeTracker)
            .reverse() // Chronological order for charts
            .map((v) => ({
                ...v,
                date: format(new Date(v.logged_at), 'MMM dd, HH:mm')
            }));
    };

    const activeTypeObj = TRACKER_TYPES.find(t => t.id === activeTracker);
    const ActiveIcon = activeTypeObj?.icon || Activity;
    const chartData = filterData();

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
            <div className="max-w-6xl mx-auto space-y-8">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{t('patient.tracker.title', 'Chronic Disease Tracker')}</h1>
                            <p className="text-gray-500 font-medium text-sm">{t('patient.tracker.subtitle', 'Monitor your daily vitals and view health trends.')}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsLogging(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl px-6 shadow-md shadow-rose-600/20"
                    >
                        <Plus className="w-5 h-5 mr-2" /> {t('patient.tracker.log_new', 'Log New Vital')}
                    </Button>
                </div>

                {isLogging && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <Card className="p-6 border-2 border-rose-100 bg-rose-50/30">
                            <form onSubmit={handleLog} className="grid md:grid-cols-4 gap-4 items-end">
                                <div className="space-y-4 col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('patient.tracker.vital_type', 'Vital Type')}</label>
                                        <Select value={activeTracker} onValueChange={setActiveTracker}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRACKER_TYPES.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('common.value', 'Value')} ({activeTypeObj?.unit})</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={value}
                                            onChange={e => setValue(e.target.value)}
                                            placeholder={t('patient.tracker.value_placeholder', 'e.g. 120')}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('patient.tracker.notes_optional', 'Notes (Optional)')}</label>
                                        <Input
                                            type="text"
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder={t('patient.tracker.notes_placeholder', 'After meal, resting, etc.')}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsLogging(false)} className="bg-white">
                                            {t('common.cancel', 'Cancel')}
                                        </Button>
                                        <Button type="submit" disabled={logVital.isPending} className="bg-rose-600 hover:bg-rose-700 text-white flex-1">
                                            {logVital.isPending ? t('common.saving', 'Saving...') : t('patient.tracker.save_log', 'Save Log')}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}

                <div className="grid lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 space-y-3">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-2">{t('patient.tracker.trackers', 'Trackers')}</h3>
                        {TRACKER_TYPES.map(tracker => {
                            const TIcon = tracker.icon;
                            const isActive = activeTracker === tracker.id;
                            return (
                                <button
                                    key={tracker.id}
                                    onClick={() => setActiveTracker(tracker.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${isActive
                                        ? 'bg-white border-rose-200 shadow-md shadow-rose-100'
                                        : 'bg-white/50 border-gray-100 text-gray-500 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <TIcon className="w-5 h-5" />
                                        </div>
                                        <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{tracker.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-gray-400" />
                                    {t('patient.tracker.trends', { defaultValue: '{{type}} Trends', type: activeTypeObj?.label })}
                                </h2>
                            </div>

                            {isLoading ? (
                                <div className="h-[300px] flex items-center justify-center text-gray-400">{t('common.loading_data', 'Loading data...')}</div>
                            ) : chartData.length === 0 ? (
                                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                                    <ActiveIcon className="w-16 h-16 text-gray-200 mb-3" />
                                    <p>{t('patient.tracker.no_data', { defaultValue: 'No data logged for {{type}} yet.', type: activeTypeObj?.label })}</p>
                                </div>
                            ) : (
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} unit={activeTypeObj?.unit ? ` ${activeTypeObj.unit}` : ''} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#E11D48"
                                                strokeWidth={3}
                                                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#E11D48' }}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#E11D48' }}
                                                animationDuration={1500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" /> {t('patient.tracker.recent_logs', 'Recent Logs')}
                            </h3>
                            <div className="space-y-3">
                                {chartData.slice().reverse().slice(0, 5).map((log) => (
                                    <div key={log.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50">
                                        <div>
                                            <p className="font-bold text-gray-900">{log.value} <span className="text-xs font-normal text-gray-500">{log.unit}</span></p>
                                            {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                                        </div>
                                        <p className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                                            {log.date}
                                        </p>
                                    </div>
                                ))}
                                {chartData.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">{t('patient.tracker.no_recent', 'No recent logs.')}</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
