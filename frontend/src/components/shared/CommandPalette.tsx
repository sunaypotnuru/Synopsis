import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Users, Calendar, Settings, Activity, Heart, Shield } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from "@/app/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export function CommandPalette() {
  const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => setOpen(false)}
            />

            <div className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 transition-all bg-opacity-95 backdrop-blur-md">
                <Command
                    className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-transparent"
                    label="Global Command Menu"
                >
                    <div className="flex items-center border-b border-slate-100 px-3">
                        <Search className="mr-2 h-5 w-5 shrink-0 text-slate-400" />
                        <Command.Input
                            autoFocus
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 font-medium"
                            placeholder={t('components.command_palette.type_a_command_or_placeholder_9', "Type a command or search...")}
                        />
                        <div className="hidden sm:flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                            <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">{t('components.command_palette.esc', "ESC")}</kbd>
                        </div>
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty className="py-6 text-center text-sm text-slate-500">{t('components.command_palette.no_results_found_1', "No results found.")}</Command.Empty>

                        {user?.role === 'patient' && (
                            <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-semibold text-slate-500 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:font-medium">
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors aria-selected:bg-teal-50 aria-selected:text-teal-700"
                                    onSelect={() => runCommand(() => navigate('/patient/scan'))}
                                >
                                    <Activity className="mr-3 h-4 w-4 text-teal-600" />{t('components.command_palette.start_ai_eye_scan_2', "Start AI Eye Scan")}</Command.Item>
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors aria-selected:bg-teal-50 aria-selected:text-teal-700 mt-1"
                                    onSelect={() => runCommand(() => navigate('/patient/doctors'))}
                                >
                                    <Search className="mr-3 h-4 w-4 text-teal-600" />{t('components.command_palette.find_a_specialist_3', "Find a Specialist")}</Command.Item>
                            </Command.Group>
                        )}

                        {user?.role === 'doctor' && (
                            <Command.Group heading="Doctor Workflow" className="px-2 py-1.5 text-xs font-semibold text-slate-500 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:font-medium">
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors aria-selected:bg-blue-50 aria-selected:text-blue-700"
                                    onSelect={() => runCommand(() => navigate('/doctor/appointments'))}
                                >
                                    <Users className="mr-3 h-4 w-4 text-blue-600" />{t('components.command_palette.view_todays_patients_4', "View Today's Patients")}</Command.Item>
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors aria-selected:bg-blue-50 aria-selected:text-blue-700 mt-1"
                                    onSelect={() => runCommand(() => navigate('/doctor/availability'))}
                                >
                                    <Calendar className="mr-3 h-4 w-4 text-blue-600" />{t('components.command_palette.manage_availability_5', "Manage Availability")}</Command.Item>
                            </Command.Group>
                        )}

                        {user?.role === 'admin' && (
                            <Command.Group heading="Admin Controls" className="px-2 py-1.5 text-xs font-semibold text-slate-500 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:font-medium">
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors aria-selected:bg-purple-50 aria-selected:text-purple-700"
                                    onSelect={() => runCommand(() => navigate('/admin/doctors'))}
                                >
                                    <Shield className="mr-3 h-4 w-4 text-purple-600" />{t('components.command_palette.verify_new_doctors_6', "Verify New Doctors")}</Command.Item>
                                <Command.Item
                                    className="flex cursor-pointer items-center rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors aria-selected:bg-purple-50 aria-selected:text-purple-700 mt-1"
                                    onSelect={() => runCommand(() => navigate('/admin/scans'))}
                                >
                                    <Activity className="mr-3 h-4 w-4 text-purple-600" />{t('components.command_palette.review_ai_audit_logs_7', "Review AI Audit Logs")}</Command.Item>
                            </Command.Group>
                        )}

                        <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-slate-500 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:font-medium mt-2 border-t border-slate-100">
                            <Command.Item
                                className="flex cursor-pointer items-center rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors aria-selected:bg-slate-50 aria-selected:text-slate-900"
                                onSelect={() => runCommand(() => navigate('/'))}
                            >
                                <Heart className="mr-3 h-4 w-4 text-slate-500" />{t('components.command_palette.homepage_8', "Homepage")}</Command.Item>
                            <Command.Item
                                className="flex cursor-pointer items-center rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors aria-selected:bg-slate-50 aria-selected:text-slate-900 mt-1"
                                onSelect={() => runCommand(() => navigate('/login'))}
                            >
                                <Settings className="mr-3 h-4 w-4 text-slate-500" /> Change Role / Login
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    );
}
