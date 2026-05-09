import { motion } from "motion/react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useTranslation } from "react-i18next";

export function Navbar() {
  const { t } = useTranslation();
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-[#0D9488]" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F43F5E] rounded-full animate-pulse" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Netra AI</span>
          </a>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
            >
              {t('nav.home', "Home")}
            </a>
            <a
              href="#how-it-works"
              className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
            >
              {t('home.how_it_works.title', "How It Works")}
            </a>
            <a
              href="#about"
              className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
            >
              {t('home.about.about', "About")}
            </a>
            <a
              href="#contact"
              className="text-gray-700 dark:text-gray-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium"
            >
              {t('home.contact.title', "Contact")}
            </a>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button className="bg-[#0D9488] text-white hover:bg-[#0F766E] dark:bg-teal-500 dark:hover:bg-teal-600 font-semibold shadow-md">
              {t('common.get_started', "Get Started")}
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
