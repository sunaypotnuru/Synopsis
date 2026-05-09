import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, ShieldCheck, CreditCard, Activity, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "../../lib/store";
import { insuranceAPI } from "../../lib/api";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

export default function InsuranceVerificationPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [provider, setProvider] = useState("");
    const [policyNumber, setPolicyNumber] = useState("");
    const [dob, setDob] = useState("");

    interface VerifyResult {
        verified: boolean;
        status: string;
        coverage_active: boolean;
        copay_amount: number;
        deductible_remaining: number;
        message: string;
    }

    const [result, setResult] = useState<VerifyResult | null>(null);

    const verifyMutation = useMutation({
        mutationFn: () => insuranceAPI.verify({ provider, policy_number: policyNumber, patient_name: user?.name || "Self", date_of_birth: dob }),
        onSuccess: (res) => {
            setResult(res.data);
            if (res.data.verified && res.data.coverage_active) {
                toast.success(t('patient.insurance.verified_success', "Insurance verified actively!"));
            } else {
                toast.error(t('patient.insurance.coverage_issue', "Insurance coverage issue detected."));
            }
        },
        onError: () => {
            toast.error(t('patient.insurance.verify_failed', "Failed to connect to the verification clearinghouse."));
        }
    });

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider || !policyNumber) {
            toast.error(t('patient.insurance.missing_fields', "Provider and Policy Number are required."));
            return;
        }
        verifyMutation.mutate();
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 bg-[#F8FAFC]">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A]">{t('patient.insurance.title', "Insurance Verification")}</h1>
                        <p className="text-[#64748B]">{t('patient.insurance.subtitle', "Instantly verify your health coverage and co-pay details.")}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Verification Form */}
                    <Card className="p-8 border-t-8 border-t-blue-500 shadow-xl bg-white rounded-3xl">
                        <h2 className="text-xl font-bold mb-6 text-[#0F172A]">{t('patient.insurance.policy_details', "Policy Details")}</h2>
                        <form onSubmit={handleVerify} className="space-y-5">
                            <div>
                                <Label className="text-sm font-semibold text-gray-700">{t('patient.insurance.provider', "Insurance Provider")}</Label>
                                <Input
                                    className="mt-1.5 h-12 text-lg bg-gray-50 border-gray-200 focus:bg-white"
                                    placeholder={t('patient.insurance.provider_placeholder', "e.g. BlueCross, Aetna, Cigna")}
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-gray-700">{t('patient.insurance.policy_number', "Member / Policy Number")}</Label>
                                <Input
                                    className="mt-1.5 h-12 font-mono text-lg bg-gray-50 border-gray-200 focus:bg-white tracking-widest placeholder:tracking-normal"
                                    placeholder={t('patient.insurance.policy_placeholder', "ABC123456789")}
                                    value={policyNumber}
                                    onChange={(e) => setPolicyNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-gray-700">{t('patient.insurance.dob', "Date of Birth")}</Label>
                                <Input
                                    type="date"
                                    className="mt-1.5 h-12 bg-gray-50 border-gray-200 focus:bg-white"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                                disabled={verifyMutation.isPending}
                            >
                                {verifyMutation.isPending ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('patient.insurance.verifying', "Verifying with Network...")}</>
                                ) : (
                                    t('patient.insurance.verify_button', "Verify Coverage instantly")
                                )}
                            </Button>
                        </form>
                    </Card>

                    {/* Results Area */}
                    <div>
                        <AnimatePresence mode="popLayout">
                            {result ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="h-full"
                                >
                                    <Card className={`h-full p-8 shadow-xl rounded-3xl ${result.coverage_active ? 'border-t-8 border-t-emerald-500 bg-emerald-50' : 'border-t-8 border-t-rose-500 bg-rose-50'}`}>
                                        <div className="flex items-center gap-3 mb-6">
                                            {result.coverage_active ? (
                                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                                            ) : (
                                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                                            )}
                                            <h2 className={`text-2xl font-bold ${result.coverage_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {result.status}
                                            </h2>
                                        </div>

                                        <p className="text-gray-700 mb-8 pb-6 border-b border-gray-200/50 font-medium">
                                            {result.message}
                                        </p>

                                        {result.coverage_active && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <CreditCard className="w-5 h-5 text-gray-400" />
                                                        <span className="font-semibold text-gray-700">{t('patient.insurance.est_copay', "Estimated Co-pay")}</span>
                                                    </div>
                                                    <span className="text-xl font-bold text-[#0F172A]">${result.copay_amount.toFixed(2)}</span>
                                                </div>

                                                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Activity className="w-5 h-5 text-gray-400" />
                                                        <span className="font-semibold text-gray-700">{t('patient.insurance.deductible', "Deductible Remaining")}</span>
                                                    </div>
                                                    <span className="text-xl font-bold text-[#0F172A]">${result.deductible_remaining.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                </motion.div>
                            ) : (
                                <div className="h-full border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                                    <ShieldAlert className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-500">{t('patient.insurance.no_policy', "No Policy Verified")}</h3>
                                    <p className="text-sm text-gray-400 mt-2">{t('patient.insurance.no_policy_desc', "Enter your details to check network coverage and co-pays securely.")}</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
