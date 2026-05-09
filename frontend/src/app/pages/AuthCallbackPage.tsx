import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { useAuthStore } from "../../lib/store";
import { Card } from "@/components/ui/card";

/**
 * AuthCallbackPage
 * Handles the redirect from Supabase/Google OAuth.
 * Displays a beautiful loading state while waiting for the session to initialize,
 * then redirects the user to their appropriate dashboard based on their role.
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const { user, loadUser, loading } = useAuthStore();

    useEffect(() => {
        // Initialize the user session from the URL hash/cookie
        const initSession = async () => {
            await loadUser();
        };
        initSession();
    }, [loadUser]);

    useEffect(() => {
        // Once the user is loaded and not loading anymore, redirect
        if (!loading && user) {
            const role = user.role;
            console.log(`[AuthCallback] User loaded with role: ${role}. Redirecting...`);
            
            if (role === "admin") {
                navigate("/admin/dashboard", { replace: true });
            } else if (role === "doctor") {
                navigate("/doctor/dashboard", { replace: true });
            } else {
                navigate("/patient/dashboard", { replace: true });
            }
        } else if (!loading && !user) {
            // If after loading there's still no user, something went wrong
            console.error("[AuthCallback] No user found after session initialization.");
            navigate("/login", { replace: true });
        }
    }, [user, loading, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <Card className="p-8 shadow-2xl border-white/50 bg-white/80 backdrop-blur-xl text-center">
                    <motion.div
                        className="w-20 h-20 bg-gradient-to-br from-[#0D9488] to-[#0F766E] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#0D9488]/20"
                        animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.05, 0.95, 1]
                        }}
                        transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </motion.div>

                    <h1 className="text-3xl font-bold text-[#0F172A] mb-3">
                        Authenticating
                    </h1>
                    <p className="text-[#64748B] mb-8 leading-relaxed">
                        Completing your secure login to Netra AI. One moment while we prepare your workspace...
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            >
                                <Loader2 className="w-10 h-10 text-[#0D9488]" />
                            </motion.div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm font-medium text-[#94A3B8]">
                            <UserCheck className="w-4 h-4" />
                            <span>Verifying Identity</span>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Secure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">HIPAA</span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
                <div className="absolute top-[-10%] right-[-10%] w-1/3 h-1/3 bg-[#0D9488]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-1/2 h-1/2 bg-[#3B82F6]/5 rounded-full blur-[120px]" />
            </div>
        </div>
    );
}
