import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Calendar, Video, Clock, XCircle, AlertCircle, Download, FileText, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientAPI } from "../../lib/api";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useTranslation } from "../../lib/i18n";
import { getWebSocketManager } from "../services/websocket";
import { useEffect } from "react";

interface DoctorProfile {
  name?: string;
  specialty?: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  profiles_doctor?: DoctorProfile;
  notes?: string;
  consultation_type?: string;
  type?: string;
}

interface WaitlistEntry {
  id: string;
  preferred_date?: string;
  joined_at: string;
  profiles_doctor?: DoctorProfile;
  reason: string;
  urgency?: string;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: appointments, isLoading, error } = useQuery<Appointment[]>({
    queryKey: ['patientAppointments'],
    queryFn: () => patientAPI.getAppointments().then((res) => res.data)
  });

  const { data: waitlist, isLoading: waitlistLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['patientWaitlist'],
    queryFn: () => patientAPI.getWaitlist().then((res) => res.data?.data || res.data || [])
  });

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const manager = getWebSocketManager();
        if (manager) {
          const conn = await manager.connect('notifications');
          conn.on('appointment_update', () => {
            queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
            queryClient.invalidateQueries({ queryKey: ['patientWaitlist'] });
            toast.info("Appointments updated in real-time");
          });
        }
      } catch (err) {
        console.error("Failed to setup real-time appointments updates:", err);
      }
    };
    setupRealtime();
  }, [queryClient]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => patientAPI.cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      toast.success(t('patient.appointments.cancelled', 'Appointment cancelled'));
    },
    onError: () => {
      toast.error(t('patient.appointments.cancel_failed', 'Failed to cancel appointment'));
    }
  });

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-[#1F2D3D] mb-2">{t('patient.appointments.load_error', 'Failed to load appointments')}</h2>
        <p className="text-[#64748B] mb-6">{(error as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['patientAppointments'] })}>{t('common.retry', 'Retry')}</Button>
      </div>
    );
  }

  const allAppointments = Array.isArray(appointments) ? appointments : [];
  const upcomingAppts = allAppointments.filter(
    (a) => a.scheduled_at && !isPast(new Date(a.scheduled_at)) && a.status !== "cancelled"
  );
  const pastAppts = allAppointments.filter(
    (a) => a.scheduled_at && (isPast(new Date(a.scheduled_at)) || a.status === "cancelled") && a.status !== "waitlist"
  );

  // Combine traditional waitlist apps (if any) with the dedicated waitlist table
  const waitlistAppts: Appointment[] = [
    ...allAppointments.filter((a) => a.status === "waitlist"),
    ...(Array.isArray(waitlist) ? waitlist : []).map((w): Appointment => ({
      id: w.id,
      status: "waitlist",
      scheduled_at: w.preferred_date || w.joined_at,
      profiles_doctor: w.profiles_doctor,
      notes: w.reason,
      consultation_type: w.urgency === 'high' ? t('patient.appointments.urgent_waitlist', 'Urgent Waitlist') : t('patient.appointments.waitlist', 'Waitlist')
    }))
  ];

  // Apply Advanced Filters
  const applyFilters = (list: Appointment[]) => {
    return list.filter((a) => {
      const doctorName = (a.profiles_doctor?.name || "").toLowerCase();
      const specialty = (a.profiles_doctor?.specialty || "").toLowerCase();
      const type = (a.consultation_type || a.type || "").toLowerCase();

      const matchesSearch = doctorName.includes(searchTerm.toLowerCase()) || specialty.includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || type.includes(filterType.toLowerCase());

      return matchesSearch && matchesType;
    });
  };

  const filteredUpcoming = applyFilters(upcomingAppts);
  const filteredPast = applyFilters(pastAppts);
  const filteredWaitlist = applyFilters(waitlistAppts);

  const safeFormat = (dateStr: string | undefined | null, formatStr: string) => {
    if (!dateStr) return t('common.tbd', 'TBD');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return t('common.invalid_date', 'Invalid Date');
    return format(date, formatStr);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(t('patient.appointments.title', "My Appointments"), 14, 15);
    autoTable(doc, {
      head: [[t('common.date', 'Date'), t('patient.appointments.time', 'Time'), t('common.doctor', 'Doctor'), t('common.specialty', 'Specialty'), t('patient.appointments.status', 'Status'), t('common.type', 'Type')]],
      body: allAppointments.map((a) => [
        safeFormat(a.scheduled_at, "MMM d, yyyy"),
        safeFormat(a.scheduled_at, "h:mm a"),
        a.profiles_doctor?.name || '-',
        a.profiles_doctor?.specialty || '-',
        t(`patient.appointments.status_${a.status}`, a.status).toUpperCase(),
        a.consultation_type || a.type || t('patient.appointments.in_person', 'In-person')
      ]),
      startY: 20,
    });
    doc.save("appointments_history.pdf");
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(allAppointments.map((a) => ({
      [t('common.date', "Date")]: safeFormat(a.scheduled_at, "MMM d, yyyy"),
      [t('patient.appointments.time', "Time")]: safeFormat(a.scheduled_at, "h:mm a"),
      [t('common.doctor', "Doctor")]: a.profiles_doctor?.name || '-',
      [t('common.specialty', "Specialty")]: a.profiles_doctor?.specialty || '-',
      [t('patient.appointments.status', "Status")]: t(`patient.appointments.status_${a.status}`, a.status).toUpperCase(),
      [t('common.type', "Type")]: a.consultation_type || a.type || t('patient.appointments.in_person', 'In-person')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('patient.appointments.sheet_name', "Appointments"));
    XLSX.writeFile(wb, "appointments_history.csv");
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const doctorName = appointment.profiles_doctor?.name || t("common.doctor", "Doctor");
    const specialty = appointment.profiles_doctor?.specialty || t("common.speciality", "Specialist");

    return (
      <Card className="p-6 hover:shadow-lg transition-shadow bg-white border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#1F2D3D]">
              {t("common.dr_prefix", "Dr.")} {doctorName.replace(t("common.dr_prefix", "Dr.") + " ", "").replace("Dr. ", "")}
            </h3>
            <p className="text-sm text-[#1F2D3D]/70 capitalize">
              {t(`doctor.specialty.${specialty.toLowerCase().replace(/ /g, '_')}`, specialty.replace("_", " "))}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              appointment.status === "confirmed" || appointment.status === "scheduled" || appointment.status === "booked"
                ? "bg-green-50 text-green-700 border-green-200"
                : appointment.status === "cancelled"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
            }
          >
            {t(`patient.appointments.status_${appointment.status}`, appointment.status).toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#1F2D3D]/70">
            <Calendar className="w-4 h-4" />
            {safeFormat(appointment.scheduled_at, "EEEE, MMMM d, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#1F2D3D]/70">
            <Clock className="w-4 h-4" />
            {safeFormat(appointment.scheduled_at, "h:mm a")}
          </div>
          {(appointment.consultation_type === "video" || appointment.type === "video") && (
            <div className="flex items-center gap-2 text-sm text-[#0EA5E9]">
              <Video className="w-4 h-4" />
              {t('patient.appointments.video_consultation', 'Video Consultation')}
            </div>
          )}
        </div>

        {appointment.notes && (
          <p className="text-sm text-[#1F2D3D]/70 mb-4 p-3 bg-gray-50 rounded italic">
            {appointment.notes}
          </p>
        )}

        <div className="flex gap-3">
          {(appointment.consultation_type === "video" || appointment.type === "video") && (appointment.status === "confirmed" || appointment.status === "scheduled") && (
            <Button
              className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              onClick={() => navigate(`/patient/waiting-room/${appointment.id}`)}
            >
              <Video className="w-4 h-4 mr-2" />
              {t('patient.appointments.enter_waiting_room', 'Enter Waiting Room')}
            </Button>
          )}
          {(appointment.status === "confirmed" || appointment.status === "scheduled") && (
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 border-red-100"
              onClick={() => cancelMutation.mutate(appointment.id)}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gray-50/50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#1F2D3D] mb-2">{t('patient.appointments.title', 'My Appointments')}</h1>
              <p className="text-[#64748B]">{t('patient.appointments.subtitle', 'Manage your consultations and upcoming visits')}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportCSV} className="border-border text-foreground hover:bg-muted">
                <Download className="w-4 h-4 mr-2" /> {t('common.csv', 'CSV')}
              </Button>
              <Button onClick={exportPDF} className="bg-[#0D9488] hover:bg-[#0F766E] text-white border-none">
                <FileText className="w-4 h-4 mr-2" /> {t('common.pdf', 'PDF')}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card p-4 rounded-2xl shadow-sm border border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder={t('patient.appointments.search_placeholder', 'Search by doctor name or specialty...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488] transition-all text-sm text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground shrink-0" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488] text-sm font-medium text-foreground"
              >
                <option value="all">{t('common.all_types', 'All Types')}</option>
                <option value="in-person">{t('patient.appointments.in_person', 'In-person')}</option>
                <option value="video">{t('patient.appointments.video', 'Video')}</option>
              </select>
            </div>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full sm:w-80 grid-cols-3 mb-8 bg-white border border-gray-200">
              <TabsTrigger value="upcoming">
                {t('patient.appointments.upcoming', 'Upcoming')} ({filteredUpcoming.length})
              </TabsTrigger>
              <TabsTrigger value="waitlist">{t('patient.appointments.waitlist', 'Waitlist')} ({filteredWaitlist.length})</TabsTrigger>
              <TabsTrigger value="past">{t('patient.appointments.past', 'Past')} ({filteredPast.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-2xl" />)}
                </div>
              ) : filteredUpcoming.length === 0 ? (
                <Card className="p-12 text-center bg-white border-dashed border-2">
                  <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-[#64748B] mb-6 text-lg">{t('patient.appointments.no_upcoming', 'No appointments found matching your search.')}</p>
                  {!searchTerm && (
                    <Button onClick={() => navigate("/patient/doctors")} size="lg" className="bg-[#0D9488] text-white">
                      {t('patient.appointments.book_first', 'Book Your First Appointment')}
                    </Button>
                  )}
                </Card>
              ) : (
                filteredUpcoming.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))
              )}
            </TabsContent>

            <TabsContent value="waitlist" className="space-y-6">
              {isLoading || waitlistLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-2xl" />)}
                </div>
              ) : filteredWaitlist.length === 0 ? (
                <Card className="p-12 text-center bg-white border-dashed border-2">
                  <Clock className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-[#64748B] mb-6 text-lg">{t('patient.appointments.no_waitlist', 'No waitlist entries found matching your search.')}</p>
                </Card>
              ) : (
                filteredWaitlist.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-2xl" />)}
                </div>
              ) : filteredPast.length === 0 ? (
                <Card className="p-12 text-center bg-white border-dashed border-2">
                  <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-[#64748B]">{t('patient.appointments.no_past', 'No past appointment history matched your criteria.')}</p>
                </Card>
              ) : (
                filteredPast.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

