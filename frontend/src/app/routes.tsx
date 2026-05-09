import { createBrowserRouter, Navigate } from "react-router";
import React, { lazy, Suspense, ComponentType } from "react";
import Root from "./pages/Root";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import SignUpRolePage from "./pages/SignUpRolePage";
// Helper to wrap lazy components with Suspense
const withSuspense = (Component: ComponentType) => {
    return () => (
        <Suspense fallback={<PageLoadingSkeleton />}>
            <Component />
        </Suspense>
    );
};

import PatientLoginPage from "./pages/PatientLoginPage";
const DoctorLoginPage = withSuspense(lazy(() => import("./pages/DoctorLoginPage")));
const AdminLoginPage = withSuspense(lazy(() => import("./pages/AdminLoginPage")));
import SignUpPage from "./pages/SignUpPage";
const DoctorSignUpPage = withSuspense(lazy(() => import("./pages/DoctorSignUpPage")));
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "../components/features/domain/ProtectedRoute";
import { PageLoadingSkeleton } from "../components/shared/PageLoadingSkeleton";

// Lazy load heavy pages for better performance
const DashboardPage = withSuspense(lazy(() => import("./pages/DashboardPage")));
const DoctorsPage = withSuspense(lazy(() => import("./pages/DoctorsPage")));
const DoctorDetailPage = withSuspense(lazy(() => import("./pages/DoctorDetailPage")));
const AppointmentsPage = withSuspense(lazy(() => import("./pages/AppointmentsPage")));
const VideoCallPage = withSuspense(lazy(() => import("./pages/VideoCallPage")));
const WaitingRoomPage = withSuspense(lazy(() => import("./pages/WaitingRoomPage")));
const AnemiaDetectionPage = withSuspense(lazy(() => import("./pages/AnemiaDetectionPage")));
const CataractScanPage = withSuspense(lazy(() => import("./pages/patient/CataractScanPage")));
const DiabeticRetinopathyScanPage = withSuspense(lazy(() => import("./pages/patient/DiabeticRetinopathyScanPage")));
const MentalHealthPage = withSuspense(lazy(() => import("./pages/patient/MentalHealthPage")));
const ParkinsonsVoicePage = withSuspense(lazy(() => import("./pages/patient/ParkinsonsVoicePage")));
const ARSessionPage = withSuspense(lazy(() => import("./pages/patient/ARSessionPage")));
const MedicationSchedulePage = withSuspense(lazy(() => import("./pages/patient/MedicationSchedulePage")));
const PROSubmissionPage = withSuspense(lazy(() => import("./pages/patient/PROSubmissionPage")));
const PatientExercisesPage = withSuspense(lazy(() => import("./pages/patient/PatientExercisesPage")));
const ProfilePage = withSuspense(lazy(() => import("./pages/ProfilePage")));
const NearbyHospitalsPage = withSuspense(lazy(() => import("./pages/NearbyHospitalsPage")));
const MedicalHistoryPage = withSuspense(lazy(() => import("./pages/MedicalHistoryPage")));

// New Feature Pages - Lazy loaded
const MessagesPage = withSuspense(lazy(() => import("./pages/MessagesPage")));
const AchievementsPage = withSuspense(lazy(() => import("./pages/AchievementsPage")));
const ReferralPage = withSuspense(lazy(() => import("./pages/ReferralPage")));
const NotificationSettingsPage = withSuspense(lazy(() => import("./pages/NotificationSettingsPage")));
const DocumentsPage = withSuspense(lazy(() => import("./pages/DocumentsPage")));
const PrescriptionTemplatesPage = withSuspense(lazy(() => import("./pages/PrescriptionTemplatesPage")));
const HealthTimelinePage = withSuspense(lazy(() => import("./pages/HealthTimelinePage")));
const PatientChatbotPage = withSuspense(lazy(() => import("./pages/PatientChatbotPage")));
const ModelsPage = withSuspense(lazy(() => import("./pages/ModelsPage")));
const LabAnalyzerPage = withSuspense(lazy(() => import("./pages/LabAnalyzerPage")));
const InsuranceVerificationPage = withSuspense(lazy(() => import("./pages/InsuranceVerificationPage")));
const HealthRiskAssessmentPage = withSuspense(lazy(() => import("./pages/HealthRiskAssessmentPage")));
const MedicationRemindersPage = withSuspense(lazy(() => import("./pages/MedicationRemindersPage")));
const MedicationsListPage = withSuspense(lazy(() => import("./pages/patient/medications/MedicationsListPage")));
const MedicationDetailsPage = withSuspense(lazy(() => import("./pages/patient/medications/MedicationDetailsPage")));
const MedicationLogPage = withSuspense(lazy(() => import("./pages/patient/medications/MedicationLogPage")));
const HealthGoalsDashboard = withSuspense(lazy(() => import("./pages/patient/goals/HealthGoalsDashboard")));
const CreateHealthGoalPage = withSuspense(lazy(() => import("./pages/patient/goals/CreateHealthGoalPage")));
const HealthGoalDetailsPage = withSuspense(lazy(() => import("./pages/patient/goals/HealthGoalDetailsPage")));
const LogGoalProgressPage = withSuspense(lazy(() => import("./pages/patient/goals/LogGoalProgressPage")));
const FamilyMembersPage = withSuspense(lazy(() => import("./pages/patient/family/FamilyMembersPage")));
const AddEditFamilyMemberPage = withSuspense(lazy(() => import("./pages/patient/family/AddEditFamilyMemberPage")));
const VitalsHistoryPage = withSuspense(lazy(() => import("./pages/patient/records/VitalsHistoryPage")));
const LabResultsHistoryPage = withSuspense(lazy(() => import("./pages/patient/records/LabResultsHistoryPage")));
const FollowUpPage = withSuspense(lazy(() => import("./pages/FollowUpPage")));
const IntakeFormPage = withSuspense(lazy(() => import("./pages/IntakeFormPage")));
const SemanticSearchPage = withSuspense(lazy(() => import("./pages/SemanticSearchPage")));
const BookingSummaryPage = withSuspense(lazy(() => import("./pages/BookingSummaryPage")));
const SettingsPage = withSuspense(lazy(() => import("./pages/SettingsPage")));
const ChronicDiseaseTracker = withSuspense(lazy(() => import("./pages/ChronicDiseaseTracker")));

// Animation Demo Page
const AnimationDemoPage = withSuspense(lazy(() => import("./pages/AnimationDemo")));

// Doctor Portal Pages
const DoctorDashboardPage = withSuspense(lazy(() => import("./pages/DoctorDashboardPage")));
const AvailabilityPage = withSuspense(lazy(() => import("./pages/AvailabilityPage")));
const DoctorAppointmentsPage = withSuspense(lazy(() => import("./pages/DoctorAppointmentsPage")));
const DoctorScansPage = withSuspense(lazy(() => import("./pages/DoctorScansPage")));
const DoctorScanDetailPage = withSuspense(lazy(() => import("./pages/DoctorScanDetailPage")));
const DoctorRatingsPage = withSuspense(lazy(() => import("./pages/DoctorRatingsPage")));
const DoctorRevenuePage = withSuspense(lazy(() => import("./pages/DoctorRevenuePage")));
const DoctorAlertsPage = withSuspense(lazy(() => import("./pages/doctor/AlertsPage")));
const DoctorPrescriptionBuilderPage = withSuspense(lazy(() => import("./pages/doctor/DoctorPrescriptionBuilder")));
const PatientTimelineViewPage = withSuspense(lazy(() => import("./pages/doctor/PatientTimelineView")));
const DoctorFollowUpTemplatesPage = withSuspense(lazy(() => import("./pages/doctor/DoctorFollowUpTemplates")));
const DoctorPROBuilderPage = withSuspense(lazy(() => import("./pages/doctor/DoctorPROBuilder")));
const PROAnalyticsPage = withSuspense(lazy(() => import("./pages/doctor/PROAnalytics")));
const DoctorExercisesPage = withSuspense(lazy(() => import("./pages/doctor/DoctorExercisesPage")));
const DoctorPatientsPage = withSuspense(lazy(() => import("./pages/doctor/PatientsPage")));
const DoctorReferralPage = withSuspense(lazy(() => import("./pages/doctor/ReferralPage")));

// Doctor Analytics Pages
const DoctorAnalyticsDashboard = withSuspense(lazy(() => import("./pages/doctor/analytics/DoctorAnalyticsDashboard")));
const DoctorPatientAnalytics = withSuspense(lazy(() => import("./pages/doctor/analytics/DoctorPatientAnalytics")));
const DoctorRevenueAnalytics = withSuspense(lazy(() => import("./pages/doctor/analytics/DoctorRevenueAnalytics")));

// Doctor Templates Pages
const NoteTemplatesList = withSuspense(lazy(() => import("./pages/doctor/templates/NoteTemplatesList")));
const CreateEditNoteTemplate = withSuspense(lazy(() => import("./pages/doctor/templates/CreateEditNoteTemplate")));

// Doctor Patient Management Pages
const PatientDetailsPage = withSuspense(lazy(() => import("./pages/doctor/patients/PatientDetailsPage")));
const PatientMedicalHistory = withSuspense(lazy(() => import("./pages/doctor/patients/PatientMedicalHistory")));

// Doctor Earnings Pages
const DoctorEarningsSummary = withSuspense(lazy(() => import("./pages/doctor/earnings/DoctorEarningsSummary")));
const DoctorTransactionHistory = withSuspense(lazy(() => import("./pages/doctor/earnings/DoctorTransactionHistory")));

// Doctor Settings Pages
const DoctorProfileSettings = withSuspense(lazy(() => import("./pages/doctor/settings/DoctorProfileSettings")));
const DoctorAvailabilitySettings = withSuspense(lazy(() => import("./pages/doctor/settings/DoctorAvailabilitySettings")));
const DoctorNotificationSettings = withSuspense(lazy(() => import("./pages/doctor/settings/DoctorNotificationSettings")));

// Admin Portal Pages
const AdminLayout = withSuspense(lazy(() => import("./pages/admin/AdminLayout")));
const AdminDashboardPage = withSuspense(lazy(() => import("./pages/admin/AdminDashboardPage")));
const AdminPatientsPage = withSuspense(lazy(() => import("./pages/admin/AdminPatientsPage")));
const AdminPatientDetailPage = withSuspense(lazy(() => import("./pages/admin/AdminPatientDetailPage")));
const AdminDoctorsPage = withSuspense(lazy(() => import("./pages/admin/AdminDoctorsPage")));
const AdminAppointmentsPage = withSuspense(lazy(() => import("./pages/admin/AdminAppointmentsPage")));
const AdminAppointmentDetailPage = withSuspense(lazy(() => import("./pages/admin/AdminAppointmentDetailPage")));
const AdminScansPage = withSuspense(lazy(() => import("./pages/admin/AdminScansPage")));
const AdminSettingsPage = withSuspense(lazy(() => import("./pages/admin/AdminSettingsPage")));
const AdminAnalyticsPage = withSuspense(lazy(() => import("./pages/admin/AdminAnalyticsPage")));
const AdminAuditLogsPage = withSuspense(lazy(() => import("./pages/admin/AdminAuditLogsPage")));
const AdminReportsPage = withSuspense(lazy(() => import("./pages/admin/AdminReportsPage")));
const AdminNewsletterPage = withSuspense(lazy(() => import("./pages/admin/NewsletterPage")));
const AdminBlogsPage = withSuspense(lazy(() => import("./pages/admin/AdminBlogsPage")));
const AdminContactMessagesPage = withSuspense(lazy(() => import("./pages/admin/ContactMessagesPage")));
const AdminReviewsPage = withSuspense(lazy(() => import("./pages/admin/ReviewsPage")));
const AdminTeamPage = withSuspense(lazy(() => import("./pages/admin/AdminTeamPage")));
const EpidemicRadarPage = withSuspense(lazy(() => import("./pages/admin/EpidemicRadarPage")));
const SystemHealthPage = withSuspense(lazy(() => import("./pages/admin/SystemHealthPage")));
const ConfigurationPage = withSuspense(lazy(() => import("./pages/admin/ConfigurationPage")));
const SecurityPage = withSuspense(lazy(() => import("./pages/admin/SecurityPage")));
const AdminComplianceDashboardPage = withSuspense(lazy(() => import("./pages/admin/AdminComplianceDashboard")));
const AdminFDAApmPage = withSuspense(lazy(() => import("./pages/admin/AdminFDAApmMonitoring")));
const AdminIEC62304Page = withSuspense(lazy(() => import("./pages/admin/AdminIEC62304Traceability")));
const AdminSOC2Page = withSuspense(lazy(() => import("./pages/admin/AdminSOC2Evidence")));
const AdminFHIRPage = withSuspense(lazy(() => import("./pages/admin/AdminFHIRResourceManager")));
const MCPManagementPage = withSuspense(lazy(() => import("./pages/admin/MCPManagementPage")));
const AdminComplaintPage = withSuspense(lazy(() => import("./pages/admin/AdminComplaintManagement")));
const AdminUsersPage = withSuspense(lazy(() => import("./pages/admin/AdminUsersPage")));
const AdminUserDetailPage = withSuspense(lazy(() => import("./pages/admin/AdminUserDetailPage")));
const DoctorVerificationPage = withSuspense(lazy(() => import("./pages/admin/DoctorVerificationPage")));
const PaymentManagementPage = withSuspense(lazy(() => import("./pages/admin/PaymentManagementPage")));
const PaymentDetailPage = withSuspense(lazy(() => import("./pages/admin/PaymentDetailPage")));
const RefundManagementPage = withSuspense(lazy(() => import("./pages/admin/RefundManagementPage")));

// Public Static Pages
const AboutPage = withSuspense(lazy(() => import("./pages/public/AboutPage")));
const HowItWorksPage = withSuspense(lazy(() => import("./pages/public/HowItWorksPage")));
const ContactPage = withSuspense(lazy(() => import("./pages/public/ContactPage")));
const PrivacyPolicyPage = withSuspense(lazy(() => import("./pages/public/PrivacyPolicyPage")));
const AuthorPage = withSuspense(lazy(() => import("./pages/public/AuthorPage")));
const TermsOfServicePage = withSuspense(lazy(() => import("./pages/public/TermsOfServicePage")));
const FAQPage = withSuspense(lazy(() => import("./pages/public/FAQPage")));
const ServicesPage = withSuspense(lazy(() => import("./pages/public/ServicesPage")));
const PricingPage = withSuspense(lazy(() => import("./pages/public/PricingPage")));
const HelpCenterPage = withSuspense(lazy(() => import("./pages/public/HelpCenterPage")));
const ImpactPage = withSuspense(lazy(() => import("./pages/public/ImpactPage")));
const ResearchPage = withSuspense(lazy(() => import("./pages/public/ResearchPage")));
const PartnersPage = withSuspense(lazy(() => import("./pages/public/PartnersPage")));
const PressPage = withSuspense(lazy(() => import("./pages/public/PressPage")));
const CareersPage = withSuspense(lazy(() => import("./pages/public/CareersPage")));
const DemoPage = withSuspense(lazy(() => import("./pages/public/DemoPage")));
const BlogPage = withSuspense(lazy(() => import("./pages/public/BlogPage")));
const GlobalReachPage = withSuspense(lazy(() => import("./pages/public/GlobalReachPage")));

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        children: [
            // Public
            { index: true, Component: HomePage },
            { path: "login", Component: LoginPage },
            { path: "login/patient", Component: PatientLoginPage },
            { path: "login/doctor", Component: DoctorLoginPage },
            { path: "login/admin", Component: AdminLoginPage },
            { path: "auth/callback", Component: AuthCallbackPage },
            { path: "signup", Component: SignUpRolePage },
            { path: "signup/patient", Component: SignUpPage },
            { path: "signup/doctor", Component: DoctorSignUpPage },

            // Aux pages
            { path: "about", Component: AboutPage },
            { path: "how-it-works", Component: HowItWorksPage },
            { path: "contact", Component: ContactPage },
            { path: "privacy", Component: PrivacyPolicyPage },
            { path: "author", Component: AuthorPage },
            { path: "terms", Component: TermsOfServicePage },
            { path: "faq", Component: FAQPage },
            { path: "services", Component: ServicesPage },
            { path: "pricing", Component: PricingPage },
            { path: "help-center", Component: HelpCenterPage },
            { path: "impact", Component: ImpactPage },
            { path: "research", Component: ResearchPage },
            { path: "partners", Component: PartnersPage },
            { path: "press", Component: PressPage },
            { path: "careers", Component: CareersPage },
            { path: "demo", Component: DemoPage },
            { path: "blog", Component: BlogPage },
            { path: "global-reach", Component: GlobalReachPage },

            // Animation Demo (Development/Testing)
            { path: "animation-demo", Component: AnimationDemoPage },

            // Route Aliases (to prevent 404s)
            { path: "register", element: <Navigate to="/signup" replace /> },
            { path: "privacy-policy", element: <Navigate to="/privacy" replace /> },
            { path: "terms-of-service", element: <Navigate to="/terms" replace /> },

            // Patient Portal (Protected)
            {
                path: "patient",
                element: <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']} />,
                children: [
                    { path: "dashboard", Component: DashboardPage },
                    { path: "models", Component: ModelsPage },
                    { path: "scan", Component: AnemiaDetectionPage },
                    { path: "cataract-scan", Component: CataractScanPage },
                    { path: "dr-scan", Component: DiabeticRetinopathyScanPage },
                    { path: "mental-health", Component: MentalHealthPage },
                    { path: "parkinsons-voice", Component: ParkinsonsVoicePage },
                    { path: "exercises/:assignmentId/session", Component: ARSessionPage },
                    { path: "medication-schedule", Component: MedicationSchedulePage },
                    { path: "pro-questionnaires", Component: PROSubmissionPage },
                    { path: "exercises", Component: PatientExercisesPage },
                    { path: "hospitals", Component: NearbyHospitalsPage },
                    { path: "doctors", Component: DoctorsPage },
                    { path: "doctors/:id", Component: DoctorDetailPage },
                    { path: "booking-summary/:doctorId", Component: BookingSummaryPage },
                    { path: "appointments", Component: AppointmentsPage },
                    { path: "waiting-room/:appointmentId", Component: WaitingRoomPage },
                    { path: "consultation/:appointmentId", Component: VideoCallPage },
                    { path: "history", Component: MedicalHistoryPage },
                    { path: "profile", Component: ProfilePage },
                    { path: "messages", Component: MessagesPage },
                    { path: "timeline", Component: HealthTimelinePage },
                    { path: "achievements", Component: AchievementsPage },
                    { path: "documents", Component: DocumentsPage },
                    { path: "settings/notifications", Component: NotificationSettingsPage },
                    { path: "chatbot", Component: PatientChatbotPage },
                    { path: "lab-analyzer", Component: LabAnalyzerPage },
                    { path: "insurance", Component: InsuranceVerificationPage },
                    { path: "risk-assessment", Component: HealthRiskAssessmentPage },
                    { path: "medications", Component: MedicationsListPage },
                    { path: "medications/reminders", Component: MedicationRemindersPage },
                    { path: "medications/:medicationId", Component: MedicationDetailsPage },
                    { path: "medications/:medicationId/log", Component: MedicationLogPage },
                    { path: "goals", Component: HealthGoalsDashboard },
                    { path: "goals/create", Component: CreateHealthGoalPage },
                    { path: "goals/:goalId", Component: HealthGoalDetailsPage },
                    { path: "goals/:goalId/log", Component: LogGoalProgressPage },
                    { path: "family", Component: FamilyMembersPage },
                    { path: "family/add", Component: AddEditFamilyMemberPage },
                    { path: "family/edit/:memberId", Component: AddEditFamilyMemberPage },
                    { path: "records/vitals", Component: VitalsHistoryPage },
                    { path: "records/lab-results", Component: LabResultsHistoryPage },
                    { path: "follow-up/:appointmentId", Component: FollowUpPage },
                    { path: "intake/:specialty/:appointmentId", Component: IntakeFormPage },
                    { path: "referrals", Component: ReferralPage },
                    { path: "tracker", Component: ChronicDiseaseTracker },
                    { path: "search", Component: SemanticSearchPage },
                    { path: "settings", Component: SettingsPage },
                ]
            },

             // Doctor Portal (Protected)
             {
                 path: "doctor",
                 element: <ProtectedRoute allowedRoles={['doctor', 'admin']} />,
                 children: [
                     { path: "dashboard", Component: DoctorDashboardPage },
                     { path: "patients", Component: DoctorPatientsPage },
                     { path: "availability", Component: AvailabilityPage },
                     { path: "appointments", Component: DoctorAppointmentsPage },
                     { path: "scans", Component: DoctorScansPage },
                     { path: "scans/:id", Component: DoctorScanDetailPage },
                     { path: "ratings", Component: DoctorRatingsPage },
                     { path: "revenue", Component: DoctorRevenuePage },
                     { path: "alerts", Component: DoctorAlertsPage },
                     { path: "consultation/:appointmentId", Component: VideoCallPage },
                     { path: "profile", Component: ProfilePage },
                     { path: "messages", Component: MessagesPage },
                     { path: "achievements", Component: AchievementsPage },
                     { path: "referrals", Component: DoctorReferralPage },
                     { path: "prescriptions", Component: PrescriptionTemplatesPage },
                     { path: "prescriptions/new", Component: DoctorPrescriptionBuilderPage },
                     { path: "patients/:id/timeline", Component: PatientTimelineViewPage },
                     { path: "follow-up-templates", Component: DoctorFollowUpTemplatesPage },
                     { path: "pro-builder", Component: DoctorPROBuilderPage },
                     { path: "patients/:patientId/pro-analytics", Component: PROAnalyticsPage },
                     { path: "exercises", Component: DoctorExercisesPage },
                     { path: "documents", Component: DocumentsPage },
                     { path: "settings/notifications", Component: NotificationSettingsPage },
                     { path: "settings", Component: SettingsPage },
                     // Analytics Routes
                     { path: "analytics", Component: DoctorAnalyticsDashboard },
                     { path: "analytics/patients", Component: DoctorPatientAnalytics },
                     { path: "analytics/revenue", Component: DoctorRevenueAnalytics },
                     // Templates Routes
                     { path: "templates/notes", Component: NoteTemplatesList },
                     { path: "templates/notes/new", Component: CreateEditNoteTemplate },
                     { path: "templates/notes/edit/:templateId", Component: CreateEditNoteTemplate },
                     { path: "templates/notes/:templateId", Component: CreateEditNoteTemplate },
                     // Patient Management Routes
                     { path: "patients/:patientId", Component: PatientDetailsPage },
                     { path: "patients/:patientId/history", Component: PatientMedicalHistory },
                     // Earnings Routes
                     { path: "earnings", Component: DoctorEarningsSummary },
                     { path: "earnings/transactions", Component: DoctorTransactionHistory },
                     // Settings Routes
                     { path: "settings/profile", Component: DoctorProfileSettings },
                     { path: "settings/availability", Component: DoctorAvailabilitySettings },
                     { path: "settings/notifications", Component: DoctorNotificationSettings },
                 ]
             },
 
             {
                 path: "admin",
                 element: (
                     <ProtectedRoute allowedRoles={['admin']}>
                         <AdminLayout />
                     </ProtectedRoute>
                 ),
                 children: [
                     { index: true, Component: AdminDashboardPage },
                     { path: "dashboard", Component: AdminDashboardPage },
                     { path: "patients", Component: AdminPatientsPage },
                     { path: "patients/:id", Component: AdminPatientDetailPage },
                     { path: "doctors", Component: AdminDoctorsPage },
                     { path: "appointments", Component: AdminAppointmentsPage },
                     { path: "appointments/:id", Component: AdminAppointmentDetailPage },
                     { path: "scans", Component: AdminScansPage },
                     { path: "settings", Component: AdminSettingsPage },
                     { path: "analytics", Component: AdminAnalyticsPage },
                     { path: "audit-logs", Component: AdminAuditLogsPage },
                     { path: "reports", Component: AdminReportsPage },
                     { path: "messages", Component: MessagesPage },
                     { path: "achievements", Component: AchievementsPage },
                     { path: "newsletter", Component: AdminNewsletterPage },
                     { path: "blogs", Component: AdminBlogsPage },
                     { path: "contact-messages", Component: AdminContactMessagesPage },
                     { path: "reviews", Component: AdminReviewsPage },
                     { path: "team", Component: AdminTeamPage },
                     { path: "epidemic-radar", Component: EpidemicRadarPage },
                     { path: "system-health", Component: SystemHealthPage },
                     { path: "configuration", Component: ConfigurationPage },
                     { path: "security", Component: SecurityPage },
                     { path: "compliance", Component: AdminComplianceDashboardPage },
                     { path: "compliance/fda-apm", Component: AdminFDAApmPage },
                     { path: "compliance/iec62304", Component: AdminIEC62304Page },
                     { path: "compliance/soc2", Component: AdminSOC2Page },
                     { path: "compliance/complaints", Component: AdminComplaintPage },
                     { path: "fhir", Component: AdminFHIRPage },
                     { path: "mcp", Component: MCPManagementPage },
                     { path: "users", Component: AdminUsersPage },
                     { path: "users/:id", Component: AdminUserDetailPage },
                     { path: "doctors/verify/:id", Component: DoctorVerificationPage },
                     { path: "payments", Component: PaymentManagementPage },
                     { path: "payments/:id", Component: PaymentDetailPage },
                     { path: "refunds", Component: RefundManagementPage },
                 ]
             },

            // Legacy redirects
            { path: "dashboard", element: <Navigate to="/patient/dashboard" replace /> },
            { path: "doctors", element: <Navigate to="/patient/doctors" replace /> },
            { path: "appointments", element: <Navigate to="/patient/appointments" replace /> },
            { path: "profile", element: <Navigate to="/patient/profile" replace /> },

            // 404
            { path: "*", Component: NotFoundPage },
        ],
    },
]);
