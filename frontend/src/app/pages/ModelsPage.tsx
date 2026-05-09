import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Eye, Scan, Mic, Brain, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "../../lib/i18n";
import Breadcrumb from "@/components/shared/Breadcrumb";

export default function ModelsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const models = [
    {
      id: "anemia",
      label: t("models.anemia.title", "Anemia Detection"),
      description: t("models.anemia.desc", "AI-powered conjunctival pallor analysis for non-invasive anemia screening"),
      icon: Eye,
      path: "/patient/scan",
      color: "#0D9488",
      bg: "#F0FDFA",
      status: "primary",
      accuracy: "90%"
    },
    {
      id: "cataract",
      label: t("models.cataract.title", "Cataract Scan"),
      description: t("models.cataract.desc", "AI ocular density check for early cataract detection"),
      icon: Eye,
      path: "/patient/cataract-scan",
      color: "#8B5CF6",
      bg: "#FAF5FF",
      status: "active",
      accuracy: "95%"
    },
    {
      id: "retinopathy",
      label: t("models.retinopathy.title", "Retinopathy Scan"),
      description: t("models.retinopathy.desc", "Diabetic retinal analysis with severity grading"),
      icon: Scan,
      path: "/patient/dr-scan",
      color: "#3B82F6",
      bg: "#EEF2FF",
      status: "active",
      accuracy: "95%"
    },
    {
      id: "mental-health",
      label: t("models.mental_health.title", "Mental Health"),
      description: t("models.mental_health.desc", "AI-powered voice analysis for mental health assessment"),
      icon: Brain,
      path: "/patient/mental-health",
      color: "#EC4899",
      bg: "#FDF2F8",
      status: "active",
      accuracy: "88%"
    },
    {
      id: "parkinsons",
      label: t("models.parkinsons.title", "Parkinson's Voice"),
      description: t("models.parkinsons.desc", "Acoustic tremor mapping for Parkinson's screening"),
      icon: Mic,
      path: "/patient/parkinsons-voice",
      color: "#F59E0B",
      bg: "#FFFBEB",
      status: "active",
      accuracy: "85-92%"
    }
  ];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Breadcrumb */}
        <Breadcrumb />
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#0D9488]/20 shadow-sm">
            <Activity className="w-4 h-4 text-[#0D9488]" />
            <span className="text-sm font-semibold text-[#0F172A]">
              {t("models.badge", "AI Diagnostic Models")}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-[#0F172A] mb-4">
            {t("models.title", "Universal AI Medical Diagnostics")}
          </h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            {t("models.subtitle", "Choose from our suite of AI-powered diagnostic tools for comprehensive health screening")}
          </p>
        </motion.div>

        {/* Models Grid - 3 columns responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model, index) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                onClick={() => navigate(model.path)}
                className="p-6 cursor-pointer border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col"
              >
                {/* Icon */}
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: model.bg }}
                >
                  <model.icon className="w-8 h-8" style={{ color: model.color }} />
                </div>

                {/* Status Badge */}
                {model.status === "primary" && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 self-start"
                    style={{ backgroundColor: `${model.color}20`, color: model.color }}>
                    ⭐ {t("models.status.primary", "Primary")}
                  </span>
                )}

                {/* Title */}
                <h3 className="font-bold text-[#0F172A] text-xl leading-tight mb-2">
                  {model.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-[#64748B] leading-relaxed mb-4 flex-1">
                  {model.description}
                </p>

                {/* Accuracy Badge */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-[#64748B]">{t("models.accuracy", "Accuracy")}</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: model.color }}>
                    {model.accuracy}
                  </span>
                </div>

                {/* Hover indicator */}
                <div 
                  className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: model.color }}
                >
                  <span>{t("models.start_scan", "Start Scan")}</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 bg-gradient-to-r from-[#0D9488]/10 to-[#0EA5E9]/10 rounded-2xl border border-[#0D9488]/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#0F172A] mb-2">
                {t("models.info.title", "How It Works")}
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {t("models.info.desc", "Each AI model has been trained on thousands of medical images and validated by healthcare professionals. Simply select a diagnostic tool, follow the on-screen instructions, and receive instant results with confidence scores. All scans are saved to your medical history for tracking and sharing with your doctor.")}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
