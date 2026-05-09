import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicyPage() {
    const { t } = useTranslation();
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen pt-24 bg-gray-50 pb-16"
        >
            <div className="max-w-4xl mx-auto px-6 lg:px-12 bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
                <h1 className="text-4xl font-bold text-[#0F172A] mb-8 border-b pb-6">{t("public.privacy.title", "Privacy Policy & Patient Rights")}</h1>
                <div className="prose prose-lg max-w-none text-gray-600 prose-headings:text-[#0F172A] prose-a:text-[#0D9488]">
                    <p className="lead">{t("public.privacy.last_updated", "Last updated: March 2026")}</p>
                    <p>{t("public.privacy.intro", "At NetraAI, we are committed to protecting the privacy and security of your health information. This Privacy Policy describes how we collect, use, disclose, and safeguard your medical data when you use the NetraAI platform.")}</p>

                    <h2>{t("public.privacy.h1", "1. HIPAA Compliance")}</h2>
                    <p>{t("public.privacy.p1", "Our platform handles Electronic Protected Health Information (ePHI) in strict adherence to the Health Insurance Portability and Accountability Act (HIPAA) of 1996. All conjunctiva images, AI predictions, and doctor consultation notes are fully encrypted at rest (AES-256) and in transit (TLS 1.3).")}</p>

                    <h2>{t("public.privacy.h2", "2. Data Collection")}</h2>
                    <ul>
                        <li><strong>{t("public.privacy.d1_title", "Medical Data:")}</strong> {t("public.privacy.d1_desc", "Eye images uploaded for anemia screening, and resulting AI diagnostic predictions.")}</li>
                        <li><strong>{t("public.privacy.d2_title", "Personal Info:")}</strong> {t("public.privacy.d2_desc", "Demographics collected during registration.")}</li>
                        <li><strong>{t("public.privacy.d3_title", "Communication Data:")}</strong> {t("public.privacy.d3_desc", "Chat logs, video consultation meta-data, and AI Scribe audio-transcriptions (which are temporarily processed and not retained past clinical note generation).")}</li>
                    </ul>

                    <h2>{t("public.privacy.h3", "3. How We Use Information")}</h2>
                    <p>{t("public.privacy.p3", "We use the information we collect to provide, maintain, and improve our services, including:")}</p>
                    <ul>
                        <li>{t("public.privacy.u1", "Facilitating AI predictions for hemoglobin deficiency.")}</li>
                        <li>{t("public.privacy.u2", "Storing patient histories for assigned physicians.")}</li>
                        <li>{t("public.privacy.u3", "Anonymized aggregate training to improve future ML models (only if explicit patient consent is provided in dashboard settings).")}</li>
                    </ul>

                    <h2>{t("public.privacy.h4", "4. Your Patient Rights")}</h2>
                    <p>{t("public.privacy.p4", "You reserve the right to demand complete deletion of your records from our servers, subject to local medical retention laws. To instigate a data erasure request, contact us at ")}<code>privacy@netraai.com</code>.</p>
                </div>
            </div>
        </motion.div>
    );
}
