import { motion } from "motion/react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0F172A]">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#0D9488]/20 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#3B82F6]/20 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-20 z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D9488] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0D9488]"></span>
              </span>
              <span className="text-sm font-medium text-white/80">Next-Gen Clinical AI Platform</span>
            </motion.div>

            <motion.h1
              className="text-5xl lg:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {t('home.title')}
            </motion.h1>
            
            <motion.p
              className="text-xl lg:text-2xl mb-10 text-white/60 leading-relaxed font-medium max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {t('home.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-wrap gap-5"
            >
              <Button
                size="lg"
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold px-10 py-7 text-xl rounded-2xl shadow-[0_20px_50px_rgba(13,148,136,0.3)] hover:shadow-[0_20px_50px_rgba(13,148,136,0.5)] transition-all duration-300 hover:scale-105 group"
              >
                <Upload className="w-6 h-6 mr-3 group-hover:animate-bounce" />
                {t('home.start_screening')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold px-10 py-7 text-xl rounded-2xl backdrop-blur-xl border-2 transition-all duration-300"
              >
                {t('home.about')}
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex items-center gap-8 mt-16 pt-10 border-t border-white/10"
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">Compliance</span>
                <div className="flex gap-4 items-center opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
                   <div className="text-xs font-black border-2 border-white px-2 py-0.5 rounded">FDA APM</div>
                   <div className="text-xs font-black border-2 border-white px-2 py-0.5 rounded">SOC 2</div>
                   <div className="text-xs font-black border-2 border-white px-2 py-0.5 rounded">HIPAA</div>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold">Interoperability</span>
                <div className="flex gap-4 items-center opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
                   <div className="text-xs font-black bg-white text-black px-2 py-0.5 rounded">FHIR R4</div>
                   <div className="text-xs font-black bg-white text-black px-2 py-0.5 rounded">MCP</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Animation / Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
            className="relative h-[600px] flex items-center justify-center"
          >
             {/* Glowing Orbit */}
             <div className="absolute inset-0 border-[1px] border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
             <div className="absolute inset-20 border-[1px] border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
             
            <div className="relative z-20 scale-110 lg:scale-125">
              <DoctorPatientAnimation />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DoctorPatientAnimation() {
  return (
    <div className="relative w-full h-full">
      {/* Patient - Sitting on bed */}
      <motion.div
        className="absolute right-20 bottom-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {/* Bed */}
        <div className="relative">
          <div className="w-32 h-24 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30" />
          {/* Patient sitting */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <div className="relative">
              {/* Head */}
              <motion.div
                className="w-12 h-12 bg-[#0F172A] rounded-full border-4 border-white shadow-lg"
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Body */}
              <div className="w-16 h-20 bg-[#0EA5E9] rounded-2xl mt-2 shadow-lg border-2 border-white/50" />
              {/* Arms */}
              <div className="absolute top-6 -left-4 w-12 h-4 bg-[#0EA5E9] rounded-full" />
              <div className="absolute top-6 -right-4 w-12 h-4 bg-[#0EA5E9] rounded-full" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Doctor - Walking and treating */}
      <motion.div
        className="absolute bottom-20 left-0"
        animate={{
          x: [0, 180],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          {/* Doctor figure */}
          <div className="relative">
            {/* Head */}
            <motion.div
              className="w-14 h-14 bg-white rounded-full shadow-xl border-4 border-[#0D9488]"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Body - White coat */}
            <div className="w-20 h-28 bg-white rounded-3xl mt-2 shadow-2xl border-2 border-[#0D9488]/30 relative">
              {/* Stethoscope */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-[#0D9488] rounded-full" />
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-1 h-4 bg-[#0D9488]" />
              
              {/* Medical bag */}
              <motion.div
                className="absolute -right-8 top-8 w-8 h-6 bg-[#F43F5E] rounded shadow-lg"
                animate={{
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            {/* Legs - Walking animation */}
            <div className="flex gap-2 mt-1 justify-center">
              <motion.div
                className="w-5 h-12 bg-[#0F172A] rounded-full shadow-lg"
                animate={{
                  rotate: [0, 20, 0, -20, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="w-5 h-12 bg-[#0F172A] rounded-full shadow-lg"
                animate={{
                  rotate: [0, -20, 0, 20, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Medical cross floating icon */}
      <motion.div
        className="absolute top-10 right-10"
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-2xl rotate-45 shadow-xl" />
          <div className="absolute inset-4 bg-white rounded shadow-2xl">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#F43F5E]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-1.5 bg-[#F43F5E]" />
          </div>
        </div>
      </motion.div>

      {/* Heartbeat pulse */}
      <motion.div
        className="absolute top-40 left-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <svg width="80" height="40" viewBox="0 0 80 40" className="text-white/40">
          <path
            d="M 0,20 L 20,20 L 25,10 L 30,30 L 35,15 L 40,20 L 80,20"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
