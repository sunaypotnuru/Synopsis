import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "../../lib/i18n";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF] relative overflow-hidden">
      {/* Decorative floating elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#0D9488]/5 rounded-3xl blur-2xl"
      />
      <motion.div
        animate={{
          y: [0, 25, 0],
          rotate: [0, -15, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#0EA5E9]/5 rounded-full blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center relative z-10"
      >
        <motion.div
          animate={{
            rotateY: [0, 10, -10, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="perspective-1000"
        >
          <h1 className="text-[12rem] font-black leading-none bg-gradient-to-br from-[#0D9488] to-[#0F766E] bg-clip-text text-transparent drop-shadow-2xl">
            404
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-[#0F172A] mt-4 mb-4">
            {t('errors.not_found_title', 'Page Not Found')}
          </h2>
          <p className="text-[#64748B] mb-10 max-w-md mx-auto leading-relaxed">
            {t('errors.not_found_message', "The health resource you are looking for has been moved to another wing or doesn't exist.")}
          </p>
          
          <div className="flex gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate(-1)} variant="outline" className="px-8 py-6 h-auto text-lg border-teal-200 text-[#0D9488] hover:bg-teal-50">
                <ArrowLeft className="w-5 h-5 mr-2" />
                {t('common.go_back', 'Go Back')}
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate("/")} className="px-8 py-6 h-auto text-lg bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white hover:shadow-xl transition-all">
                <Home className="w-5 h-5 mr-2" />
                {t('common.home', 'Home')}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
