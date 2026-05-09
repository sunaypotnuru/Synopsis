import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, ChevronDown, Search, Users, Shield, CreditCard, Stethoscope, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = [
    { id: "all", name: t('faq.categories.all', 'All'), icon: HelpCircle },
    { id: "general", name: t('faq.categories.general', 'General'), icon: Users },
    { id: "medical", name: t('faq.categories.medical', 'Medical'), icon: Stethoscope },
    { id: "security", name: t('faq.categories.security', 'Security'), icon: Shield },
    { id: "billing", name: t('faq.categories.billing', 'Billing'), icon: CreditCard },
    { id: "technical", name: t('faq.categories.technical', 'Technical'), icon: Smartphone }
  ];

  const faqs: FAQ[] = [
    // General
    {
      category: "general",
      question: t('faq.general.q1', 'What is Netra AI?'),
      answer: t('faq.general.a1', 'Netra AI is an AI-powered healthcare platform that provides disease screening, telemedicine consultations, health monitoring, and personalized health insights. We combine advanced AI technology with professional medical expertise.')
    },
    {
      category: "general",
      question: t('faq.general.q2', 'Who can use Netra AI?'),
      answer: t('faq.general.a2', 'Netra AI is available for patients seeking healthcare services, doctors providing consultations, and healthcare administrators managing facilities. Each user type has a dedicated portal with specific features.')
    },
    {
      category: "general",
      question: t('faq.general.q3', 'Is Netra AI available in my language?'),
      answer: t('faq.general.a3', 'Yes! Netra AI supports 6 languages: English, Hindi, Telugu, Tamil, Kannada, and Marathi. You can switch languages anytime from the language selector.')
    },
    
    // Medical
    {
      category: "medical",
      question: t('faq.medical.q1', 'What diseases can Netra AI detect?'),
      answer: t('faq.medical.a1', 'Netra AI can screen for anemia, cataracts, diabetic retinopathy, Parkinson\'s disease (voice analysis), and mental health conditions. We continuously add new screening capabilities.')
    },
    {
      category: "medical",
      question: t('faq.medical.q2', 'Is AI diagnosis accurate?'),
      answer: t('faq.medical.a2', 'Our AI models achieve 85-95% accuracy and are trained on large medical datasets. However, AI screening is not a replacement for professional medical diagnosis. All results should be reviewed by qualified healthcare professionals.')
    },
    {
      category: "medical",
      question: t('faq.medical.q3', 'Can I consult a real doctor?'),
      answer: t('faq.medical.a3', 'Absolutely! Netra AI connects you with licensed doctors for video consultations. You can book appointments, share your AI screening results, and receive professional medical advice.')
    },
    {
      category: "medical",
      question: t('faq.medical.q4', 'How do I book an appointment?'),
      answer: t('faq.medical.a4', 'Navigate to the Doctors page, browse available doctors by specialty, select a doctor, choose an available time slot, and confirm your booking. You\'ll receive a confirmation and reminder.')
    },

    // Security
    {
      category: "security",
      question: t('faq.security.q1', 'Is my health data secure?'),
      answer: t('faq.security.a1', 'Yes. We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. We are HIPAA compliant and follow strict data protection regulations. Your data is never shared without your explicit consent.')
    },
    {
      category: "security",
      question: t('faq.security.q2', 'Who can access my medical records?'),
      answer: t('faq.security.a2', 'Only you and healthcare professionals you explicitly authorize can access your medical records. All access is logged and auditable. You can revoke access at any time.')
    },
    {
      category: "security",
      question: t('faq.security.q3', 'Do you sell my data?'),
      answer: t('faq.security.a3', 'Never. We do not sell, rent, or share your personal health information with third parties for marketing purposes. Your privacy is our top priority.')
    },

    // Billing
    {
      category: "billing",
      question: t('faq.billing.q1', 'Is Netra AI free?'),
      answer: t('faq.billing.a1', 'Basic AI screening features are free for patients. Doctor consultations have consultation fees set by individual doctors. Premium features and enterprise plans are available for healthcare facilities.')
    },
    {
      category: "billing",
      question: t('faq.billing.q2', 'What payment methods do you accept?'),
      answer: t('faq.billing.a2', 'We accept credit/debit cards, UPI, net banking, and digital wallets. All payments are processed securely through encrypted payment gateways.')
    },
    {
      category: "billing",
      question: t('faq.billing.q3', 'Can I get a refund?'),
      answer: t('faq.billing.a3', 'Refunds are available if you cancel an appointment at least 24 hours in advance. For other refund requests, please contact our support team.')
    },

    // Technical
    {
      category: "technical",
      question: t('faq.technical.q1', 'What devices are supported?'),
      answer: t('faq.technical.a1', 'Netra AI works on desktop computers, laptops, tablets, and smartphones. We support Chrome, Firefox, Safari, and Edge browsers. Our platform is also available as a Progressive Web App (PWA).')
    },
    {
      category: "technical",
      question: t('faq.technical.q2', 'Do I need to install anything?'),
      answer: t('faq.technical.a2', 'No installation required! Netra AI is a web-based platform accessible through your browser. You can optionally install it as a PWA for offline access and app-like experience.')
    },
    {
      category: "technical",
      question: t('faq.technical.q3', 'What if I have technical issues?'),
      answer: t('faq.technical.a3', 'Contact our support team through the Help Center, email support@netra-ai.com, or use the in-app chat. We provide 24/7 technical support.')
    },
    {
      category: "technical",
      question: t('faq.technical.q4', 'Can I use Netra AI offline?'),
      answer: t('faq.technical.a4', 'Some features work offline if you install the PWA. Your data syncs automatically when you reconnect to the internet.')
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {t('faq.title', 'Frequently Asked Questions')}
          </h1>
          <p className="text-lg text-slate-600">
            {t('faq.subtitle', 'Find answers to common questions about Netra AI')}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('faq.search_placeholder', 'Search questions...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* FAQs */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card className="p-12 text-center">
              <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                {t('faq.no_results', 'No questions found. Try a different search or category.')}
              </p>
            </Card>
          ) : (
            filteredFAQs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg font-semibold text-slate-900 pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 ${
                        openIndex === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {t('faq.still_have_questions', 'Still have questions?')}
            </h2>
            <p className="text-slate-700 mb-6">
              {t('faq.contact_support', 'Our support team is here to help you 24/7')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/contact"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t('faq.contact_us', 'Contact Us')}
              </a>
              <a
                href="/help-center"
                className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                {t('faq.help_center', 'Help Center')}
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

