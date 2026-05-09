import { Upload, Activity, Heart, Shield, Eye, Stethoscope, Brain, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useAuthStore } from "@/lib/store";
import "./hero-animations.css";

const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayText('');
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayText(text.slice(0, indexRef.current));
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayText;
};

export function HeroStoryAnimation() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const headlineOriginal = t('home.title', 'Universal AI Medical Diagnostics');
  const headline = useTypewriter(headlineOriginal, 70);

  const getDashboardPath = () => {
    if (!user) return "/login";
    switch (user.role) {
      case 'admin': return "/admin/dashboard";
      case 'doctor': return "/doctor/dashboard";
      default: return "/patient/dashboard";
    }
  };

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0F9FF]">
      {/* CSS-animated floating decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="hero-float-1 absolute w-16 h-16 rounded-full bg-[#0D9488]/5 top-[15%] left-[10%]" />
        <div className="hero-float-2 absolute w-24 h-24 rounded-full bg-[#0EA5E9]/5 top-[60%] right-[8%]" />
        <div className="hero-float-3 absolute w-12 h-12 rounded-full bg-[#8B5CF6]/5 top-[30%] right-[25%]" />
        <Heart className="hero-float-1 absolute w-8 h-8 text-[#F43F5E]/10 top-[20%] right-[15%]" />
        <Activity className="hero-float-2 absolute w-8 h-8 text-[#0D9488]/10 bottom-[25%] left-[15%]" />
      </div>

      {/* Navbar spacing */}
      <div className="h-20" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(85vh-160px)]">
          {/* Left Content with fade-in */}
          <div className="z-10 hero-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0D9488]/20 shadow-sm hero-slide-up" style={{ animationDelay: '0.1s' }}>
              <Activity className="w-4 h-4 text-[#0D9488]" />
              <span className="text-sm font-semibold text-[#0F172A]">
                {t('home.hero_badge', 'AI-Powered Medical Technology')}
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight text-[#0F172A] hero-slide-up" style={{ animationDelay: '0.2s', minHeight: '140px' }}>
              {headline}
              <span className="animate-pulse font-light">|</span>
              <br />
              <span className="bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] bg-clip-text text-transparent">
                {t('home.hero_beyond', '& Beyond')}
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-lg lg:text-xl mb-8 text-[#0F172A]/70 leading-relaxed max-w-lg hero-slide-up" style={{ animationDelay: '0.3s' }}>
              {t('home.hero_subtitle', 'A unified AI suite for clinical-grade vision and vocal biomarkers.')}
            </p>

            {/* Buttons & Glowing Orb */}
            <div className="relative flex flex-wrap gap-4 hero-slide-up" style={{ animationDelay: '0.4s' }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-[#0D9488] rounded-full blur-3xl -z-10"
              />
              {user ? (
                <Button
                  size="lg"
                  onClick={() => navigate(getDashboardPath())}
                  className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white font-semibold px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.05]"
                >
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  {t('common.go_to_dashboard', 'Go to Dashboard')}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/login")}
                    className="bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white font-semibold px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.05]"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {t('home.start_screening', 'Start Screening')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/login")}
                    className="border-2 border-[#0D9488]/30 text-[#0D9488] px-8 py-6 text-lg hover:bg-[#0D9488]/5 transition-all duration-300"
                  >
                    <Stethoscope className="w-5 h-5 mr-2" />
                    {t('home.doctor_login', 'Doctor Login')}
                  </Button>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 mt-10 hero-slide-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Shield className="w-4 h-4 text-[#0D9488]" />
                {t('home.hipaa', 'HIPAA Compliant')}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Brain className="w-4 h-4 text-[#0EA5E9]" />
                {t('home.ai_powered', 'AI-Powered')}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Heart className="w-4 h-4 text-[#F43F5E]" />
                {t('home.scans_done_value', '50K+')} {t('home.scans_done', 'Scans Done')}
              </div>
            </div>
          </div>

          {/* Right - Interactive Visual Card */}
          <div className="relative hidden lg:block hero-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main card */}
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 relative overflow-hidden">
                {/* Decorative gradient corner */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#0D9488]/10 to-transparent rounded-bl-full" />

                {/* Eye icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0F766E] flex items-center justify-center shadow-lg hero-pulse">
                    <Eye className="w-12 h-12 text-white" />
                  </div>
                </div>

                {/* Scanning indicator */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-[#0D9488] mb-1">98.5%</div>
                  <div className="text-sm text-[#64748B]">Detection Accuracy</div>
                  {/* Animated progress bar */}
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0D9488] to-[#0EA5E9] rounded-full hero-progress" />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-2xl bg-[#F0FDFA] hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-[#0F172A]">50K+</div>
                    <div className="text-xs text-[#64748B]">Scans Done</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-[#F0F9FF] hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-[#0F172A]">200+</div>
                    <div className="text-xs text-[#64748B]">Doctors</div>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-[#FFF1F2] hover:shadow-md transition-shadow">
                    <div className="text-2xl font-bold text-[#0F172A]">99.9%</div>
                    <div className="text-xs text-[#64748B]">Uptime</div>
                  </div>
                </div>

                {/* Recent scan indicator */}
                <div className="mt-6 flex items-center gap-3 bg-[#F8FAFC] rounded-2xl p-4">
                  <div className="w-3 h-3 rounded-full bg-[#22C55E] hero-blink" />
                  <span className="text-sm text-[#64748B]">Live — Last scan 2 minutes ago</span>
                </div>
              </div>

              {/* Floating accent cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-3 border border-gray-100 hero-float-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#F43F5E]" />
                  <span className="text-sm font-semibold text-[#0F172A]">Live Analysis</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-3 border border-gray-100 hero-float-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0D9488]" />
                  <span className="text-sm font-semibold text-[#0F172A]">HIPAA Secure</span>
                </div>
              </div>

              {/* Background shadow card */}
              <div className="absolute -bottom-6 -right-6 w-full h-full bg-gradient-to-br from-[#0D9488]/10 to-[#0EA5E9]/10 rounded-3xl -z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
