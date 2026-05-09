/**
 * TypeScript interfaces for Patient Portal features
 */

// ==================== MEDICATIONS ====================

export interface Medication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribed_by?: string;
  prescribed_date?: string;
  start_date: string;
  end_date?: string;
  indication?: string;
  instructions?: string;
  quantity_prescribed?: number;
  refills_remaining?: number;
  status: 'active' | 'discontinued' | 'completed';
  reminder_times?: string[];
  reminder_enabled: boolean;
  adherence_rate?: number;
  adherence_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_at: string;
  taken_at?: string;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
  created_at: string;
}

export interface MedicationReminder {
  id: string;
  medication_id: string;
  reminder_time: string;
  enabled: boolean;
  days_of_week?: number[];
}

// ==================== HEALTH GOALS ====================

export interface HealthGoal {
  id: string;
  patient_id: string;
  goal_type: 'weight' | 'steps' | 'exercise' | 'sleep' | 'water' | 'blood_pressure' | 'blood_sugar' | 'custom';
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string;
  status: 'active' | 'completed' | 'abandoned';
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  value: number;
  recorded_at: string;
  notes?: string;
}

export interface GoalAchievement {
  id: string;
  patient_id: string;
  goal_id?: string;
  achievement_type: 'milestone' | 'streak' | 'completion';
  title: string;
  description?: string;
  badge_icon?: string;
  earned_at: string;
}

// ==================== FAMILY MEMBERS ====================

export interface FamilyMember {
  id: string;
  primary_user_id: string;
  member_user_id?: string;
  name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  email?: string;
  blood_type?: string;
  allergies?: string;
  medical_conditions?: string;
  can_view_records: boolean;
  can_book_appointments: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== DOCUMENTS ====================

export interface Document {
  id: string;
  patient_id: string;
  document_type: 'prescription' | 'lab_result' | 'scan' | 'report' | 'insurance' | 'other';
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  title?: string;
  description?: string;
  uploaded_by?: string;
  shared_with_doctor_id?: string;
  shared_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ==================== HEALTH RECORDS ====================

export interface VitalRecord {
  id: string;
  patient_id: string;
  vital_type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'bmi' | 'blood_sugar' | 'oxygen_saturation';
  value: string;
  unit: string;
  recorded_at: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  patient_id: string;
  test_name: string;
  test_category?: string;
  result_value?: number;
  result_text?: string;
  units?: string;
  reference_range?: string;
  abnormal_flag?: 'H' | 'L' | 'N';
  status: 'preliminary' | 'final' | 'corrected';
  collected_date?: string;
  reported_date?: string;
  ordered_by?: string;
  performed_by_lab?: string;
  notes?: string;
  critical_value: boolean;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  status: 'active' | 'completed' | 'cancelled';
  prescribed_date: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_type: 'appointment' | 'prescription' | 'lab_result' | 'vital' | 'document' | 'goal' | 'medication_log';
  event_date: string;
  title: string;
  description?: string;
  related_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==================== APPOINTMENTS ====================

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  estimated_duration: number;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: 'video' | 'in-person' | 'phone';
  reason?: string;
  chief_complaint?: string;
  notes?: string;
  consultation_fee?: number;
  payment_status?: 'pending' | 'paid' | 'refunded';
  video_room_id?: string;
  video_room_url?: string;
  created_at: string;
  updated_at: string;
}

// ==================== DASHBOARD ====================

export interface DashboardData {
  upcoming_appointments: Appointment[];
  recent_medications: Medication[];
  active_goals: HealthGoal[];
  recent_vitals: VitalRecord[];
  health_score?: number;
  notifications_count: number;
  messages_count: number;
}

export interface HealthSummary {
  total_appointments: number;
  completed_appointments: number;
  active_medications: number;
  active_goals: number;
  completed_goals: number;
  recent_vitals: VitalRecord[];
  recent_lab_results: LabResult[];
  health_alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  type: 'medication' | 'appointment' | 'vital' | 'lab_result' | 'goal';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action_required: boolean;
  action_url?: string;
  created_at: string;
}

// ==================== SETTINGS ====================

export interface PatientProfile {
  id: string;
  email: string;
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  medical_history?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_score?: number;
  points?: number;
  login_streak?: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  font_size: 'small' | 'medium' | 'large';
  high_contrast: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    appointment_reminders: boolean;
    medication_reminders: boolean;
    lab_results: boolean;
    health_tips: boolean;
  };
  call_preferences?: {
    voice_enabled: boolean;
    preferred_time: string;
    timezone: string;
  };
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ==================== FORM DATA ====================

export interface CreateGoalFormData {
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string;
}

export interface AddFamilyMemberFormData {
  name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  can_view_records: boolean;
  can_book_appointments: boolean;
}

export interface LogMedicationFormData {
  scheduled_at: string;
  taken_at: string;
  status: 'taken' | 'missed' | 'skipped';
  notes: string;
}

export interface LogProgressFormData {
  value: number;
  notes: string;
}
