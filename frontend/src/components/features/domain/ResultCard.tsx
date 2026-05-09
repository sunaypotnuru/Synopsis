import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ResultCard() {
  const { t } = useTranslation();
  // Example result data
  const result = {
    status: "Mild Anemia Detected",
    severity: "Mild",
    confidence: 87,
    hemoglobin: "10.5 g/dL",
    recommendation: "Consult with a healthcare provider for further evaluation and treatment plan.",
  };

  return (
    <section className="py-20 bg-[#F8F9FA]">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">{t('components.result_card.analysis_results', "Analysis Results")}</h2>
          <p className="text-lg text-gray-600">{t('components.result_card.aipowered_detection_results_with_1', "AI-powered detection results with confidence score")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header with status */}
          <div className="bg-gradient-to-r from-[#F43F5E] to-[#C0392B] p-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-8 h-8" />
                  <h3 className="text-3xl font-bold">{result.status}</h3>
                </div>
                <p className="text-white/90">Severity Level: {result.severity}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{result.confidence}%</div>
                <div className="text-sm text-white/80">{t('components.result_card.confidence_2', "Confidence")}</div>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="px-8 py-6 bg-gradient-to-r from-[#F43F5E]/5 to-transparent">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">{t('components.result_card.confidence_level_3', "Confidence Level")}</span>
              <span className="font-semibold text-[#F43F5E]">{result.confidence}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${result.confidence}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-[#F43F5E] to-[#C0392B]"
              />
            </div>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            {/* Estimated Hemoglobin */}
            <div className="flex items-center justify-between p-6 bg-[#F8F9FA] rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0EA5E9]/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#0EA5E9]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('components.result_card.estimated_hemoglobin_level_4', "Estimated Hemoglobin Level")}</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{result.hemoglobin}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{t('components.result_card.normal_range_5', "Normal Range")}</p>
                <p className="text-sm font-semibold text-gray-700">12-16 g/dL</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-6 bg-[#0D9488]/10 rounded-2xl border-2 border-[#0D9488]/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#0D9488] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-[#0F172A] mb-2">{t('components.result_card.recommendation_6', "Recommendation")}</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-4 bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >{t('components.result_card.download_report_7', "Download Report")}</motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-4 bg-white border-2 border-[#0EA5E9] text-[#0EA5E9] rounded-xl font-semibold hover:bg-[#0EA5E9] hover:text-white transition-colors"
              >{t('components.result_card.book_consultation_8', "Book Consultation")}</motion.button>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl"
        >
          <p className="text-sm text-yellow-800 text-center">
            <strong>{t('components.result_card.disclaimer_9', "Disclaimer:")}</strong>{t('components.result_card.this_is_an_aipowered_10', "This is an AI-powered screening tool and should not replace professional medical diagnosis. Please consult with a qualified healthcare provider for accurate diagnosis and treatment.")}</p>
        </motion.div>
      </div>
    </section>
  );
}