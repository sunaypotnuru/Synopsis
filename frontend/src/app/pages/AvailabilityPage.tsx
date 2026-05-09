import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, Check, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorAPI } from "../../lib/api";
import { Skeleton } from "@mui/material";
import { useTranslation } from "../../lib/i18n";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
    "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM",
    "10:00 PM", "10:30 PM",
];

type Availability = Record<string, string[]>;

export default function AvailabilityPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [availability, setAvailability] = useState<Availability>({});
    const [selectedDay, setSelectedDay] = useState("Monday");

    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['doctorDashboard'], // Reusing dashboard query as it contains profile
        queryFn: () => doctorAPI.getDashboard().then(res => res.data)
    });

    useEffect(() => {
        if (dashboardData?.profile?.availability) {
            setAvailability(dashboardData.profile.availability);
        }
    }, [dashboardData?.profile?.availability]);

    const saveMutation = useMutation({
        mutationFn: (newAvailability: Availability) => doctorAPI.updateAvailability(newAvailability),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] });
            toast.success(t("doctor.availability.updated", "Availability updated successfully!"));
        },
        onError: () => {
            toast.error(t("doctor.availability.failed", "Failed to save availability"));
        }
    });

    const toggleSlot = (slot: string) => {
        setAvailability((prev) => {
            const daySlots = prev[selectedDay] || [];
            return {
                ...prev,
                [selectedDay]: daySlots.includes(slot)
                    ? daySlots.filter((s) => s !== slot)
                    : [...daySlots, slot].sort(),
            };
        });
    };

    const handleSave = () => {
        saveMutation.mutate(availability);
    };

    const clearDay = () => {
        setAvailability((prev) => ({ ...prev, [selectedDay]: [] }));
    };

    const selectAll = () => {
        setAvailability((prev) => ({ ...prev, [selectedDay]: [...timeSlots] }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
                <div className="max-w-5xl mx-auto space-y-8">
                    <Skeleton width={300} height={60} />
                    <div className="grid lg:grid-cols-4 gap-6">
                        <Skeleton variant="rounded" height={400} />
                        <div className="lg:col-span-3">
                            <Skeleton variant="rounded" height={400} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-20 px-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{t("common.connection_error", "Connection Error")}</h2>
                <p className="text-[#64748B] mb-6">{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['doctorDashboard'] })}>{t("common.retry", "Retry")}</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0F9FF] via-white to-[#F8FAFC]">
            <div className="max-w-5xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{t("doctor.availability.title", "Clinic Availability")}</h1>
                    <p className="text-[#64748B]">{t("doctor.availability.subtitle", "Configure your weekly consultation windows")}</p>
                </motion.div>

                <div className="grid lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="p-4 border border-gray-100 bg-white">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">{t("doctor.availability.work_days", "Work Days")}</h3>
                            <div className="space-y-1">
                                {days.map((day) => {
                                    const slotCount = (availability[day] || []).length;
                                    const isActive = selectedDay === day;
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                                ? "bg-[#0EA5E9] text-white shadow-lg"
                                                : "hover:bg-gray-50 text-[#0F172A]"
                                                }`}
                                        >
                                            <span>{t(`common.day_${day.toLowerCase()}`, day)}</span>
                                            {slotCount > 0 && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-[#0EA5E9]/10 text-[#0EA5E9]"}`}>
                                                    {slotCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3">
                        <Card className="p-8 border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-[#0F172A]">{t(`common.day_${selectedDay.toLowerCase()}`, selectedDay)}</h2>
                                    <p className="text-sm text-[#64748B] font-medium">
                                        {(availability[selectedDay] || []).length} {t("doctor.availability.slots_active", "Slots Active")}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-rose-500 font-bold" onClick={clearDay}>{t("common.clear", "Clear")}</Button>
                                    <Button variant="ghost" size="sm" className="text-[#0EA5E9] font-bold" onClick={selectAll}>{t("common.select_all", "Select All")}</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {timeSlots.map((slot) => {
                                    const isSelected = (availability[selectedDay] || []).includes(slot);
                                    return (
                                        <button
                                            key={slot}
                                            onClick={() => toggleSlot(slot)}
                                            className={`px-3 py-3 rounded-xl text-xs font-bold transition-all duration-200 border ${isSelected
                                                ? "bg-[#0EA5E9] text-white border-[#0EA5E9] shadow-md"
                                                : "bg-white text-gray-400 border-gray-100 hover:border-[#0EA5E9]/30 hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 justify-center">
                                                {isSelected && <Check className="w-3 h-3" />}
                                                <span>{slot}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-12 flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    loading={saveMutation.isPending}
                                    className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white font-black px-10 py-6 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
                                >
                                    <Save className="w-5 h-5 mr-2" /> {t("common.save_changes", "Save Changes")}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8">
                    <Card className="p-8 border border-gray-100 bg-white">
                        <h2 className="text-lg font-black text-[#0F172A] mb-6">{t("doctor.availability.weekly_dist", "Weekly Distribution")}</h2>
                        <div className="grid grid-cols-7 gap-4">
                            {days.map((day) => {
                                const slotCount = (availability[day] || []).length;
                                const percentage = Math.min((slotCount / timeSlots.length) * 100, 100);
                                return (
                                    <div key={day} className="text-center group">
                                        <p className="text-[10px] font-black text-gray-400 mb-3 group-hover:text-[#0EA5E9] transition-colors">{t(`common.day_${day.toLowerCase()}_short`, day.slice(0, 3).toUpperCase())}</p>
                                        <div className="w-full h-32 bg-gray-50 rounded-2xl relative overflow-hidden border border-gray-50 shadow-inner">
                                            <motion.div
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0EA5E9] to-[#0284C7] rounded-2xl"
                                                initial={{ height: 0 }}
                                                animate={{ height: `${percentage}%` }}
                                                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                                            />
                                        </div>
                                        <p className="text-xs text-[#0EA5E9] font-black mt-3">{slotCount}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
