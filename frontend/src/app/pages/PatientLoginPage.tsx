import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Lock, Heart, Activity } from "lucide-react";
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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function PatientLoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: { email: "", password: "" }
  });
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const onSubmit = async (data: LoginFormValues) => {
    const result = await signIn(data.email, data.password);
    if (result.success) {
      // Use the resolved role from the store (extracted from user_metadata)
      const role = (result as unknown as Record<string, unknown> & { role?: string }).role || "patient";
      toast.success(t('auth.login.welcome_back', 'Welcome back!'));
      setTimeout(() => {
        if (role === "admin") navigate("/admin/dashboard", { replace: true });
        else if (role === "doctor") navigate("/doctor/dashboard", { replace: true });
        else navigate("/patient/dashboard", { replace: true });
      }, 100);
    } else {
      const errorMsg = result.error?.message || result.error?.toString() || "Failed to sign in";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#CCFBF1] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#0D9488]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0EA5E9]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-[#F43F5E]/3 rounded-full blur-3xl" />

      {[
        { Icon: Heart, x: "15%", y: "20%" },
        { Icon: Activity, x: "80%", y: "15%" },
        { Icon: Eye, x: "70%", y: "75%" },
      ].map(({ Icon, x, y }, i) => (
        <div key={i} className="absolute pointer-events-none opacity-[0.06]" style={{ left: x, top: y }}>
          <Icon className="w-10 h-10 text-[#0D9488]" />
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 shadow-2xl backdrop-blur-sm bg-white/80 border border-white/50">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Eye className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1 className="text-3xl font-bold text-[#0F172A]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              {t('auth.login.patient_title', 'Patient Login')}
            </motion.h1>
            <motion.p className="text-[#64748B] mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              {t('auth.login.patient_subtitle', 'Sign in to your Netra AI account')}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Label htmlFor="email">{t('auth.login.email', 'Email Address')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register("email")}
                  className={`pl-11 focus:ring-2 focus:ring-[#0D9488]/30 transition-shadow ${errors.email ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
            </motion.div>

            <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <Label htmlFor="password">{t('auth.login.password', 'Password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className={`pl-11 pr-11 focus:ring-2 focus:ring-[#0D9488]/30 transition-shadow ${errors.password ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0D9488] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white py-6 text-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                disabled={loading || isSubmitting}
              >
                {loading || isSubmitting ? t('auth.login.signing_in', 'Signing in...') : t('auth.login.login_button', 'Login')}
              </Button>
            </motion.div>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E2E8F0]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 px-2 text-[#64748B]">
                {t("auth.login.or_continue_with", "Or continue with")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full py-6 border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all flex items-center justify-center gap-3"
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
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-medium text-[#1E293B]">Google</span>
          </Button>

          <motion.div className="mt-6 text-center space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <p className="text-sm text-[#64748B]">
              {t('auth.login.no_account', "Don't have an account?")}{" "}
              <Link to="/signup/patient" className="text-[#0D9488] font-semibold hover:underline">
                {t('auth.signup.create_account', 'Create Account')}
              </Link>
            </p>
            <p className="text-sm text-[#64748B]">
              {t('auth.login.are_doctor', 'Are you a doctor?')}{" "}
              <Link to="/login/doctor" className="text-[#0EA5E9] font-semibold hover:underline">
                {t('auth.login.doctor_login', 'Doctor Login')}
              </Link>
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
