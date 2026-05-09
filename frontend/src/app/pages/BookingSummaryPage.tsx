import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { 
    CreditCard, Calendar, Clock, 
    ChevronRight, ArrowLeft, Loader2, ShieldCheck, 
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { doctorAPI, patientAPI } from "../../lib/api";
import { useTranslation } from "../../lib/i18n";
import { useAuthStore } from "../../lib/store";

export default function BookingSummaryPage() {
    const { t } = useTranslation();
    const { doctorId } = useParams<{ doctorId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    
    interface Doctor {
        id: string;
        full_name: string;
        specialty?: string;
        consultation_fee?: number;
        avatar_url?: string;
        [key: string]: unknown;
    }
    
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Appointment details passed via location state or defaults
    const appointmentData = location.state || {
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        type: "video",
        reason: "General Consultation"
    };

    useEffect(() => {
        if (!doctorId) return;
        doctorAPI.getDoctor(doctorId)
            .then(res => setDoctor(res.data))
            .catch(() => toast.error(t('common.error', "Failed to load doctor details")))
            .finally(() => setLoading(false));
    }, [doctorId, t]);

    const handleConfirmBooking = async () => {
        if (!user || !doctor) return;
        setProcessing(true);
        
        try {
            // Step 1: Create the appointment
            const apptPayload = {
                doctor_id: doctorId,
                scheduled_at: appointmentData.scheduled_at,
                type: appointmentData.type,
                reason: appointmentData.reason,
            };
            
            const apptRes = await patientAPI.bookAppointment(apptPayload);
            const apptId = apptRes.data?.id;
            
            toast.success(t('patient.booking.success', "Booking confirmed! Proceeding to intake."));
            
            // Step 2: Redirect to Intake Form
            const specialty = (doctor.specialty || "general").toLowerCase().replace(/\s+/g, '-');
            navigate(`/patient/intake/${specialty}/${apptId}`);
        } catch (err) {
            console.error("Booking failed:", err);
            const error = err as { response?: { data?: { detail?: string } } };
            toast.error(error.response?.data?.detail || t('patient.booking.failed', "Booking failed. Please try again."));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">Doctor not found</h2>
                <Button onClick={() => navigate("/patient/doctors")}>Back to Search</Button>
            </div>
        );
    }

    const scheduledDate = new Date(appointmentData.scheduled_at);

    return (
        <div className="min-h-screen pt-20 pb-16 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
            <div className="max-w-2xl mx-auto px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate(-1)} 
                        className="mb-6 gap-2 text-gray-500 hover:text-teal-600"
                    >
                        <ArrowLeft className="w-4 h-4" /> {t('common.back', "Back")}
                    </Button>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Confirm Your Booking</h1>
                        <p className="text-gray-500 mt-2">Review your appointment details before finalizing.</p>
                    </div>

                    <div className="space-y-6">
                        {/* Doctor Card */}
                        <Card className="p-6 border-none shadow-xl bg-white rounded-3xl">
                            <div className="flex items-center gap-4 mb-6">
                                <Avatar className="w-16 h-16 border-2 border-teal-100">
                                    <AvatarImage src={doctor.avatar_url} />
                                    <AvatarFallback className="bg-teal-600 text-white font-bold">
                                        {doctor.full_name?.charAt(0) || "D"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{doctor.full_name}</h3>
                                    <p className="text-teal-600 text-sm font-medium uppercase tracking-wider">{doctor.specialty}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Date</p>
                                        <p className="text-sm font-semibold text-gray-700">{scheduledDate.toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Time</p>
                                        <p className="text-sm font-semibold text-gray-700">{scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Payment Summary */}
                        <Card className="p-6 border-none shadow-lg bg-teal-900 text-white rounded-3xl overflow-hidden relative">
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5" /> Payment Summary
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-teal-100 text-sm">
                                        <span>Consultation Fee</span>
                                        <span>₹{doctor.consultation_fee || 500}</span>
                                    </div>
                                    <div className="flex justify-between text-teal-100 text-sm">
                                        <span>Service Fee</span>
                                        <span>₹0</span>
                                    </div>
                                    <div className="h-px bg-teal-800/50 my-2" />
                                    <div className="flex justify-between font-bold text-xl">
                                        <span>Total Amount</span>
                                        <span>₹{doctor.consultation_fee || 500}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-800/30 rounded-full blur-3xl" />
                        </Card>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-2">
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            <span className="text-[11px] font-medium uppercase tracking-widest">Secure HIPAA-Compliant Booking</span>
                        </div>

                        {/* Action Button */}
                        <Button 
                            size="lg"
                            disabled={processing}
                            onClick={handleConfirmBooking}
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white h-14 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] font-bold text-lg"
                        >
                            {processing ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Confirm & Proceed to Intake <ChevronRight className="w-5 h-5 ml-2" /></>
                            )}
                        </Button>
                        
                        <p className="text-center text-xs text-gray-400">
                            By confirming, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
