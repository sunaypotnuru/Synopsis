import { useNavigate } from "react-router";
import { HeroStoryAnimation } from "@/components/layout/HeroStoryAnimation";
import { HowItWorks } from "@/components/layout/HowItWorks";
import { AboutSection } from "@/components/layout/AboutSection";
import { ContactSection } from "@/components/layout/ContactSection";
import { ReviewSection } from "@/components/layout/ReviewSection";
import { Eye, Video, Globe, Stethoscope, Calendar, Shield, MapPin, FileText, MessageCircle, Send, Trophy, Users, PenTool, PhoneCall, Languages } from "lucide-react";
import { useInView } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "../../lib/store";
import { useTranslation } from "../../lib/i18n";
import { ScrollReveal, StaggerContainer } from "@/animations";
import { AnimatedCard, CardContent } from "@/components/ui/animated";
import "../../components/layout/hero-animations.css";

const Counter = ({ from = 0, to, duration = 2 }: { from?: number, to: number, duration?: number }) => {
  const [count, setCount] = useState(from);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const start = from;
    const end = to;
    const increment = (end - start) / (duration * 60);
    let current = start;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, from, to, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // AI Models Section
  const aiModels = [
    { 
      icon: Eye, 
      title: t("home.ai_models.anemia_title", "AI Anemia Detection"), 
      description: t("home.ai_models.anemia_desc", "Non-invasive screening from conjunctival images"), 
      accuracy: "90%",
      status: "deployed",
      color: "#0D9488" 
    },
    { 
      icon: Eye, 
      title: t("home.ai_models.dr_title", "Diabetic Retinopathy Detection"), 
      description: t("home.ai_models.dr_desc", "Automated DR screening and severity grading"), 
      accuracy: "95%",
      status: "training",
      color: "#3B82F6" 
    },
    { 
      icon: Eye, 
      title: t("home.ai_models.cataract_title", "Cataract Detection"), 
      description: t("home.ai_models.cataract_desc", "Early cataract identification from eye images"), 
      accuracy: "95%",
      status: "training",
      color: "#8B5CF6" 
    },
    { 
      icon: PhoneCall, 
      title: t("home.ai_models.parkinsons_title", "Parkinson's Voice Analysis"), 
      description: t("home.ai_models.parkinsons_desc", "Voice tremor analysis for Parkinson's screening"), 
      accuracy: "85-92%",
      status: "training",
      color: "#EC4899" 
    },
  ];

  const features = [
    { icon: Eye, title: t("home.feature1_title", "AI-Powered Anemia Detection"), description: t("home.feature1_desc", "Advanced conjunctiva analysis using AI to detect pallor — a key indicator of anemia"), color: "#0D9488" },
    { icon: MessageCircle, title: t("home.feature2_title", "AI Medical Chatbot"), description: t("home.feature2_desc", "24/7 conversational AI for symptom guidance and health questions"), color: "#14B8A6" },
    { icon: Send, title: t("home.feature3_title", "Smart Messaging"), description: t("home.feature3_desc", "Real-time chat with read receipts, file sharing, and emoji reactions"), color: "#0EA5E9" },
    { icon: Stethoscope, title: t("home.feature4_title", "Find Expert Doctors"), description: t("home.feature4_desc", "Connect with certified hematologists and specialists for professional care"), color: "#3B82F6" },
    { icon: Trophy, title: t("home.feature5_title", "Health Achievements"), description: t("home.feature5_desc", "Gamified health tracking – earn badges and XP for staying healthy"), color: "#F59E0B" },
    { icon: Users, title: t("home.feature6_title", "Referral Program"), description: t("home.feature6_desc", "Invite friends and family, earn rewards for every successful referral"), color: "#F97316" },
    { icon: PenTool, title: t("home.feature7_title", "AI Consultation Scribe"), description: t("home.feature7_desc", "Automatically generate structured SOAP notes from doctor consultations"), color: "#8B5CF6" },
    { icon: Video, title: t("home.feature8_title", "Smart Video Consultations"), description: t("home.feature8_desc", "AI-assisted video calls with automated note-taking and summaries"), color: "#D946EF" },
    { icon: Globe, title: t("home.feature9_title", "Real-time Translation"), description: t("home.feature9_desc", "Break language barriers — speak your language, doctor hears theirs"), color: "#EC4899" },
    { icon: Calendar, title: t("home.feature10_title", "Easy Booking"), description: t("home.feature10_desc", "Book consultations with preset time slots that fit your schedule"), color: "#F43F5E" },
    { icon: MapPin, title: t("home.feature11_title", "Nearby Hospitals"), description: t("home.feature11_desc", "Find physical consultation centers and diagnostic labs near you"), color: "#22C55E" },
    { icon: FileText, title: t("home.feature12_title", "Medical Records"), description: t("home.feature12_desc", "Unified health history — past scans, prescriptions, and consultation summaries"), color: "#10B981" },
    { icon: Shield, title: t("home.feature13_title", "Secure & Private"), description: t("home.feature13_desc", "End-to-end encrypted platform with full data privacy compliance"), color: "#6366F1" },
    { icon: PhoneCall, title: t("home.feature14_title", "Proactive Nurse Agent"), description: t("home.feature14_desc", "Autonomous AI voice calls to track your daily medication and vitals"), color: "#0D9488" },
    { icon: Languages, title: t("home.feature15_title", "Cross-lingual Voice AI"), description: t("home.feature15_desc", "Dynamic language adaptation for seamless conversational interactions"), color: "#EC4899" },
    { icon: FileText, title: t("home.feature16_title", "Chronic Disease Tracker"), description: t("home.feature16_desc", "Monitor vitals, track trends, and manage multiple chronic conditions"), color: "#10B981" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroStoryAnimation />

      {/* Statistics Section */}
      <section className="py-16 bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2"><Counter to={16} /></div>
              <div className="text-teal-100 text-sm uppercase tracking-wide">Features</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2"><Counter to={4} /></div>
              <div className="text-teal-100 text-sm uppercase tracking-wide">AI Models</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2"><Counter to={6} /></div>
              <div className="text-teal-100 text-sm uppercase tracking-wide">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2"><Counter to={90} />%</div>
              <div className="text-teal-100 text-sm uppercase tracking-wide">AI Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Models Showcase */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-[#0D9488] dark:text-teal-400 uppercase tracking-widest">AI-Powered Diagnostics</span>
              <h2 className="text-4xl font-bold text-[#0F172A] dark:text-white mt-2 mb-4">
                Advanced Medical AI Models
              </h2>
              <p className="text-lg text-[#64748B] dark:text-gray-300 max-w-2xl mx-auto">
                State-of-the-art deep learning models trained on thousands of medical images for accurate disease detection
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer stagger="normal" direction="up" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiModels.map((model) => (
              <AnimatedCard
                key={model.title}
                hoverable
                className="p-6 shadow-lg border border-gray-100 dark:border-gray-700"
              >
                <CardContent className="p-0">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${model.color}15` }}
                  >
                    <model.icon className="w-8 h-8" style={{ color: model.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A] dark:text-white mb-2">{model.title}</h3>
                  <p className="text-sm text-[#64748B] dark:text-gray-300 mb-4">{model.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold" style={{ color: model.color }}>{model.accuracy}</div>
                    {model.status === "deployed" ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs font-semibold rounded-full">
                        Deployed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs font-semibold rounded-full">
                        Training
                      </span>
                    )}
                  </div>
                </CardContent>
              </AnimatedCard>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white dark:bg-gray-900 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-[#0D9488] dark:text-teal-400 uppercase tracking-widest">{t("home.features", "Features")}</span>
              <h2 className="text-4xl font-bold text-[#0F172A] dark:text-white mt-2 mb-4">
                {t("home.features_title", "End-to-End Healthcare Platform")}
              </h2>
              <p className="text-lg text-[#64748B] dark:text-gray-300 max-w-2xl mx-auto">
                {t("home.features_subtitle", "From AI-powered screening to multilingual video consultations — everything you need in one place")}
              </p>
            </div>
          </ScrollReveal>

          <StaggerContainer stagger="fast" direction="up" className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature) => (
              <AnimatedCard
                key={feature.title}
                hoverable
                className="p-6 h-full group relative overflow-hidden cursor-pointer"
              >
                {/* Hover gradient overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]"
                  style={{ background: `linear-gradient(135deg, ${feature.color}08, ${feature.color}03)` }}
                />
                <CardContent className="relative z-10 p-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300"
                    style={{ backgroundColor: `${feature.color}12` }}
                  >
                    <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A] dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#64748B] dark:text-gray-300 leading-relaxed">{feature.description}</p>
                </CardContent>
              </AnimatedCard>
            ))}
          </StaggerContainer>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="text-center mt-16">
              <Button
                size="lg"
                onClick={() => navigate(user ? "/patient/dashboard" : "/signup")}
                className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white px-12 py-6 text-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group"
              >
                <span className="relative z-10">{user ? t("common.dashboard", "Go to Dashboard") : t("home.get_started", "Get Started Free")}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* About */}
      <AboutSection />

      {/* Review Section */}
      <ReviewSection />

      {/* Contact */}
      <ContactSection />
    </div>
  );
}
