/**
 * Doctor Portal API Client
 * 
 * API client for doctor portal features including:
 * - Earnings dashboard
 * - Clinical notes (SOAP format)
 * - Prescription templates
 * - Doctor analytics
 */

import api from '../../../lib/api';
import type {
  DoctorEarnings,
  DoctorStatistics,
  DoctorAnalytics,
  ClinicalNote,
  CreateClinicalNoteRequest,
  UpdateClinicalNoteRequest,
  GetClinicalNotesRequest,
  GetClinicalNotesResponse,
  NoteTemplate,
  CreateNoteTemplateRequest,
  PrescriptionTemplate,
  CreatePrescriptionTemplateRequest,
  UpdatePrescriptionTemplateRequest,
  GetPrescriptionTemplatesRequest,
  GetPrescriptionTemplatesResponse,
  Prescription,
  CreatePrescriptionRequest,
  GetPrescriptionsRequest,
  GetPrescriptionsResponse,
  GetEarningsRequest,
} from '@/types/doctor.types';

// ============================================================================
// Earnings Dashboard
// ============================================================================

/**
 * Get doctor earnings summary
 */
export const getEarnings = async (params?: GetEarningsRequest) => {
  return api.get<DoctorEarnings>('/api/v1/doctor/earnings', { params });
};

/**
 * Get doctor statistics
 */
export const getStatistics = async () => {
  return api.get<DoctorStatistics>('/api/v1/doctor/statistics');
};

// ============================================================================
// Clinical Notes
// ============================================================================

/**
 * Get clinical notes
 */
export const getClinicalNotes = async (params?: GetClinicalNotesRequest) => {
  return api.get<GetClinicalNotesResponse>('/api/v1/doctor/clinical-notes', { params });
};

/**
 * Get a single clinical note
 */
export const getClinicalNote = async (noteId: string) => {
  return api.get<ClinicalNote>(`/api/v1/doctor/clinical-notes/${noteId}`);
};

/**
 * Create a new clinical note
 */
export const createClinicalNote = async (data: CreateClinicalNoteRequest) => {
  return api.post<ClinicalNote>('/api/v1/doctor/clinical-notes', data);
};

/**
 * Update a clinical note
 */
export const updateClinicalNote = async (noteId: string, data: UpdateClinicalNoteRequest) => {
  return api.put<ClinicalNote>(`/api/v1/doctor/clinical-notes/${noteId}`, data);
};

/**
 * Delete a clinical note
 */
export const deleteClinicalNote = async (noteId: string) => {
  return api.delete(`/api/v1/doctor/clinical-notes/${noteId}`);
};

/**
 * Search clinical notes
 */
export const searchClinicalNotes = async (query: string) => {
  return api.get<GetClinicalNotesResponse>('/api/v1/doctor/clinical-notes/search', {
    params: { query },
  });
};

// ============================================================================
// Note Templates
// ============================================================================

/**
 * Get note templates
 */
export const getNoteTemplates = async () => {
  return api.get<{ templates: NoteTemplate[] }>('/api/v1/doctor/note-templates');
};

/**
 * Create a note template
 */
export const createNoteTemplate = async (data: CreateNoteTemplateRequest) => {
  return api.post<NoteTemplate>('/api/v1/doctor/note-templates', data);
};

/**
 * Update a note template
 */
export const updateNoteTemplate = async (templateId: string, data: Partial<CreateNoteTemplateRequest>) => {
  return api.put<NoteTemplate>(`/api/v1/doctor/note-templates/${templateId}`, data);
};

/**
 * Delete a note template
 */
export const deleteNoteTemplate = async (templateId: string) => {
  return api.delete(`/api/v1/doctor/note-templates/${templateId}`);
};

// ============================================================================
// Prescription Templates
// ============================================================================

/**
 * Get prescription templates
 */
export const getPrescriptionTemplates = async (params?: GetPrescriptionTemplatesRequest) => {
  return api.get<GetPrescriptionTemplatesResponse>('/api/v1/doctor/prescription-templates', { params });
};

/**
 * Get a single prescription template
 */
export const getPrescriptionTemplate = async (templateId: string) => {
  return api.get<PrescriptionTemplate>(`/api/v1/doctor/prescription-templates/${templateId}`);
};

/**
 * Create a prescription template
 */
export const createPrescriptionTemplate = async (data: CreatePrescriptionTemplateRequest) => {
  return api.post<PrescriptionTemplate>('/api/v1/doctor/prescription-templates', data);
};

/**
 * Update a prescription template
 */
export const updatePrescriptionTemplate = async (templateId: string, data: UpdatePrescriptionTemplateRequest) => {
  return api.put<PrescriptionTemplate>(`/api/v1/doctor/prescription-templates/${templateId}`, data);
};

/**
 * Delete a prescription template
 */
export const deletePrescriptionTemplate = async (templateId: string) => {
  return api.delete(`/api/v1/doctor/prescription-templates/${templateId}`);
};

/**
 * Toggle template favorite status
 */
export const toggleTemplateFavorite = async (templateId: string) => {
  return api.post<PrescriptionTemplate>(`/api/v1/doctor/prescription-templates/${templateId}/toggle-favorite`);
};

// ============================================================================
// Prescriptions
// ============================================================================

/**
 * Get prescriptions
 */
export const getPrescriptions = async (params?: GetPrescriptionsRequest) => {
  return api.get<GetPrescriptionsResponse>('/api/v1/doctor/prescriptions', { params });
};

/**
 * Get a single prescription
 */
export const getPrescription = async (prescriptionId: string) => {
  return api.get<Prescription>(`/api/v1/doctor/prescriptions/${prescriptionId}`);
};

/**
 * Create a prescription
 */
export const createPrescription = async (data: CreatePrescriptionRequest) => {
  return api.post<Prescription>('/api/v1/doctor/prescriptions', data);
};

/**
 * Create prescription from template
 */
export const createPrescriptionFromTemplate = async (templateId: string, patientId: string, appointmentId?: string) => {
  return api.post<Prescription>('/api/v1/doctor/prescriptions/from-template', {
    template_id: templateId,
    patient_id: patientId,
    appointment_id: appointmentId,
  });
};

// ============================================================================
// Doctor Analytics
// ============================================================================

/**
 * Get doctor analytics
 */
export const getAnalytics = async (params?: { start_date?: string; end_date?: string }) => {
  return api.get<DoctorAnalytics>('/api/v1/doctor/analytics', { params });
};

/**
 * Get patient demographics
 */
export const getPatientDemographics = async () => {
  return api.get<DoctorAnalytics['patient_demographics']>('/api/v1/doctor/analytics/demographics');
};

/**
 * Get appointment trends
 */
export const getAppointmentTrends = async (params?: { start_date?: string; end_date?: string }) => {
  return api.get<DoctorAnalytics['appointment_trends']>('/api/v1/doctor/analytics/appointment-trends', { params });
};

/**
 * Get common diagnoses
 */
export const getCommonDiagnoses = async (params?: { limit?: number }) => {
  return api.get<DoctorAnalytics['common_diagnoses']>('/api/v1/doctor/analytics/common-diagnoses', { params });
};

/**
 * Get prescription patterns
 */
export const getPrescriptionPatterns = async (params?: { limit?: number }) => {
  return api.get<DoctorAnalytics['prescription_patterns']>('/api/v1/doctor/analytics/prescription-patterns', { params });
};

