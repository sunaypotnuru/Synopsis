import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Star, MapPin, Languages, DollarSign, Calendar, ArrowLeft,
  Video, Clock, Stethoscope, Award, Phone
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { doctorAPI, patientAPI } from "../../lib/api";
import { useAuthStore } from "../../lib/store";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@mui/material";
import { useTranslation } from "../../lib/i18n";

export default function DoctorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [isProcessingPayment, _setIsProcessingPayment] = useState(false);

  // ── Fetch doctor via backend API (handles both real DB + mock fallback) ──
  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => doctorAPI.getDoctor(id!).then(res => res.data),
    enabled: !!id,
  });

  const waitlistMutation = useMutation({
    mutationFn: (data: { doctor_id: string | undefined; preferred_date: string; type: string; reason: string }) => patientAPI.joinWaitlist(data),
    onSuccess: () => {
      toast.success(t('patient.doctors.waitlist_success', "Added to waitlist!"));
      navigate("/patient/appointments");
    },
    onError: () => toast.error(t('patient.doctors.waitlist_failed', "Failed to join waitlist")),
  });

  const handleBook = () => {
    if (!user) {
      toast.error(t('patient.doctors.signin_to_book', "Please sign in to book an appointment"));
      navigate("/login");
      return;
    }
    if (!doctor) return;
    if (!selectedDate || !selectedTimeSlot) {
      toast.error(t('patient.doctors.select_time', "Please select a date and time slot"));
      return;
    }

    // Combine selected date and time string into a valid Date object
    const [time, period] = selectedTimeSlot.split(" ");
    const [hours, minutes] = time.split(":");
    let hr = parseInt(hours, 10);
    if (period === "PM" && hr < 12) hr += 12;
    if (period === "AM" && hr === 12) hr = 0;

    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hr, parseInt(minutes, 10), 0, 0);

    // Redirect to Summary Page with data
    navigate(`/patient/booking-summary/${id}`, {
      state: {
        scheduled_at: scheduledAt.toISOString(),
        type: "video",
        reason: "General Consultation"
      }
    });
  };


  const handleWaitlist = () => {
    if (!user) { navigate("/login"); return; }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    waitlistMutation.mutate({ doctor_id: id, preferred_date: tomorrow.toISOString(), type: "video", reason: "Waitlist Request" });
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton width={200} height={40} />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><Skeleton variant="rounded" height={400} className="rounded-3xl" /></div>
            <Skeleton variant="rounded" height={400} className="rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4">
        <Stethoscope className="w-16 h-16 text-gray-200" />
        <h2 className="text-2xl font-bold text-[#0F172A]">{t('patient.doctors.not_found', "Doctor not found")}</h2>
        <p className="text-gray-500">{t('patient.doctors.not_loaded', "This doctor profile could not be loaded.")}</p>
        <Button onClick={() => navigate("/patient/doctors")} className="bg-[#0D9488] text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('patient.doctors.back_to_doctors', "Back to Doctors")}
        </Button>
      </div>
    );
  }

  const doctorName = doctor.full_name || doctor.name || t('patient.doctors.doctor', "Doctor");
  const isAvailable = doctor.is_available ?? doctor.available ?? true;

  // Compute available slots for the selected day
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = selectedDate ? daysOfWeek[selectedDate.getDay()] : "";
  const availableSlots: string[] = selectedDate && doctor.availability && doctor.availability[dayName] 
    ? doctor.availability[dayName] 
    : [];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/patient/doctors")} className="mb-6 gap-2 text-gray-500 hover:text-[#0D9488]">
          <ArrowLeft className="w-4 h-4" /> {t('patient.doctors.back_to_doctors', "Back to Doctors")}
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-6">

          {/* ── Doctor Profile Card ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 border border-gray-100 shadow-sm">
              <div className="flex items-start gap-6 mb-6">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  {doctor.avatar_url && <AvatarImage src={doctor.avatar_url} alt={doctorName} />}
                  <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white text-3xl font-bold">
                    {doctorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h1 className="text-2xl font-bold text-[#0F172A]">{doctorName}</h1>
                      <p className="text-[#0D9488] font-medium capitalize mt-1">
                        {(doctor.specialty || "").replace(/_/g, " ")}
                      </p>
                    </div>
                    <Badge className={isAvailable ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-600 border-red-200"}>
                      {isAvailable ? t('patient.doctors.available', "Available") : t('patient.doctors.unavailable', "Unavailable")}
                    </Badge>
                  </div>
                  {doctor.hospital && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{doctor.hospital}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-[#0F172A]">{doctor.rating || "4.8"}</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{doctor.experience_years || 8}{t('patient.doctors.years_experience', " yrs experience")}</span>
                    </div>
                    {doctor.languages && (
                      <>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Languages className="w-4 h-4" />
                          <span>{Array.isArray(doctor.languages) ? doctor.languages.join(", ") : doctor.languages}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[#0F172A] mb-2">{t('patient.doctors.about', "About")}</h2>
                <p className="text-gray-600 leading-relaxed">
                  {doctor.bio || t('patient.doctors.default_bio', { defaultValue: "Dr. {{name}} is an experienced specialist in {{specialty}}, committed to providing high-quality, patient-centered healthcare.", name: doctorName.replace("Dr. ", ""), specialty: (doctor.specialty || "").replace(/_/g, " ") })}
                </p>
              </div>

              {/* Consultation Details */}
              <div className="grid sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="text-center">
                  <Video className="w-6 h-6 text-[#0D9488] mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t('patient.doctors.consultation', "Consultation")}</p>
                  <p className="font-semibold text-sm text-[#0F172A]">{t('patient.doctors.video_call', "Video Call")}</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <DollarSign className="w-6 h-6 text-[#0D9488] mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t('patient.doctors.fee', "Fee")}</p>
                  <p className="font-semibold text-sm text-[#0F172A]">₹{doctor.consultation_fee || 500}</p>
                </div>
                <div className="text-center">
                  <Award className="w-6 h-6 text-[#0D9488] mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t('patient.doctors.verified', "Verified")}</p>
                  <p className="font-semibold text-sm text-[#0F172A]">{doctor.is_verified ? t('common.yes', "Yes") : t('common.pending', "Pending")}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Booking Card ── */}
          <div className="space-y-4">
            <Card className="p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">{t('patient.doctors.book_appointment', "Book Appointment")}</h3>
              
              <div className="mb-4 bg-white border border-gray-100 rounded-xl overflow-hidden flex justify-center p-2">
                <CalendarUI
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTimeSlot("");
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  className="rounded-md border-0"
                />
              </div>

              {selectedDate && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('patient.doctors.available_slots', "Available Time Slots")}</h4>
                  {availableSlots.length > 0 ? (
                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('patient.doctors.select_slot', "Select a time slot")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                      {t('patient.doctors.no_slots', "No slots available on this day")}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-[#F0FDFA] rounded-xl mb-4">
                <span className="text-sm text-gray-600">{t('patient.doctors.consultation_fee', "Consultation Fee")}</span>
                <span className="font-bold text-[#0D9488] text-lg">₹{doctor.consultation_fee || 500}</span>
              </div>

              {isAvailable ? (
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#115E59] text-white font-bold shadow-lg disabled:opacity-50"
                  onClick={handleBook}
                  disabled={isProcessingPayment || !selectedDate || !selectedTimeSlot}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {isProcessingPayment ? t('common.processing', "Processing...") : t('patient.doctors.book_now', "Book Now")}
                </Button>

              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-500 text-center">{t('patient.doctors.currently_unavailable', "Currently unavailable")}</p>
                  <Button
                    variant="outline"
                    className="w-full border-[#0D9488] text-[#0D9488] hover:bg-teal-50"
                    onClick={handleWaitlist}
                    disabled={waitlistMutation.isPending}
                  >
                    {waitlistMutation.isPending ? t('patient.doctors.joining', "Joining...") : t('patient.doctors.join_waitlist', "Join Waitlist")}
                  </Button>
                </div>
              )}

              <p className="text-[10px] text-gray-400 text-center mt-3">
                {t('patient.doctors.secure_payment', "Secure payment • Instant confirmation")}
              </p>
            </Card>

            {/* Quick contact info */}
            <Card className="p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('patient.doctors.contact', "Contact")}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-[#0D9488]" />
                <span>{t('patient.doctors.video_only', "Via video call only")}</span>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
