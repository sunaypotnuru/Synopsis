import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "../../lib/store";
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { getRequiredApiBaseUrl } from "../services/authSession";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const { t } = useTranslation();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: "onSubmit",
        reValidateMode: "onSubmit",
        defaultValues: { email: "", password: "" }
    });
    const { signIn, signInWithGoogle, loading } = useAuthStore();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data: LoginFormValues) => {
        const result = await signIn(data.email, data.password);

        if (result.success) {
            const role = ('role' in result ? result.role : undefined) || "admin";
            if (role !== "admin") {
                toast.error(t("auth.admin_only", "This account does not have admin access."));
                navigate("/login/patient", { replace: true });
                return;
            }

            try {
                const apiBaseUrl = getRequiredApiBaseUrl();
                const policyResponse = await fetch(`${apiBaseUrl}/api/v1/auth/security/policy`);
                const policy = policyResponse.ok ? await policyResponse.json() : { enforce_admin_2fa: false };
                if (policy?.enforce_admin_2fa) {
                    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
                    if (factorsError) {
                        throw factorsError;
                    }
                    const verifiedTotpCount = factorsData?.totp?.filter((f) => f.status === "verified").length || 0;
                    if (verifiedTotpCount === 0) {
                        await supabase.auth.signOut();
                        toast.error(t("auth.admin_2fa_required", "Admin login requires 2FA enrollment. Please set up TOTP first."));
                        return;
                    }
                }
            } catch (securityError) {
                await supabase.auth.signOut();
                toast.error(t("auth.security_check_failed", "Security verification failed during admin login. Please try again."));
                return;
            }

            toast.success(t("auth.welcome_back_admin", "Welcome back, Administrator!"));

            // Small delay to ensure state is updated
            setTimeout(() => {
                navigate("/admin/dashboard", { replace: true });
            }, 100);
        } else {
            const errorMsg = result.error?.message || result.error?.toString() || t("auth.failed_sign_in", "Failed to sign in");
            toast.error(errorMsg);
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1E293B] flex items-center justify-center relative overflow-hidden">
            {/* Background shapes */}
            <div className="absolute top-20 right-10 w-72 h-72 bg-[#7C3AED]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#8B5CF6]/5 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="p-8 shadow-2xl backdrop-blur-sm bg-[#1E293B]/80 border border-[#7C3AED]/30">
                    <div className="flex flex-col items-center mb-8">
                        <motion.div
                            className="w-16 h-16 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            <Shield className="w-8 h-8 text-white" />
                        </motion.div>
                        <motion.h1 className="text-3xl font-bold text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            {t("auth.admin_login", "Admin Login")}
                        </motion.h1>
                        <motion.p className="text-[#94A3B8] mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                            {t("auth.admin_access", "Access the Netra AI administration panel")}
                        </motion.p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
                        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                            <Label htmlFor="email" className="text-[#E2E8F0]">{t("auth.email_address", "Email Address")}</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    autoComplete="email"
                                    {...register("email")}
                                    className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                                />
                            </div>
                            {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>}
                        </motion.div>

                        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                            <Label htmlFor="password" className="text-[#E2E8F0]">{t("auth.password", "Password")}</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    {...register("password")}
                                    className={`pl-10 pr-11 ${errors.password ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#7C3AED] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                            <Button
                                type="submit"
                                disabled={loading || isSubmitting}
                                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white py-6 text-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                            >
                                {loading || isSubmitting ? t("auth.signing_in", "Signing in...") : t("auth.sign_in", "Sign In")}
                            </Button>
                        </motion.div>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-900/50 backdrop-blur-sm px-2 text-[#94A3B8]">
                                {t("auth.login.or_continue_with", "Or continue with")}
                            </span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full py-6 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white transition-all flex items-center justify-center gap-3"
                        onClick={() => signInWithGoogle()}
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="font-medium">Google</span>
                    </Button>
                </Card>
            </motion.div>
        </div>
    );
}
