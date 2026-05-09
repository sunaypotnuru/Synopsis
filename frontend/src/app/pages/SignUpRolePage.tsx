import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Eye, Stethoscope, ArrowRight, Heart, Activity, Scan } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SignUpRolePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const roles = [
    {
      id: "patient",
      title: t("auth.im_patient", "I'm a Patient"),
      description: t("auth.patient_desc", "Get AI screening, find doctors, and manage health records"),
      icon: Eye,
      color: "#0D9488",
      colorDark: "#0F766E",
      signupPath: "/signup/patient",
      signupLabel: t("auth.signup_patient", "Sign Up as Patient"),
    },
    {
      id: "doctor",
      title: t("auth.im_doctor", "I'm a Doctor"),
      description: t("auth.doctor_desc", "Manage availability, consult patients, and access AI scribes"),
      icon: Stethoscope,
      color: "#0EA5E9",
      colorDark: "#0284C7",
      signupPath: "/signup/doctor",
      signupLabel: t("auth.apply_doctor", "Apply as Doctor"),
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0F9FF] flex items-center justify-center relative overflow-hidden">
      {/* Floating background shapes */}
      <div className="absolute top-16 left-16 w-80 h-80 bg-[#0D9488]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-16 right-16 w-96 h-96 bg-[#0EA5E9]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#F43F5E]/3 rounded-full blur-3xl" />

      {/* Floating icons */}
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
          {t("auth.create_account", "Create Your Account")}
        </motion.h1>
        <motion.p
          className="text-lg text-[#64748B] mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {t("auth.choose_role_to_get_started", "Choose your role to get started")}
        </motion.p>

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card
                className="p-8 cursor-pointer group border-2 border-transparent hover:shadow-2xl transition-all duration-300 backdrop-blur-sm bg-white/80 relative overflow-hidden h-full"
                onClick={() => navigate(role.signupPath)}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]"
                  style={{ background: `linear-gradient(135deg, ${role.color}08, ${role.colorDark}05)` }}
                />

                <div className="relative z-10 flex flex-col h-full">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-2xl transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${role.color}, ${role.colorDark})` }}
                    whileHover={{ rotate: 5, scale: 1.05 }}
                  >
                    <role.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-3">{role.title}</h2>
                  <p className="text-base text-[#64748B] mb-8 flex-grow leading-relaxed">{role.description}</p>
                  <div
                    className="flex items-center justify-center gap-2 text-base font-semibold group-hover:gap-3 transition-all"
                    style={{ color: role.color }}
                  >
                    <span>{role.signupLabel}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-base text-[#64748B] mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {t("auth.already_have_account", "Already have an account?")}{" "}
          <span
            className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            {t("auth.sign_in_here", "Sign in here")}
          </span>
        </motion.p>
      </motion.div>
    </div>
  );
}
