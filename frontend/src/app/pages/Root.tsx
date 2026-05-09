import { Outlet, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import NavbarMain from "@/components/layout/NavbarMain";
import Footer from "@/components/layout/Footer";
import SOSButton from "@/components/shared/SOSButton";
import { VoiceAccessibility } from "@/components/features/accessibility/VoiceAccessibility";
import ChatbotWidget from "@/components/features/ai/ChatbotWidget";
import { useAuthStore } from "../../lib/store";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

export default function Root() {
  const location = useLocation();
  const { user } = useAuthStore();

  const isAuthPage = location.pathname.startsWith("/login") || location.pathname.startsWith("/signup");
  const isPortalPage = location.pathname.startsWith("/patient") || location.pathname.startsWith("/doctor");
  const isAdminPage = location.pathname.startsWith("/admin");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col relative"
    >
      {/* Subtle global background */}
      <div
        className="fixed inset-0 pointer-events-none z-[-1]"
        style={{
          background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 30%, #f0f9ff 60%, #faf5ff 100%)',
        }}
      />

      <ScrollToTop />
      {!isAdminPage && <NavbarMain />}

      <main className="flex-1">
        <Outlet />
      </main>

      {!isAuthPage && !isPortalPage && <Footer />}

      <ScrollToTopButton />
      {/* Floating SOS button — visible on all patient pages */}
      <SOSButton />

      {/* Global Widgets within Router context */}
      {user?.role !== "admin" && <VoiceAccessibility />}
      {(user?.role === "patient" || !user) && !isAdminPage && <ChatbotWidget />}

      {/* only a single toaster should exist in the app; the instance in App.tsx handles notifications */}
    </motion.div>
  );
}
