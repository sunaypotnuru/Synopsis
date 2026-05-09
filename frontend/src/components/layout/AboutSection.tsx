import { Heart, Users, Award, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function AboutSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const { t } = useTranslation();

  const features = [
    { icon: Heart, title: t('home.about.features_non_invasive_title', "Non-Invasive"), description: t('home.about.features_non_invasive_desc', "No blood samples required. Simple eye image analysis provides quick screening."), color: "#F43F5E" },
    { icon: Zap, title: t('home.about.features_instant_title', "Instant Results"), description: t('home.about.features_instant_desc', "Get AI-powered analysis in under 5 seconds with high accuracy rates."), color: "#F39C12" },
    { icon: Users, title: t('home.about.features_accessible_title', "Accessible"), description: t('home.about.features_accessible_desc', "Available to anyone with a smartphone camera. Healthcare made accessible."), color: "#0EA5E9" },
    { icon: Award, title: t('home.about.features_accuracy_title', "99.9% Accuracy"), description: t('home.about.features_accuracy_desc', "Trained on thousands of images with medical professional validation."), color: "#0D9488" },
  ];

  const testimonials = [
    { name: "Sarah J.", role: t('home.about.role_patient', "Patient"), quote: t('home.about.testimonial_1', "The AI analysis is incredibly fast and accurate. It saved me a trip to the lab and the anxiety of waiting for results.") },
    { name: "Dr. Michael Chen", role: t('home.about.role_hematologist', "Hematologist"), quote: t('home.about.testimonial_2', "I use this platform daily. The AI acts as a fantastic second pair of eyes, and the consultation scribe saves me hours of charting.") },
    { name: "Priya M.", role: t('home.about.role_patient', "Patient"), quote: t('home.about.testimonial_3', "I was amazed at how simple it was to book a consultation and get my scan results. The interface is beautiful and so easy to use.") }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Text content */}
          <div>
            <span className="text-sm font-semibold text-[#0D9488] uppercase tracking-widest">{t('home.about.about', "About")}</span>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] mt-2 mb-6">
              {t('home.about.title', "About Anemia Detection")}
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              {t('home.about.desc1_start', "Anemia is a condition where you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues. It affects over")}{" "}
              <strong className="text-[#F43F5E]">{t('home.about.desc1_highlight', "1.62 billion people")}</strong>{" "}
              {t('home.about.desc1_end', "globally.")}
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              {t('home.about.desc2', "Our AI-powered detection system analyzes the conjunctiva (inner eyelid) to detect signs of anemia quickly and accurately, making early screening accessible to everyone.")}
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 group">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Stats visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-[#0D9488] to-[#0EA5E9] rounded-3xl p-12 shadow-2xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-8 right-8 w-16 h-16 bg-white/10 rounded-2xl" />
              <div className="absolute bottom-12 left-8 w-20 h-20 bg-white/10 rounded-2xl" />

              <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <div className="text-white text-center">
                  <div className="text-6xl font-bold mb-2">50K+</div>
                  <div className="text-lg mb-6 text-white/90">{t('home.about.stats_scans', "Successful Scans")}</div>
                  <div className="h-px bg-white/20 my-6" />
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="hover:scale-110 transition-transform">
                      <div className="text-3xl font-bold">99.9%</div>
                      <div className="text-xs text-white/80 mt-1">{t('home.about.stats_accuracy', "Accuracy")}</div>
                    </div>
                    <div className="hover:scale-110 transition-transform">
                      <div className="text-3xl font-bold">&lt;3s</div>
                      <div className="text-xs text-white/80 mt-1">{t('home.about.stats_speed', "Speed")}</div>
                    </div>
                    <div className="hover:scale-110 transition-transform">
                      <div className="text-3xl font-bold">24/7</div>
                      <div className="text-xs text-white/80 mt-1">{t('home.about.stats_available', "Available")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-full h-full bg-gradient-to-br from-[#0D9488]/15 to-[#0EA5E9]/15 rounded-3xl -z-10" />
          </motion.div>
        </div>

        <div className="mt-32 border-t border-gray-100 pt-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-[#0F172A]">{t('home.about.trusted_title', "Trusted by Patients & Doctors")}</h3>
          </div>
          <div className="max-w-4xl mx-auto bg-gray-50 rounded-3xl p-8 relative shadow-sm border border-gray-100">
            <div className="text-[#0D9488] flex justify-center mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
            </div>
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-xl italic text-gray-700 mb-6">"{testimonials[currentTestimonial].quote}"</p>
              <div>
                <div className="font-bold text-[#0F172A]">{testimonials[currentTestimonial].name}</div>
                <div className="text-sm text-gray-500">{testimonials[currentTestimonial].role}</div>
              </div>
            </motion.div>

            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentTestimonial ? 'bg-[#0D9488] w-6' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>

          {/* Partners Marquee */}
          <div className="mt-20 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="flex items-center gap-16 whitespace-nowrap opacity-50 grayscale"
            >
              {["Apollo Hospitals", "Fortis Healthcare", "Max Healthcare", "AIIMS", "LiveKit", "OpenAI", "Supabase", "Apollo Hospitals", "Fortis Healthcare", "Max Healthcare"].map((partner, i) => (
                <div key={i} className="text-2xl font-bold text-gray-400">{partner}</div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
