import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldAlert, HeartPulse, History, ArrowLeft, Send, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { patientAPI } from "../../lib/api";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "../../lib/i18n";

interface AssessmentRecord {
    id: string;
    assessment_type: string;
    score: number;
    raw_responses: { age: string; gender: string; cholesterol: string; smoker: boolean; systolicBP: string };
    created_at: string;
}

export default function HealthRiskAssessmentPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [history, setHistory] = useState<AssessmentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const activeTab = 'cardiovascular'; // Default assessment type

    // Form State
    const [age, setAge] = useState<string>("");
    const [gender, setGender] = useState<"male" | "female">("male");
    const [cholesterol, setCholesterol] = useState<string>("");
    const [smoker, setSmoker] = useState<boolean>(false);
    const [systolicBP, setSystolicBP] = useState<string>("");

    const fetchHistory = async () => {
        try {
            const res = await patientAPI.getRiskAssessments();
            setHistory(res.data || []);
        } catch (e) {
            console.error("Failed to load assessments", e);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const calculateMockRiskScore = () => {
        let riskScore = 0;
        const a = parseInt(age) || 30;
        const chol = parseInt(cholesterol) || 150;
        const bp = parseInt(systolicBP) || 120;

        // Very basic mock calculation for demo purposes
        riskScore += Math.max(0, (a - 30) * 0.3);
        if (gender === 'male') riskScore += 2;
        if (smoker) riskScore += 7;
        if (chol > 200) riskScore += 5;
        if (chol > 240) riskScore += 4;
        if (bp > 130) riskScore += 3;
        if (bp > 140) riskScore += 4;

        return Math.min(100, Math.max(1, riskScore));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const score = calculateMockRiskScore();

        const payload = {
            assessment_type: activeTab,
            score: score,
            raw_responses: { age, gender, cholesterol, smoker, systolicBP }
        };

        try {
            await patientAPI.createRiskAssessment(payload);
            toast.success(t('patient.hra.assessment_success', "Risk assessment completed. Score stored securely."));
            // Reset form
            setAge(""); setCholesterol(""); setSystolicBP(""); setSmoker(false);
            fetchHistory();
        } catch (error) {
            toast.error(t('patient.hra.assessment_failed', "Failed to save assessment."));
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = history.map(item => ({
        date: new Date(item.created_at).toLocaleDateString(),
        score: item.score
    })).reverse(); // Oldest to newest for the chart timeline

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen pt-20 pb-10 bg-gray-50 dark:bg-gray-900"
        >
            <div className="max-w-4xl mx-auto px-4">
                <button
                    onClick={() => navigate("/patient/dashboard")}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.back_to_dashboard', 'Back to Dashboard')}
                </button>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                        <HeartPulse className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('patient.hra.title', 'Health Risk Assessment')}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('patient.hra.subtitle', 'Evaluate your clinical risks and track improvements over time.')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Panel: Form */}
                    <div className="md:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10">
                                <Activity className="w-40 h-40 dark:text-gray-600" />
                            </div>

                            <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">{t('patient.hra.cardiovascular_risk', '10-Year Cardiovascular Risk')}</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patient.hra.age', 'Age (years)')}</label>
                                        <input
                                            type="number" required min="20" max="100"
                                            value={age} onChange={e => setAge(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder={t('patient.hra.age_placeholder', 'e.g. 45')}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patient.hra.gender', 'Gender')}</label>
                                        <select
                                            value={gender} onChange={e => setGender(e.target.value as "male" | "female")}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="male">{t('common.male', 'Male')}</option>
                                            <option value="female">{t('common.female', 'Female')}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patient.hra.cholesterol', 'Total Cholesterol (mg/dL)')}</label>
                                        <input
                                            type="number" required
                                            value={cholesterol} onChange={e => setCholesterol(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder={t('patient.hra.cholesterol_placeholder', 'e.g. 180')}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('patient.hra.systolic_bp', 'Systolic BP (mmHg)')}</label>
                                        <input
                                            type="number" required
                                            value={systolicBP} onChange={e => setSystolicBP(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-700 dark:text-white"
                                            placeholder={t('patient.hra.systolic_placeholder', 'e.g. 120')}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="smoker"
                                        checked={smoker} onChange={e => setSmoker(e.target.checked)}
                                        className="w-4 h-4 text-rose-600 border-gray-300 dark:border-gray-600 rounded focus:ring-rose-500"
                                    />
                                    <label htmlFor="smoker" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('patient.hra.current_smoker', 'I am a current smoker')}</label>
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-md">
                                    {isLoading ? t('common.calculating', "Calculating...") : <><Send className="w-4 h-4 mr-2" /> {t('patient.hra.evaluate_risk', 'Evaluate Risk Score')}</>}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Right Panel: History & Trends */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                <History className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                {t('patient.hra.risk_timeline', 'Risk Timeline')}
                            </h3>
                            {history.length > 0 ? (
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor' }} tickLine={false} axisLine={false} className="dark:text-gray-400" />
                                            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} tickLine={false} axisLine={false} domain={[0, 100]} className="dark:text-gray-400" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, white)', color: 'var(--tooltip-text, black)' }} />
                                            <Line type="monotone" dataKey="score" stroke="#E11D48" strokeWidth={3} dot={{ r: 4, fill: '#E11D48' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center">
                                    <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs" dangerouslySetInnerHTML={{ __html: t('patient.hra.no_assessments', 'No assessments recorded yet.<br />Fill out the form to generate your first score.') }}></p>
                                </div>
                            )}
                        </div>

                        {history.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('patient.hra.latest_result', 'Latest Result')}</h3>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{history[0].score.toFixed(1)}%</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('patient.hra.risk_probability', 'risk probability')}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">{t('patient.hra.recorded_on', { defaultValue: 'Recorded on {{date}}', date: new Date(history[0].created_at).toLocaleDateString() })}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
