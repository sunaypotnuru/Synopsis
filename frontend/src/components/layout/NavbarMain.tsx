import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Video, LayoutDashboard, ChevronDown, MessageSquare,
  Trophy, Gift, FolderOpen, FileStack, Globe, Activity,
  Eye, MapPin, Calendar, Menu, X, User, LogOut, FileText, ListChecks, Dumbbell, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import GlobalSearch from "@/components/shared/GlobalSearch";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationCenter } from "@/components/features/notifications/NotificationCenter";
import { ConnectionStatus } from "@/components/shared/ConnectionStatus";


const patientNav = [
  { label: "Models", path: "/patient/models", icon: Eye },
  { label: "Doctors", path: "/patient/doctors", icon: Video },
  { label: "Hospitals", path: "/patient/hospitals", icon: MapPin },
  { label: "Appointments", path: "/patient/appointments", icon: Calendar },
];

const patientExtraNav = [
  { label: "AR Exercises", path: "/patient/exercises", icon: Dumbbell },
  { label: "Health Questionnaires", path: "/patient/pro-questionnaires", icon: ListChecks },
  { label: "Timeline", path: "/patient/timeline", icon: Activity },
  { label: "Messages", path: "/patient/messages", icon: MessageSquare },
  { label: "Achievements", path: "/patient/achievements", icon: Trophy },
  { label: "Referrals", path: "/patient/referrals", icon: Gift },
  { label: "Documents", path: "/patient/documents", icon: FolderOpen },
  { label: "Settings", path: "/patient/settings", icon: Settings },
];

const doctorNav = [
  { label: "Dashboard", path: "/doctor/dashboard", icon: LayoutDashboard },
  { label: "Patients", path: "/doctor/patients", icon: User },
  { label: "Availability", path: "/doctor/availability", icon: Clock },
  { label: "Appointments", path: "/doctor/appointments", icon: Calendar },
  { label: "Prescriptions", path: "/doctor/prescriptions/new", icon: FileText },
];

const doctorExtraNav = [
  { label: "Messages", path: "/doctor/messages", icon: MessageSquare },
  { label: "Achievements", path: "/doctor/achievements", icon: Trophy },
  { label: "Referrals", path: "/doctor/referrals", icon: Gift },
  { label: "Auto Follow-Ups", path: "/doctor/follow-up-templates", icon: Activity },
  { label: "PRO Builder", path: "/doctor/pro-builder", icon: ListChecks },
  { label: "Rx Templates", path: "/doctor/prescriptions", icon: FileStack },
  { label: "AR Exercises", path: "/doctor/exercises", icon: Dumbbell },
  { label: "Documents", path: "/doctor/documents", icon: FolderOpen },
  { label: "Settings", path: "/doctor/settings", icon: Settings },
];

export default function NavbarMain() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isDoctor = location.pathname.startsWith("/doctor");
  const isPatient = location.pathname.startsWith("/patient");
  const isAdmin = location.pathname.startsWith("/admin");
  const isAuth = isDoctor || isPatient || isAdmin;
  const navItems = isDoctor ? doctorNav : isPatient ? patientNav : [];
  const extraNavItems = isDoctor ? doctorExtraNav : isPatient ? patientExtraNav : [];
  const accentColor = isDoctor ? "var(--color-doctor-primary, #0EA5E9)" : isAdmin ? "var(--color-admin-primary, #7B1FA2)" : "var(--color-patient-primary, #0D9488)";

  // Helper function to check if a nav item should be active
  const isNavItemActive = (itemPath: string) => {
    // Exact match for most routes
    if (location.pathname === itemPath) return true;
    
    // Special case: Models page should stay active when on any scan page
    if (itemPath === "/patient/models") {
      const modelScanPaths = [
        "/patient/scan",
        "/patient/cataract-scan",
        "/patient/dr-scan",
        "/patient/mental-health",
        "/patient/parkinsons-voice"
      ];
      return modelScanPaths.includes(location.pathname);
    }
    
    return false;
  };

  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname.startsWith("/login") || location.pathname.startsWith("/signup");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const logoLink = user?.role === 'admin' 
    ? '/admin/dashboard' 
    : user?.role === 'doctor' 
      ? '/doctor/dashboard' 
      : user?.role === 'patient' 
        ? '/patient/dashboard' 
        : '/';

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 glass-navbar ${scrolled
          ? "shadow-lg"
          : "shadow-sm"
          }`}
      >
        <div className="w-full px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to={logoLink}
            onClick={(e) => {
              if (location.pathname === logoLink) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 group"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${isDoctor ? "#0284C7" : "#0F766E"})` }}
            >
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0F172A] dark:text-white">Netra AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {(!isAuth || isHomePage) && !isLoginPage && (
              <>
                {[
                  { key: 'nav.features', label: 'Features' },
                  { key: 'nav.how_it_works', label: 'How It Works' },
                  { key: 'nav.about', label: 'About' },
                  { key: 'nav.contact', label: 'Contact' }
                ].map((item) => (
                  <a
                    key={item.label}
                    href={isHomePage ? `#${item.label.toLowerCase().replace(/\s+/g, "-")}` : `/#${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="px-4 py-2 text-sm font-medium text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t(item.key, item.label)}
                  </a>
                ))}
              </>
            )}
            {isAuth && !isHomePage && navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  isNavItemActive(item.path)
                    ? `text-white shadow-md`
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-100"
                  }`}
                style={isNavItemActive(item.path) ? { backgroundColor: accentColor } : {}}
              >
                <item.icon className="w-4 h-4" />
                {t(`nav.${item.label.toLowerCase()}`, item.label)}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Unified Language Switcher for ALL users */}
            <div className="relative hidden md:block" ref={langRef}>
              <button onClick={() => { setLangOpen(o => !o); setMenuOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#64748B] hover:bg-gray-100 text-sm font-medium transition-colors">
                <Globe className="w-4 h-4" />
                <span>{language === 'hi' ? 'हिं' : language === 'te' ? 'తె' : language === 'ta' ? 'த' : language === 'mr' ? 'म' : language === 'kn' ? 'ಕ' : 'EN'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                    {[
                      { code: 'en', label: 'English' }, 
                      { code: 'hi', label: 'हिंदी' }, 
                      { code: 'te', label: 'తెలుగు' }, 
                      { code: 'ta', label: 'தமிழ்' },
                      { code: 'mr', label: 'मराठी' },
                      { code: 'kn', label: 'ಕನ್ನಡ' }
                    ].map(lang => (
                      <button key={lang.code} onClick={() => { setLanguage(lang.code as 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'kn'); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${language === lang.code ? 'font-bold text-[#0D9488]' : 'text-[#64748B] dark:text-gray-300'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle className="text-[#64748B] hover:bg-gray-100 hover:text-[#0F172A] w-9 h-9 border border-gray-200" />
            {isAuth && (
              <div className="flex items-center gap-2">
                <ConnectionStatus />
                <NotificationCenter />
              </div>
            )}

            {!isAuth && !isLoginPage && (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="hidden md:flex text-[#0F172A] font-medium">{t('common.login', 'Log In')}</Button>
                <Button onClick={() => navigate("/login")} className="hidden md:flex text-white font-medium shadow-md shadow-[#0D9488]/20"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${isDoctor ? "#0284C7" : "#0F766E"})` }}>{t('home.get_started', 'Get Started')}</Button>
              </>
            )}

            {isAuth && (
              <div className="hidden md:flex items-center gap-2">
                <GlobalSearch />
                {/* Unified Menu Dropdown — click-based, closes on outside click */}
                {user?.role !== 'admin' && (
                  <div className="relative" ref={menuRef}>
                    <Button variant="outline" size="sm" onClick={() => { setMenuOpen(o => !o); setLangOpen(false); }} className="text-[#0F172A] flex items-center gap-2 mr-2">
                      <Menu className="w-4 h-4" />
                      <span className="hidden sm:inline font-semibold">{t('nav.menu', 'Menu')}</span>
                    </Button>
                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50"
                        >
                          <button onClick={() => { navigate(user?.role === 'doctor' ? "/doctor/documents" : "/patient/documents"); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#0F172A] hover:bg-gray-50 outline-none">
                            <FolderOpen className="w-4 h-4 text-[#8B5CF6]" /> My Documents
                          </button>
                          <button onClick={() => { navigate(user?.role === 'doctor' ? "/doctor/achievements" : "/patient/achievements"); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#0F172A] hover:bg-gray-50">
                            <Trophy className="w-4 h-4 text-[#F59E0B]" /> Achievements
                          </button>
                          {user?.role === 'patient' && (
                            <button onClick={() => { navigate("/patient/timeline"); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#0F172A] hover:bg-gray-50 outline-none">
                              <Activity className="w-4 h-4 text-[#22C55E]" /> Health Timeline
                            </button>
                          )}
                          <button onClick={() => { navigate(user?.role === 'doctor' ? "/doctor/settings" : "/patient/settings"); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#0F172A] hover:bg-gray-50 outline-none">
                            <Settings className="w-4 h-4 text-[#6366F1]" /> Settings
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Quick access to messages */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(user?.role === 'doctor' ? "/doctor/messages" : user?.role === 'admin' ? "/admin/messages" : "/patient/messages")}
                  className="text-[#64748B] relative"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>

                {user?.role !== 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(user?.role === 'doctor' ? "/doctor/profile" : "/patient/profile")}
                    className="text-[#64748B]"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-[#F43F5E] border-[#F43F5E]/30 hover:bg-[#F43F5E]/5"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
              aria-label="Toggle mobile menu"
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, ${isDoctor ? "#0284C7" : "#0F766E"})` }}>
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-[#0F172A]">Netra AI</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {isAuth ? (
                    <>
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            isNavItemActive(item.path)
                              ? "text-white"
                              : "text-[#64748B] hover:bg-gray-50"
                            }`}
                          style={isNavItemActive(item.path) ? { backgroundColor: accentColor } : {}}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      ))}
                      {extraNavItems.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            More Features
                          </div>
                          {extraNavItems.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                isNavItemActive(item.path)
                                  ? "text-white"
                                  : "text-[#64748B] hover:bg-gray-50"
                                }`}
                              style={isNavItemActive(item.path) ? { backgroundColor: accentColor } : {}}
                            >
                              <item.icon className="w-5 h-5" />
                              {item.label}
                            </Link>
                          ))}
                        </>
                      )}
                      <hr className="my-4" />
                      <button onClick={() => navigate(isDoctor ? "/doctor/profile" : "/patient/profile")}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#64748B] hover:bg-gray-50 w-full">
                        <User className="w-5 h-5" /> {t('common.profile', 'Profile')}
                      </button>
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#F43F5E] hover:bg-[#F43F5E]/5 w-full">
                        <LogOut className="w-5 h-5" /> {t('common.logout', 'Sign Out')}
                      </button>
                    </>
                  ) : (
                    <>
                      {["Features", "How It Works", "About", "Contact"].map((item) => (
                        <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                          className="block px-4 py-3 rounded-xl text-sm font-medium text-[#64748B] hover:bg-gray-50"
                          onClick={() => setMobileOpen(false)}>
                          {item}
                        </a>
                      ))}
                      <hr className="my-4" />
                      <Button onClick={() => navigate("/login")} className="w-full text-white"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${isDoctor ? "#0284C7" : "#0F766E"})` }}>
                        {t('home.get_started', 'Get Started')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
