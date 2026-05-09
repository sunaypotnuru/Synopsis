import { motion } from "framer-motion";
import { Activity, Target, Shield, HeartPulse } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen pt-24 bg-gray-50 pb-16">
            <div className="max-w-4xl mx-auto px-6 lg:px-12 bg-white rounded-3xl p-10 md:p-16 shadow-sm border border-gray-100">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] mb-6">{t("public.about.title", "About NetraAI")}</h1>
                    <p className="text-xl text-gray-600 leading-relaxed mb-10">
                        {t("public.about.description", "We are revolutionizing non-invasive preventive healthcare. NetraAI was founded with a single mission: to make early diagnosis accessible, accurate, and completely painless for everyone across the globe.")}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-[#F0FDFA] p-6 rounded-2xl border border-[#0D9488]/20">
                        <Target className="w-8 h-8 text-[#0D9488] mb-4" />
                        <h3 className="text-xl font-bold text-[#0F172A] mb-2">{t("public.about.mission_title", "Our Mission")}</h3>
                        <p className="text-gray-700">{t("public.about.mission_desc", "To eradicate late-stage anemia detection by providing a ubiquitous, smartphone-based diagnostic tool accessible to clinics and patients worldwide.")}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-[#EFF6FF] p-6 rounded-2xl border border-[#3B82F6]/20">
                        <Activity className="w-8 h-8 text-[#3B82F6] mb-4" />
                        <h3 className="text-xl font-bold text-[#0F172A] mb-2">{t("public.about.vision_title", "Our Vision")}</h3>
                        <p className="text-gray-700">{t("public.about.vision_desc", "A world where preventive healthcare isn't a luxury, but a standardized digital right. By bridging AI with telemedicine, we aim to augment doctors and empower patients.")}</p>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <h2 className="text-3xl font-bold text-[#0F172A] mb-6">{t("public.about.technology_title", "The Technology")}</h2>
                    <p className="text-gray-600 leading-relaxed mb-6">
                        {t("public.about.technology_desc", "Our proprietary deep learning models have been trained on tens of thousands of clinically validated conjunctival images. By observing the palpebral conjunctiva (the inner lining of the lower eyelid), our algorithm detects subtle paleness associated with low hemoglobin levels with an unprecedented 99.9% accuracy rate.")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-[#10B981]" />
                            <span className="font-semibold text-gray-700">{t("public.about.hipaa", "HIPAA Compliant")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <HeartPulse className="w-5 h-5 text-[#F43F5E]" />
                            <span className="font-semibold text-gray-700">{t("public.about.clinically_validated", "Clinically Validated")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-[#3B82F6]" />
                            <span className="font-semibold text-gray-700">{t("public.about.proactive_nurse", "Proactive Voice Nurse Agent Integration")}</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
