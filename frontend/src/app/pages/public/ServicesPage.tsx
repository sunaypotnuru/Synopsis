import { motion } from "motion/react";
import { Eye, Brain, Mic, Stethoscope, MessageSquare, MapPin, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

export default function ServicesPage() {
  const { t } = useTranslation();

  const services = [
    {
      icon: Eye,
      title: t('services.anemia.title', 'Anemia Detection'),
      description: t('services.anemia.desc', 'AI-powered anemia screening using conjunctiva analysis. Non-invasive, instant results with 90%+ accuracy.'),
      features: [
        t('services.anemia.f1', 'Instant screening via smartphone camera'),
        t('services.anemia.f2', 'No blood test required'),
        t('services.anemia.f3', 'Hemoglobin level estimation'),
        t('services.anemia.f4', 'Severity classification')
      ],
      color: 'from-red-500 to-pink-600'
    },
    {
      icon: Eye,
      title: t('services.cataract.title', 'Cataract Screening'),
      description: t('services.cataract.desc', 'Early detection of cataracts through eye image analysis. Helps prevent vision loss with timely intervention.'),
      features: [
        t('services.cataract.f1', 'Lens opacity detection'),
        t('services.cataract.f2', 'Severity grading'),
        t('services.cataract.f3', 'Treatment recommendations'),
        t('services.cataract.f4', 'Progress tracking')
      ],
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Eye,
      title: t('services.retinopathy.title', 'Diabetic Retinopathy'),
      description: t('services.retinopathy.desc', 'Advanced retinal image analysis for diabetic patients. Early detection prevents blindness.'),
      features: [
        t('services.retinopathy.f1', 'Retinal lesion detection'),
        t('services.retinopathy.f2', '5-stage classification'),
        t('services.retinopathy.f3', 'Risk assessment'),
        t('services.retinopathy.f4', 'Referral recommendations')
      ],
      color: 'from-purple-500 to-indigo-600'
    },
    {
      icon: Mic,
      title: t('services.parkinsons.title', 'Parkinson\'s Voice Analysis'),
      description: t('services.parkinsons.desc', 'Voice-based screening for Parkinson\'s disease. Detects early motor symptoms through speech patterns.'),
      features: [
        t('services.parkinsons.f1', 'Voice tremor analysis'),
        t('services.parkinsons.f2', 'Speech pattern recognition'),
        t('services.parkinsons.f3', 'Early symptom detection'),
        t('services.parkinsons.f4', 'Progress monitoring')
      ],
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Brain,
      title: t('services.mental_health.title', 'Mental Health Screening'),
      description: t('services.mental_health.desc', 'Comprehensive mental health assessment using facial emotion analysis and questionnaires.'),
      features: [
        t('services.mental_health.f1', 'Emotion detection'),
        t('services.mental_health.f2', 'Depression screening'),
        t('services.mental_health.f3', 'Anxiety assessment'),
        t('services.mental_health.f4', 'Personalized support')
      ],
      color: 'from-yellow-500 to-orange-600'
    },
    {
      icon: MessageSquare,
      title: t('services.chatbot.title', 'AI Health Assistant'),
      description: t('services.chatbot.desc', '24/7 AI-powered health chatbot for symptom checking, health advice, and mental health support.'),
      features: [
        t('services.chatbot.f1', 'Symptom analysis'),
        t('services.chatbot.f2', 'Health recommendations'),
        t('services.chatbot.f3', 'Mental health support'),
        t('services.chatbot.f4', 'Medication reminders')
      ],
      color: 'from-teal-500 to-cyan-600'
    },
    {
      icon: Stethoscope,
      title: t('services.telemedicine.title', 'Telemedicine Consultations'),
      description: t('services.telemedicine.desc', 'Connect with licensed doctors via video calls. Get professional medical advice from home.'),
      features: [
        t('services.telemedicine.f1', 'HD video consultations'),
        t('services.telemedicine.f2', 'Digital prescriptions'),
        t('services.telemedicine.f3', 'Medical records sharing'),
        t('services.telemedicine.f4', 'Follow-up scheduling')
      ],
      color: 'from-indigo-500 to-purple-600'
    },
    {
      icon: MapPin,
      title: t('services.emergency.title', 'Emergency Services'),
      description: t('services.emergency.desc', 'Locate nearby hospitals, ambulances, and emergency services. Quick access in critical situations.'),
      features: [
        t('services.emergency.f1', 'Hospital locator'),
        t('services.emergency.f2', 'Ambulance services'),
        t('services.emergency.f3', 'Emergency hotlines'),
        t('services.emergency.f4', 'Real-time navigation')
      ],
      color: 'from-red-500 to-rose-600'
    },
    {
      icon: Activity,
      title: t('services.monitoring.title', 'Health Monitoring'),
      description: t('services.monitoring.desc', 'Track vital signs, medications, chronic conditions, and health trends over time.'),
      features: [
        t('services.monitoring.f1', 'Vital signs tracking'),
        t('services.monitoring.f2', 'Medication management'),
        t('services.monitoring.f3', 'Chronic disease tracking'),
        t('services.monitoring.f4', 'Health analytics')
      ],
      color: 'from-pink-500 to-red-600'
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            {t('services.title', 'Our Services')}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t('services.subtitle', 'Comprehensive AI-powered healthcare solutions for early disease detection, telemedicine, and health monitoring')}
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full p-6 hover:shadow-xl transition-shadow">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16"
        >
          <Card className="p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t('services.cta.title', 'Ready to Get Started?')}
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {t('services.cta.subtitle', 'Join thousands of users who trust Netra AI for their healthcare needs')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/signup"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
              >
                {t('services.cta.signup', 'Sign Up Free')}
              </a>
              <a
                href="/contact"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
              >
                {t('services.cta.contact', 'Contact Sales')}
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

