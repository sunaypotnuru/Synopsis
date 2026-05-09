import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ArrowRight, Eye, Shield, Heart, Activity, Scan, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../lib/store";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signInWithGoogle, loading } = useAuthStore();

  const roles = [
    {
      id: "patient",
      title: t("auth.im_patient", "I'm a Patient"),
      description: t("auth.patient_desc", "Get AI screening, find doctors, and manage health records"),
      icon: Eye,
      color: "#0D9488",
      colorDark: "#0F766E",
      loginPath: "/login/patient",
      loginLabel: t("auth.patient_login", "Patient Login"),
    },
    {
      id: "doctor",
      title: t("auth.im_doctor", "I'm a Doctor"),
      description: t("auth.doctor_desc", "Manage availability, consult patients, and access AI scribes"),
      icon: Stethoscope,
      color: "#0EA5E9",
      colorDark: "#0284C7",
      loginPath: "/login/doctor",
      loginLabel: t("auth.doctor_login", "Doctor Login"),
    },
    {
      id: "admin",
      title: t("auth.administrator", "Administrator"),
      description: t("auth.admin_desc", "Manage platform, approve doctors, and view analytics"),
      icon: Shield,
      color: "#8B5CF6",
      colorDark: "#6D28D9",
      loginPath: "/login/admin",
      loginLabel: t("auth.admin_portal", "Admin Portal"),
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0F9FF] flex items-center justify-center relative overflow-hidden">
      {/* Floating background shapes - static CSS only for perf */}
      <div className="absolute top-16 left-16 w-80 h-80 bg-[#0D9488]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-16 right-16 w-96 h-96 bg-[#0EA5E9]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#F43F5E]/3 rounded-full blur-3xl" />

      {/* Floating icons - subtle fade only */}
      {[
        { Icon: Heart, x: "10%", y: "15%" },
        { Icon: Activity, x: "85%", y: "20%" },
        { Icon: Scan, x: "80%", y: "75%" },
        { Icon: Eye, x: "12%", y: "70%" },
      ].map(({ Icon, x, y }, i) => (
        <div key={i} className="absolute pointer-events-none opacity-[0.06]" style={{ left: x, top: y }}>
          <Icon className="w-12 h-12 text-[#0D9488]" />
        </div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 text-center max-w-3xl w-full"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-14 h-14 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-2xl flex items-center justify-center shadow-lg">
            <Eye className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-[#0F172A]">Netra AI</span>
        </motion.div>

        <motion.h1
          className="text-4xl lg:text-5xl font-bold text-[#0F172A] mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {t("auth.welcome", "Welcome")}
        </motion.h1>
        <motion.p
          className="text-lg text-[#64748B] mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {t("auth.choose_role", "Choose your role to continue")}
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card
                className="p-6 cursor-pointer group border-2 border-transparent hover:shadow-2xl transition-all duration-300 backdrop-blur-sm bg-white/80 relative overflow-hidden h-full"
                onClick={() => navigate(role.loginPath)}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]"
                  style={{ background: `linear-gradient(135deg, ${role.color}08, ${role.colorDark}05)` }}
                />

                <div className="relative z-10 flex flex-col h-full">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:shadow-2xl transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${role.color}, ${role.colorDark})` }}
                    whileHover={{ rotate: 5, scale: 1.05 }}
                  >
                    <role.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-[#0F172A] mb-2">{role.title}</h2>
                  <p className="text-sm text-[#64748B] mb-6 flex-grow">{role.description}</p>
                  <div
                    className="flex items-center justify-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
                    style={{ color: role.color }}
                  >
                    <span>{role.loginLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-4 flex flex-col items-center"
        >
          <div className="relative w-full max-w-sm my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E2E8F0]"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 px-2 text-[#64748B]">
                {t("auth.login.or_quick_access", "Or quick access")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full max-w-sm py-7 border-2 border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#0D9488]/30 transition-all flex items-center justify-center gap-4 group rounded-2xl shadow-sm hover:shadow-md"
            onClick={() => signInWithGoogle()}
            disabled={loading}
          >
            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-[#F1F5F9]">
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
            </div>
            <span className="font-semibold text-[#1E293B] text-lg">
              {t("auth.login.continue_google", "Continue with Google")}
            </span>
            <ArrowRight className="w-5 h-5 text-[#94A3B8] group-hover:text-[#0D9488] group-hover:translate-x-1 transition-all" />
          </Button>
        </motion.div>

        <motion.p
          className="text-sm text-[#64748B] mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {t("auth.no_account", "Don't have an account?")}{" "}
          <span
            className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/signup/patient")}
          >
            {t("auth.signup_patient", "Sign up as Patient")}
          </span>
          {" "}{t("common.or", "or")}{" "}
          <span
            className="text-[#0EA5E9] font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/signup/doctor")}
          >
            {t("auth.apply_doctor", "Apply as Doctor")}
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}
