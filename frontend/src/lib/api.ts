import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { supabase } from "./supabase";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Configure Axios Retry to gracefully handle network issues and rate limits
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on standard network/idempotent errors or rate limits (429)
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // If bypass auth is enabled, send special demo headers
  if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true") {
    const email = localStorage.getItem("bypassEmail") || "demo+patient@example.com";
    const role = localStorage.getItem("bypassRole") || "patient";
    config.headers["X-Demo-Email"] = email;
    config.headers["X-Demo-Role"] = role;
    
    if (import.meta.env.DEV) {
      console.log(`[API Interceptor] Bypass Auth active: ${email} (${role})`);
    }
    return config;
  }

  // Get current Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
    if (import.meta.env.DEV) {
      console.log(`[API Interceptor] Using Supabase token for: ${config.url}`);
    }
  } else {
    // Log only in development mode
    if (import.meta.env.DEV) {
      console.warn(
        "[API Interceptor] No session found, request will be unauthenticated:",
        config.url,
      );
    }
  }
  return config;
});

// Auth (using Supabase directly, but we can keep these here for convenience)
export const authAPI = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  register: (email: string, password: string, userData: Record<string, unknown>) =>
    supabase.auth.signUp({ email, password, options: { data: userData } }),
  logout: () => supabase.auth.signOut(),
  getCurrentUser: () => supabase.auth.getUser(),
  onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
    supabase.auth.onAuthStateChange(callback),
};

// Profile endpoints (if needed beyond direct Supabase usage)
export const profileAPI = {
  getProfile: (
    userId: string,
    role: "patient" | "doctor" | "admin" = "patient",
  ) => {
    const table = role === "doctor" ? "profiles_doctor" : role === "admin" ? "profiles_doctor" : "profiles_patient";
    return supabase.from(table).select("*").eq("id", userId).maybeSingle();
  },
  updateProfile: (
    userId: string,
    updates: Record<string, unknown>,
    role: "patient" | "doctor" | "admin" = "patient",
  ) => {
    const table = role === "doctor" ? "profiles_doctor" : role === "admin" ? "profiles_doctor" : "profiles_patient";
    return supabase
      .from(table)
      .update(updates)
      .eq("id", userId)
      .select();
  },
  uploadAvatar: (file: File, role: "patient" | "doctor" = "patient") => {
    const formData = new FormData();
    formData.append("file", file);
    const endpoint = role === "doctor" ? "/api/v1/doctor/profile/upload-avatar" : "/api/v1/patient/profile/upload-avatar";
    return api.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

// Patient endpoints
export const patientAPI = {
  getDashboard: () => api.get("/api/v1/patient/dashboard"),
  updateProfile: (updates: Record<string, unknown>) => api.put("/api/v1/patient/profile", updates),
  getRiskAssessments: () => api.get("/api/v1/patient/risk-assessments"),
  createRiskAssessment: (data: Record<string, unknown>) => api.post("/api/v1/patient/risk-assessments", data),
  getMedications: () => api.get("/api/v1/patient/medications"),
  addMedication: (data: Record<string, unknown>) => api.post("/api/v1/patient/medications", data),
  toggleMedication: (id: string, is_active: boolean) => api.put(`/api/v1/patient/medications/${id}/toggle`, { is_active }),
  deleteMedication: (id: string) => api.delete(`/api/v1/patient/medications/${id}`),
  getFollowUp: (appointmentId: string) => api.get(`/api/v1/patient/follow-ups/${appointmentId}`),
  submitFollowUp: (data: Record<string, unknown>) => api.post("/api/v1/patient/follow-ups", data),
  getFamilyMembers: () => api.get("/api/v1/patient/family-members"),
  addFamilyMember: (data: Record<string, unknown>) => api.post("/api/v1/patient/family-members", data),
  getVitals: () => api.get("/api/v1/patient/vitals"),
  addVitalLog: (data: Record<string, unknown>) => api.post("/api/v1/patient/vitals", data),
  getScans: () => api.get("/api/v1/patient/scans"),
  uploadScan: (formData: FormData) =>
    api.post("/api/v1/patient/scans/upload", formData),
  getAppointments: (params?: Record<string, unknown>) =>
    api.get("/api/v1/patient/appointments", { params }),
  bookAppointment: (data: Record<string, unknown>) =>
    api.post("/api/v1/patient/appointments", data),
  joinWaitlist: (data: Record<string, unknown>) =>
    api.post("/api/v1/waitlist", data),
  getWaitlist: () =>
    api.get("/api/v1/waitlist/patient"),
  getPrescriptions: () => api.get("/api/v1/patient/prescriptions"),
  getHistory: () => api.get("/api/v1/patient/history"),
  cancelAppointment: (id: string) =>
    api.put(`/api/v1/patient/appointments/${id}/cancel`),
  rescheduleAppointment: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/v1/patient/appointments/${id}/reschedule`, data),
  getTimeline: (params?: Record<string, unknown>) =>
    api.get("/api/v1/timeline", { params }),
  addTimelineEvent: (data: Record<string, unknown>) => api.post("/api/v1/timeline", data),
  getPROQuestionnaires: () => api.get("/api/v1/patient/pro-questionnaires"),
  getPROSubmissions: () => api.get("/api/v1/patient/pro-submissions"),
  submitPROQuestionnaire: (data: Record<string, unknown>) => api.post("/api/v1/patient/pro-submissions", data),
  triggerSOS: (data: { lat: number; lng: number }) => api.post("/api/v1/patient/sos", data),
  analyzeMentalHealth: (formData: FormData) => api.post("/api/v1/ml/mental-health/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyzeCataract: (formData: FormData) => api.post("/api/v1/ml/cataract/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyzeCataractWithXAI: (formData: FormData) => api.post("/api/v1/ml/cataract/analyze-xai", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyzeDR: (formData: FormData) => api.post("/api/v1/ml/dr/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyzeDRWithXAI: (formData: FormData) => api.post("/api/v1/ml/dr/analyze-xai", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyzeParkinsons: (formData: FormData) => api.post("/api/v1/ml/parkinsons/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  updateMedicationSchedule: (schedule: unknown[]) =>
    api.put("/api/v1/patient/medication-schedule", schedule),
  updateCallPreferences: (prefs: Record<string, unknown>) =>
    api.put("/api/v1/patient/call-preferences", prefs),
  exportData: (patientId: string, format: 'json' | 'csv' | 'fhir' = 'json') =>
    api.post(`/api/v1/patients/${patientId}/export`, { format }).then(res => res.data),
};

// Doctor endpoints
export const doctorAPI = {
  getDashboard: () => api.get("/api/v1/doctor/dashboard"),
  getPatients: () => api.get("/api/v1/doctor/patients"),
  getPatientDetails: (id: string) => api.get(`/api/v1/doctor/patients/${id}`),
  getPatientTimeline: (id: string) => api.get(`/api/v1/doctor/patients/${id}/timeline`),
  addClinicalNote: (id: string, data: Record<string, unknown>) => api.post(`/api/v1/doctor/patients/${id}/notes`, data),
  createPrescription: (data: Record<string, unknown>) =>
    api.post("/api/v1/doctor/prescriptions", data),
  uploadPrescriptionPDF: (id: string, file: Blob) => {
    const formData = new FormData();
    formData.append("file", file, `${id}.pdf`);
    return api.post(`/api/v1/doctor/prescriptions/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getReferralsSent: () => api.get("/api/v1/referrals/medical/sent"),
  getReferralsReceived: () => api.get("/api/v1/referrals/medical/received"),
  createReferral: (data: Record<string, unknown>) => api.post("/api/v1/referrals/medical", data),
  respondReferral: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/referrals/medical/${id}/respond`, data),
  updateAppointmentStatus: (id: string, status: string) =>
    api.put(`/api/v1/doctor/appointments/${id}/status`, { status }),
  getAppointments: () => api.get("/api/v1/doctor/appointments"),
  getWaitlist: () => api.get("/api/v1/waitlist/doctor"),
  updateWaitlistStatus: (id: string, status: string) => api.put(`/api/v1/waitlist/${id}/status?status=${status}`),
  updateAvailability: (availability: Record<string, unknown>) =>
    api.put("/api/v1/doctor/availability", { availability }),
  getPendingScans: () => api.get("/api/v1/doctor/scans/pending"),
  getScans: () => api.get("/api/v1/doctor/scans"),
  reviewScan: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/v1/doctor/scans/${id}/review`, data),
  getRatings: () => api.get("/api/v1/doctor/ratings"),
  getRevenue: (period: string = 'month') => api.get(`/api/v1/doctor/revenue?period=${period}`),
  getDoctors: () => api.get("/api/v1/doctors"),
  searchDoctors: (q: string) => api.get("/api/v1/doctors", { params: { q } }),
  getDoctor: (id: string) => api.get(`/api/v1/doctors/${id}`),

  // Follow-up Templates
  getFollowUpTemplates: () => api.get("/api/v1/doctor/follow-up-templates"),
  createFollowUpTemplate: (data: Record<string, unknown>) => api.post("/api/v1/doctor/follow-up-templates", data),
  updateFollowUpTemplate: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/doctor/follow-up-templates/${id}`, data),
  deleteFollowUpTemplate: (id: string) => api.delete(`/api/v1/doctor/follow-up-templates/${id}`),

  // PRO Questionnaires
  getPROQuestionnaires: () => api.get("/api/v1/doctor/pro-questionnaires"),
  createPROQuestionnaire: (data: Record<string, unknown>) => api.post("/api/v1/doctor/pro-questionnaires", data),
  updatePROQuestionnaire: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/doctor/pro-questionnaires/${id}`, data),
  deletePROQuestionnaire: (id: string) => api.delete(`/api/v1/doctor/pro-questionnaires/${id}`),
  getPatientPROData: (patientId: string) => api.get(`/api/v1/doctor/patients/${patientId}/pro-data`),
  getAlerts: () => api.get("/api/v1/doctor/alerts"),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => api.get("/api/v1/admin/stats"),
  getPendingDoctors: () => api.get("/api/v1/admin/doctors/pending"),
  verifyDoctor: (id: string, verified: boolean) =>
    api.put(`/api/v1/admin/doctors/${id}/verify`, { verified }),
  getPatients: () => api.get("/api/v1/admin/patients"),
  getPatient: (id: string) => api.get(`/api/v1/admin/patients/${id}`),
  getDoctors: () => api.get("/api/v1/admin/doctors"),
  getDoctor: (id: string) => api.get(`/api/v1/admin/doctors/${id}`),
  getAppointments: () => api.get("/api/v1/admin/appointments"),
  getAppointment: (id: string) => api.get(`/api/v1/admin/appointments/${id}`),
  getScans: () => api.get("/api/v1/admin/scans"),
  updateUserRole: (id: string, role: string) =>
    api.put(`/api/v1/admin/users/${id}/role`, { role }),
  getDashboardStats: () => api.get("/api/v1/analytics/metrics"),
  getAppointmentTrends: (days: number) => api.get("/api/v1/analytics/trends/appointments", { params: { days } }),
  getScanTrends: (days: number) => api.get("/api/v1/analytics/trends/scans", { params: { days } }),
  getDoctorPerformance: () => api.get("/api/v1/analytics/performance/doctors"),
  generateReport: (data: Record<string, unknown>) => api.post("/api/v1/reports/build", data),
  getReports: () => api.get("/api/v1/reports/history"),
};

export const complianceAPI = {
  // FDA APM
  getFDAModels: () => api.get("/api/v1/fda-apm/models"),
  getFDAMetrics: (model: string, hours = 24) => api.get(`/api/v1/fda-apm/metrics/${model}?hours=${hours}`),
  getFDAAlerts: () => api.get("/api/v1/fda-apm/alerts"),
  
  // SOC 2
  getSOC2Statistics: () => api.get("/api/v1/soc2/statistics"),
  getSOC2Controls: (category = "all") => api.get(`/api/v1/soc2/controls?category=${category}`),
  
  // IEC 62304
  getIECCoverageStats: () => api.get("/api/v1/iec62304/coverage-stats"),
  getIECRequirements: () => api.get("/api/v1/iec62304/requirements"),

  // Complaints
  getComplaints: (status?: string) => api.get("/api/v1/compliance/complaints", { params: { status } }),
  resolveComplaint: (id: string) => api.post(`/api/v1/compliance/complaints/${id}/resolve`),
  createComplaint: (data: Record<string, unknown>) => api.post("/api/v1/compliance/complaints", data),
};

export const fhirAPI = {
  getResources: (type: string) => api.get(`/api/v1/fhir/${type}`),
  getResource: (type: string, id: string) => api.get(`/api/v1/fhir/${type}/${id}`),
};

// Video endpoints
export const videoAPI = {
  getToken: (room: string, identity: string) =>
    api.get("/api/v1/video/token", { params: { room, identity } }),
  startRecording: (room_name: string) =>
    api.post("/api/v1/video/record/start", { room_name }),
  stopRecording: (egress_id: string) =>
    api.post("/api/v1/video/record/stop", { egress_id }),
};

export const insuranceAPI = {
  verify: (data: { provider: string; policy_number: string; patient_name: string; date_of_birth?: string }) =>
    api.post("/api/v1/insurance/verify", data),
};

// ML (Anemia) Proxy mapping directly to the new FastApi proxy route
export const anemiaAPI = {
  detectAnemia: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/v1/patient/scans/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

// Appointments (consolidated convenience API)
export const appointmentAPI = {
  createAppointment: (data: Record<string, unknown>) =>
    api.post("/api/v1/patient/appointments", data),
  getAppointments: (params?: Record<string, unknown>) =>
    api.get("/api/v1/patient/appointments", { params }),
  getAppointmentById: (id: string) =>
    api.get(`/api/v1/patient/appointments/${id}`),
  updateAppointment: (id: string, updates: Record<string, unknown>) =>
    api.put(`/api/v1/patient/appointments/${id}`, updates),
  cancelAppointment: (id: string) =>
    api.put(`/api/v1/patient/appointments/${id}/cancel`),
  rescheduleAppointment: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/v1/patient/appointments/${id}/reschedule`, data),
  getDoctorAppointments: () => api.get("/api/v1/doctor/appointments"),
  updateAppointmentStatus: (id: string, status: string) =>
    api.put(`/api/v1/doctor/appointments/${id}/status`, { status }),
};

// Payment endpoints
export const paymentAPI = {
  createOrder: (amount: number) => api.post("/api/v1/payment/create-order", { amount }),
  verifyPayment: (data: Record<string, unknown>) => api.post("/api/v1/payment/verify", data),
};

// Global Search
export const searchAPI = {
  globalSearch: (query: string) =>
    api.get("/api/v1/search/global", { params: { q: query } }),
};

// Platform Settings
export const settingsAPI = {
  getPlatformSettings: () =>
    api.get("/api/v1/admin/settings").then((res) => res.data),
  updatePlatformSettings: (data: Record<string, unknown>) =>
    api.put("/api/v1/admin/settings", data),
};

// Gamification
export const gamificationAPI = {
  getAchievements: () => api.get("/api/v1/patient/achievements"),
  getLeaderboard: () => api.get("/api/v1/patient/leaderboard"),
  getReferrals: () => api.get("/api/v1/patient/referrals"),
  createReferral: (data: Record<string, unknown>) => api.post("/api/v1/patient/referrals", data),
  trackLogin: () => api.post("/api/v1/gamification/track-login"),
};

// AI Hybrid Proxy Endpoints (DeepSeek + Gemini)
export const aiAPI = {
  triageSymptoms: (data: { symptoms: string | string[], age?: number, gender?: string, location?: string }) =>
    api.post("/api/v1/ai/triage", data),
  getAssistantResponse: (message: string, history: any[] = [], patientContext: string = "") =>
    api.post("/api/v1/ai/assistant", { message, history, patient_context: patientContext }),
  doctorScribe: (data: { consultation_notes: string, patient_name?: string, doctor_name?: string, specialty?: string }) =>
    api.post("/api/v1/ai/scribe", data),
  extractLabVitals: (formData: FormData) =>
    api.post("/api/v1/ai/extract-lab-vitals", formData, { headers: { "Content-Type": "multipart/form-data" } }),
};

// Documents
// Bug 2 Fix: Corrected API endpoints to match backend routes at /api/v1/documents
export const documentsAPI = {
  getDocuments: (category?: string) => api.get("/api/v1/documents", { params: { category } }),
  uploadDocument: (file: File, title: string, description: string, category: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    return api.post("/api/v1/documents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  deleteDocument: (id: string) => api.delete(`/api/v1/documents/${id}`),
  getCategories: () => api.get("/api/v1/documents/categories/list"),
  getSignedUrl: (id: string) => api.get(`/api/v1/documents/${id}/signed-url`),
};

// Templates (doctor follow-up templates)
export const templatesAPI = {
  getTemplates: () => api.get("/api/v1/doctor/templates"),
  createTemplate: (data: Record<string, unknown>) => api.post("/api/v1/doctor/templates", data),
  updateTemplate: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/doctor/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/api/v1/doctor/templates/${id}`),
};

// Messages / Conversations
export const messagesAPI = {
  getConversations: () => api.get("/api/v1/messages/conversations"),
  getMessages: (partnerId: string) =>
    api.get(`/api/v1/messages/${partnerId}`),
  sendMessage: (data: { recipient_id: string; content: string; attachment_url?: string }) =>
    api.post("/api/v1/messages/send", data),
  markRead: (partnerId: string) =>
    api.put(`/api/v1/messages/${partnerId}/read`),
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/v1/messages/upload-attachment", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// User Preferences
export const preferencesAPI = {
  getPreferences: () => api.get("/api/v1/preferences/dashboard-layout"),
  updatePreferences: (data: Record<string, unknown>) => api.post("/api/v1/preferences/dashboard-layout", data),
  getNotificationPreferences: () => api.get("/api/v1/preferences/notifications"),
  saveNotificationPreferences: (data: Record<string, unknown>) => api.post("/api/v1/preferences/notifications", data),
};

export default api;
