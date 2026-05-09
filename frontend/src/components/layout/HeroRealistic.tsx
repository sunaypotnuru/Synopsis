import { motion } from "motion/react";
import { Upload, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/features/figma/ImageWithFallback";
import { useTranslation } from "react-i18next";

export function HeroRealistic() {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0D9488] via-[#0F766E] to-[#0EA5E9]">
      {/* Floating Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"
          animate={{
            y: [0, 30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"
          animate={{
            y: [0, -40, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30"
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('components.hero_realistic.aipowered_medical_technology', "AI-Powered Medical Technology")}</span>
            </motion.div>

            <motion.h1
              className="text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >{t('components.hero_realistic.aiassisted_anemia_detection_1', "AI-Assisted Anemia Detection")}</motion.h1>
            <motion.p
              className="text-lg lg:text-xl mb-8 text-white/90 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >{t('components.hero_realistic.advanced_medical_screening_using_2', "Advanced medical screening using conjunctiva analysis. Non-invasive, instant results powered by cutting-edge artificial intelligence.")}</motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="bg-white text-[#0D9488] hover:bg-white/90 font-semibold px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <Upload className="w-5 h-5 mr-2" />{t('components.hero_realistic.upload_image_3', "Upload Image")}</Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg"
              >{t('components.hero_realistic.learn_more_4', "Learn More")}</Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/20"
            >
              <div>
                <div className="text-3xl font-bold">95%</div>
                <div className="text-sm text-white/80">{t('components.hero_realistic.accuracy_5', "Accuracy")}</div>
              </div>
              <div>
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-sm text-white/80">{t('components.hero_realistic.patients_6', "Patients")}</div>
              </div>
              <div>
                <div className="text-3xl font-bold">&lt;5s</div>
                <div className="text-sm text-white/80">{t('components.hero_realistic.results_7', "Results")}</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Hospital Scene with Real Images */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative h-[600px]"
          >
            <HospitalScene />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HospitalScene() {
  const { t } = useTranslation();
  return (
    <div className="relative w-full h-full">
      {/* Main hospital scene container */}
      <div className="relative w-full h-full">
        {/* Frame 1 and Frame 2 animation container */}
        <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
          {/* Background hospital room */}
          <motion.div
            className="absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="relative w-full h-full bg-white/10 backdrop-blur-md rounded-3xl overflow-hidden border border-white/20">
              {/* Hospital room background image */}
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1567622153803-4526f47899d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3NwaXRhbCUyMHJvb20lMjBtZWRpY2FsJTIwZXF1aXBtZW50fGVufDF8fHx8MTc3MTQ5MDU4NXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Hospital room"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D9488]/30 to-[#0EA5E9]/30" />
            </div>
          </motion.div>

          {/* Doctor examining patient - Main scene */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative w-full max-w-lg">
              {/* Patient bed/examination area */}
              <motion.div
                className="absolute bottom-8 right-8 w-48 h-32 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-white/50"
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Patient representation */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                  <motion.div
                    className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl"
                    animate={{
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1666886573590-5815157da865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwcHJvZmVzc2lvbmFsJTIwaGVhbHRoY2FyZXxlbnwxfHx8fDE3NzE0OTA1ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="Patient"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
              </motion.div>

              {/* Doctor - Animated position */}
              <motion.div
                className="relative z-20"
                animate={{
                  x: [0, 60, 0],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <motion.div
                  className="relative"
                  animate={{
                    rotate: [0, -5, 0, 5, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {/* Doctor image - circular frame */}
                  <div className="relative w-64 h-64">
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border-4 border-white/70 overflow-hidden">
                      <ImageWithFallback
                        src="https://images.unsplash.com/photo-1739285452629-2672b13fa42d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBleGFtaW5pbmclMjBwYXRpZW50JTIwaG9zcGl0YWx8ZW58MXx8fHwxNzcxNDE5MjkwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                        alt="Doctor examining patient"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D9488]/20 to-transparent" />
                    </div>

                    {/* Medical badge */}
                    <motion.div
                      className="absolute top-4 right-4 w-12 h-12 bg-[#0D9488] rounded-full flex items-center justify-center shadow-lg"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Activity className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Stethoscope indicator */}
                <motion.div
                  className="absolute bottom-12 right-8"
                  animate={{
                    rotate: [0, 15, 0, -15, 0],
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-xl">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1655913197756-fbcf99b273cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGV0aG9zY29wZSUyMG1lZGljYWwlMjBjYXJlfGVufDF8fHx8MTc3MTQ5MDU4Nnww&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="Stethoscope"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Medical monitor - heartbeat display */}
              <motion.div
                className="absolute top-8 left-8 bg-[#0F172A] rounded-2xl p-4 shadow-xl border-2 border-[#0D9488]/50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-[#0D9488] rounded-full animate-pulse" />
                  <span className="text-xs text-white/80 font-semibold">{t('components.hero_realistic.live_monitoring_8', "Live Monitoring")}</span>
                </div>
                <svg width="120" height="50" viewBox="0 0 120 50" className="text-[#0D9488]">
                  <motion.path
                    d="M 0,25 L 15,25 L 20,15 L 25,35 L 30,20 L 35,25 L 120,25"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </svg>
                <div className="text-2xl font-bold text-[#0D9488]">72 BPM</div>
              </motion.div>

              {/* Medical cross floating */}
              <motion.div
                className="absolute bottom-32 left-12"
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 10, 0, -10, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center border-2 border-[#0D9488]/30">
                  <div className="relative w-8 h-8">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-8 bg-[#F43F5E] rounded-full" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-[#F43F5E] rounded-full" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-4 border-white/20 pointer-events-none z-30"
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
