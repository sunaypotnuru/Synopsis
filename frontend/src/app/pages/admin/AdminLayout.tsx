import { Outlet, NavLink } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
    LayoutDashboard, Users, UserRoundPlus, Calendar,
    Scan, LogOut, HeartPulse, Settings, Menu, X, Eye,
    MessageSquare, Shield, BarChart2, Star, Mail, Activity, FileText
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useTranslation } from '@/lib/i18n';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';

export default function AdminLayout() {
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const { signOut } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            setSidebarOpen(window.innerWidth >= 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { group: "Core", items: [
            { label: t("common.dashboard", "Dashboard"), path: '/admin/dashboard', icon: LayoutDashboard },
            { label: t("common.patients", "Patients"), path: '/admin/patients', icon: Users },
            { label: t("common.doctors", "Doctors"), path: '/admin/doctors', icon: UserRoundPlus },
            { label: t("common.appointments", "Appointments"), path: '/admin/appointments', icon: Calendar },
            { label: t("admin.nav.ai_scans", "AI Scans"), path: '/admin/scans', icon: Scan },
            { label: t("admin.nav.analytics", "Analytics"), path: '/admin/analytics', icon: BarChart2 },
        ]},
        { group: "Compliance & Regulatory", items: [
            { label: t("admin.nav.compliance", "Compliance Dashboard"), path: '/admin/compliance', icon: Shield },
            { label: t("admin.nav.fda_apm", "FDA APM Monitoring"), path: '/admin/compliance/fda-apm', icon: Activity },
            { label: t("admin.nav.iec62304", "IEC 62304 Trace"), path: '/admin/compliance/iec62304', icon: FileText },
            { label: t("admin.nav.soc2", "SOC 2 Evidence"), path: '/admin/compliance/soc2', icon: Shield },
            { label: t("admin.nav.complaints", "Complaints"), path: '/admin/compliance/complaints', icon: MessageSquare },
        ]},
        { group: "Technical", items: [
            { label: t("admin.nav.system_health", "System Health"), path: '/admin/system-health', icon: Activity },
            { label: t("admin.nav.mcp", "MCP Management"), path: '/admin/mcp', icon: Activity },
            { label: t("admin.nav.fhir", "FHIR Manager"), path: '/admin/fhir', icon: FileText },
            { label: t("admin.nav.audit_logs", "Audit Logs"), path: '/admin/audit-logs', icon: Shield },
            { label: t("admin.nav.security", "Security"), path: '/admin/security', icon: Shield },
            { label: t("admin.nav.configuration", "Configuration"), path: '/admin/configuration', icon: Settings },
        ]},
        { group: "Engagement", items: [
            { label: t("admin.nav.epidemic_radar", "Epidemic Radar"), path: '/admin/epidemic-radar', icon: Activity },
            { label: t("admin.nav.reports", "Reports"), path: '/admin/reports', icon: BarChart2 },
            { label: t("admin.nav.newsletter", "Newsletter"), path: '/admin/newsletter', icon: Mail },
            { label: t("admin.nav.blogs", "Manage Blogs"), path: '/admin/blogs', icon: FileText },
            { label: t("admin.nav.reviews", "Reviews"), path: '/admin/reviews', icon: Star },
            { label: t("admin.nav.team", "Team Profiles"), path: '/admin/team', icon: Users },
            { label: t("admin.nav.contact_messages", "Contact Messages"), path: '/admin/contact-messages', icon: Mail },
        ]},
        { group: "System", items: [
            { label: t("common.messages", "Messages"), path: '/admin/messages', icon: MessageSquare },
            { label: t("common.settings", "Settings"), path: '/admin/settings', icon: Settings },
        ]}
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: sidebarOpen ? 280 : 0,
                    opacity: sidebarOpen ? 1 : 0
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="fixed lg:sticky top-0 h-screen bg-white border-r border-gray-200 shadow-sm z-50 flex flex-col shrink-0 overflow-hidden"
            >
                <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shadow-lg">
                            <Eye className="w-5 h-5 text-white" />
                        </div>
                        {sidebarOpen && <span className="text-xl font-bold text-[#0F172A] whitespace-nowrap">{t("admin.layout.netra_admin", "Netra Admin")}</span>}
                    </div>
                    {isMobile && (
                        <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                    {navItems.map((group) => (
                        <div key={group.group} className="space-y-2">
                            {sidebarOpen && <h4 className="px-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">{group.group}</h4>}
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => isMobile && setSidebarOpen(false)}
                                        className={({ isActive }) => `
                                            flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                                            ${isActive
                                                ? "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md font-medium"
                                                : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
                                            }
                                        `}
                                    >
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 shrink-0">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-start gap-3 border-gray-200 text-[#F43F5E] hover:bg-[#F43F5E]/5 shrink-0"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="whitespace-nowrap">{t("common.sign_out", "Sign Out")}</span>
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shrink-0 z-30 px-6 flex items-center justify-between lg:justify-end">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100">
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="font-bold text-[#0F172A]">{t("admin.layout.netra_admin", "Netra Admin")}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <ConnectionStatus />
                        <ThemeToggle className="text-[#64748B] hover:bg-gray-100 hover:text-[#0F172A] w-9 h-9 border border-gray-200" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center border border-[#8B5CF6]/20">
                                <HeartPulse className="w-4 h-4 text-[#8B5CF6]" />
                            </div>
                            <span className="text-sm font-semibold text-[#0F172A] hidden sm:block">{t("admin.layout.super_admin", "Super Admin")}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <AnimatePresence mode="wait">
                            <Outlet />
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}

