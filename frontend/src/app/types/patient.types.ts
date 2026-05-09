/**
 * Patient Portal Types
 * 
 * Type definitions for patient portal features including:
 * - Medication reminders
 * - Health goals
 * - Family accounts
 * - Document upload
 */

// ============================================================================
// Medication Reminder Types
// ============================================================================

export interface PatientMedication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  reminder_times: string[]; // ['08:00', '20:00']
  is_active: boolean;
  created_at: string;
  adherence_rate?: number;
}

export interface CreateMedicationRequest {
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  reminder_times: string[];
}

export interface UpdateMedicationRequest {
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  reminder_times?: string[];
  is_active?: boolean;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_at: string;
  taken_at?: string;
  status: 'taken' | 'missed' | 'skipped';
  created_at: string;
  medication?: PatientMedication;
}

export interface LogMedicationRequest {
  medication_id: string;
  scheduled_at: string;
  status: 'taken' | 'missed' | 'skipped';
  taken_at?: string;
}

export interface MedicationAdherence {
  medication_id: string;
  medication_name: string;
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  skipped_doses: number;
  adherence_rate: number;
  streak_days: number;
}

// ============================================================================
// Health Goals Types
// ============================================================================

export interface HealthGoal {
  id: string;
  patient_id: string;
  goal_type: 'weight' | 'exercise' | 'diet' | 'sleep' | 'blood_pressure' | 'blood_sugar' | 'custom';
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

export interface CreateHealthGoalRequest {
  goal_type: 'weight' | 'exercise' | 'diet' | 'sleep' | 'blood_pressure' | 'blood_sugar' | 'custom';
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string;
}

export interface UpdateHealthGoalRequest {
  title?: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  target_date?: string;
  status?: 'active' | 'completed' | 'abandoned';
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  value: number;
  recorded_at: string;
  notes?: string;
}

export interface LogGoalProgressRequest {
  goal_id: string;
  value: number;
  notes?: string;
}

export interface GoalAchievement {
  id: string;
  patient_id: string;
  goal_id: string;
  achievement_type: 'milestone' | 'completion' | 'streak';
  title: string;
  description: string;
  badge_icon: string;
  earned_at: string;
}

// ============================================================================
// Family Account Types
// ============================================================================

export interface FamilyMember {
  id: string;
  primary_user_id: string;
  member_user_id: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  can_view_records: boolean;
  can_book_appointments: boolean;
  created_at: string;
  member?: {
    id: string;
    name: string;
    email: string;
    age?: number;
    gender?: string;
  };
}

export interface AddFamilyMemberRequest {
  member_email?: string;
  member_name?: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  can_view_records: boolean;
  can_book_appointments: boolean;
  // For creating new dependent accounts
  date_of_birth?: string;
  gender?: string;
}

export interface UpdateFamilyMemberRequest {
  relationship?: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  can_view_records?: boolean;
  can_book_appointments?: boolean;
}

export interface FamilyHealthDashboard {
  family_members: Array<{
    member: FamilyMember;
    upcoming_appointments: number;
    active_medications: number;
    active_goals: number;
    last_checkup?: string;
  }>;
  total_members: number;
  total_appointments: number;
  total_medications: number;
}

// ============================================================================
// Document Upload Types
// ============================================================================

export interface PatientDocument {
  id: string;
  patient_id: string;
  document_type: 'lab_result' | 'insurance' | 'prescription' | 'medical_history' | 'imaging' | 'other';
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  uploaded_at: string;
  shared_with_doctor_id?: string;
  shared_at?: string;
  notes?: string;
}

export interface UploadDocumentRequest {
  document_type: 'lab_result' | 'insurance' | 'prescription' | 'medical_history' | 'imaging' | 'other';
  file: File;
  notes?: string;
}

export interface UpdateDocumentRequest {
  document_type?: 'lab_result' | 'insurance' | 'prescription' | 'medical_history' | 'imaging' | 'other';
  notes?: string;
}

export interface ShareDocumentRequest {
  document_id: string;
  doctor_id: string;
}

export interface DocumentCategory {
  type: 'lab_result' | 'insurance' | 'prescription' | 'medical_history' | 'imaging' | 'other';
  label: string;
  icon: string;
  count: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetMedicationsRequest {
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetMedicationsResponse {
  medications: PatientMedication[];
  total: number;
  has_more: boolean;
}

export interface GetMedicationLogsRequest {
  medication_id?: string;
  start_date?: string;
  end_date?: string;
  status?: 'taken' | 'missed' | 'skipped';
  limit?: number;
  offset?: number;
}

export interface GetMedicationLogsResponse {
  logs: MedicationLog[];
  total: number;
  has_more: boolean;
}

export interface GetHealthGoalsRequest {
  status?: 'active' | 'completed' | 'abandoned';
  goal_type?: string;
  limit?: number;
  offset?: number;
}

export interface GetHealthGoalsResponse {
  goals: HealthGoal[];
  total: number;
  has_more: boolean;
}

export interface GetGoalProgressRequest {
  goal_id: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetGoalProgressResponse {
  progress: GoalProgress[];
  total: number;
  has_more: boolean;
}

export interface GetFamilyMembersResponse {
  members: FamilyMember[];
  total: number;
}

export interface GetDocumentsRequest {
  document_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetDocumentsResponse {
  documents: PatientDocument[];
  total: number;
  has_more: boolean;
}

