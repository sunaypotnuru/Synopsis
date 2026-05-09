import { Upload, Brain, CheckCircle, Video } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function HowItWorks() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = [
    {
      icon: Upload,
      title: t('home.how_it_works.step1_title', "Upload Eye Image"),
      description: t('home.how_it_works.step1_desc', "Take a photo of the conjunctiva (inner eyelid) and upload it securely to our platform."),
      color: "#0D9488",
      step: "01",
    },
    {
      icon: Brain,
      title: t('home.how_it_works.step2_title', "AI Analysis"),
      description: t('home.how_it_works.step2_desc', "Our advanced machine learning model analyzes the image to detect signs of anemia."),
      color: "#0EA5E9",
      step: "02",
    },
    {
      icon: CheckCircle,
      title: t('home.how_it_works.step3_title', "Get Result Instantly"),
      description: t('home.how_it_works.step3_desc', "Receive accurate results within seconds with confidence scores and recommendations."),
      color: "#F43F5E",
      step: "03",
    },
    {
      icon: Video,
      title: t('home.how_it_works.step4_title', "Connect with Doctor"),
      description: t('home.how_it_works.step4_desc', "Book an instant video consultation with a specialist to discuss your results."),
      color: "#8B5CF6",
      step: "04",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-[#F8F9FA] to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-[#0D9488] dark:text-teal-400 uppercase tracking-widest">{t('home.how_it_works.process', "Process")}</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-white mt-2 mb-4">
            {t('home.how_it_works.title', "How It Works")}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('home.how_it_works.subtitle', "Get anemia screening results in three simple steps with our AI-powered detection system.")}
          </p>
        </div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Connection line */}
          <div className="hidden lg:block absolute top-20 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-[#0D9488]/30 via-[#0EA5E9]/30 to-[#8B5CF6]/30 dark:from-teal-400/30 dark:via-blue-400/30 dark:to-purple-400/30" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative cursor-pointer block h-full"
              onClick={() => navigate('/login/patient')}
            >
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 h-full relative overflow-hidden border border-gray-50 dark:border-gray-700 hover:-translate-y-2 group-hover:border-[#0D9488]/30 dark:group-hover:border-teal-400/30">
                {/* Background decoration */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 transition-opacity duration-300 group-hover:opacity-20"
                  style={{ backgroundColor: step.color }}
                />

                {/* Step number */}
                <div className="absolute top-6 right-6 text-6xl font-bold text-gray-200 dark:text-gray-700 group-hover:text-gray-300 dark:group-hover:text-gray-600 transition-colors z-10 group-hover:scale-110">
                  {step.step}
                </div>

                {/* Icon with hover effect */}
                <div className="relative mb-6 z-20">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <step.icon className="w-10 h-10 transition-all duration-300 group-hover:scale-110" style={{ color: step.color }} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-3 transition-colors duration-300" style={{ color: step.color }}>
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">{step.description}</p>

                {/* Subtle right arrow on hover */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 text-[#0D9488] dark:text-teal-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
