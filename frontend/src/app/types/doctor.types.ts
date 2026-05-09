/**
 * Doctor Portal Types
 * 
 * Type definitions for doctor portal features including:
 * - Earnings dashboard
 * - Clinical notes (SOAP format)
 * - Prescription templates
 * - Doctor analytics
 */

// ============================================================================
// Earnings Dashboard Types
// ============================================================================

export interface DoctorEarnings {
  total_earnings: number;
  daily_earnings: number;
  weekly_earnings: number;
  monthly_earnings: number;
  yearly_earnings: number;
  earnings_by_type: Array<{
    appointment_type: string;
    earnings: number;
    count: number;
  }>;
  earnings_trend: Array<{
    date: string;
    earnings: number;
  }>;
  upcoming_appointments_value: number;
  payment_status: {
    paid: number;
    pending: number;
    overdue: number;
  };
}

export interface DoctorStatistics {
  total_patients: number;
  active_patients: number;
  new_patients_this_month: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  average_consultation_fee: number;
  patient_satisfaction_score: number;
}

// ============================================================================
// Clinical Notes Types
// ============================================================================

export interface ClinicalNote {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id?: string;
  note_type: 'soap' | 'progress' | 'consultation';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
    age: number;
    gender: string;
  };
}

export interface CreateClinicalNoteRequest {
  patient_id: string;
  appointment_id?: string;
  note_type: 'soap' | 'progress' | 'consultation';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface UpdateClinicalNoteRequest {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface NoteTemplate {
  id: string;
  doctor_id: string;
  name: string;
  note_type: 'soap' | 'progress' | 'consultation';
  template_content: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  is_favorite: boolean;
  created_at: string;
}

export interface CreateNoteTemplateRequest {
  name: string;
  note_type: 'soap' | 'progress' | 'consultation';
  template_content: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  is_favorite?: boolean;
}

// ============================================================================
// Prescription Template Types
// ============================================================================

export interface PrescriptionTemplate {
  id: string;
  doctor_id: string;
  name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  is_favorite: boolean;
  created_at: string;
}

export interface CreatePrescriptionTemplateRequest {
  name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  is_favorite?: boolean;
}

export interface UpdatePrescriptionTemplateRequest {
  name?: string;
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  is_favorite?: boolean;
}

export interface Prescription {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  prescribed_at: string;
  patient?: {
    id: string;
    name: string;
  };
}

export interface CreatePrescriptionRequest {
  patient_id: string;
  appointment_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// ============================================================================
// Doctor Analytics Types
// ============================================================================

export interface DoctorAnalytics {
  patient_demographics: {
    age_distribution: Array<{
      age_range: string;
      count: number;
    }>;
    gender_distribution: Array<{
      gender: string;
      count: number;
    }>;
  };
  appointment_trends: Array<{
    date: string;
    count: number;
  }>;
  common_diagnoses: Array<{
    diagnosis: string;
    count: number;
    percentage: number;
  }>;
  prescription_patterns: Array<{
    medication: string;
    count: number;
  }>;
  patient_satisfaction: {
    average_rating: number;
    total_reviews: number;
    rating_distribution: Array<{
      rating: number;
      count: number;
    }>;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetClinicalNotesRequest {
  patient_id?: string;
  appointment_id?: string;
  note_type?: 'soap' | 'progress' | 'consultation';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetClinicalNotesResponse {
  notes: ClinicalNote[];
  total: number;
  has_more: boolean;
}

export interface GetPrescriptionTemplatesRequest {
  search?: string;
  is_favorite?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetPrescriptionTemplatesResponse {
  templates: PrescriptionTemplate[];
  total: number;
  has_more: boolean;
}

export interface GetPrescriptionsRequest {
  patient_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetPrescriptionsResponse {
  prescriptions: Prescription[];
  total: number;
  has_more: boolean;
}

export interface GetEarningsRequest {
  start_date?: string;
  end_date?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

