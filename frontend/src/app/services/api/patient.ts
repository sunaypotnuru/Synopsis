/**
 * Patient Portal API Client
 * 
 * API client for patient portal features including:
 * - Medication reminders
 * - Health goals
 * - Family accounts
 * - Document upload
 */

import api from '../../../lib/api';
import type {
  PatientMedication,
  CreateMedicationRequest,
  UpdateMedicationRequest,
  MedicationLog,
  LogMedicationRequest,
  MedicationAdherence,
  GetMedicationsRequest,
  GetMedicationsResponse,
  GetMedicationLogsRequest,
  GetMedicationLogsResponse,
  HealthGoal,
  CreateHealthGoalRequest,
  UpdateHealthGoalRequest,
  GoalProgress,
  LogGoalProgressRequest,
  GoalAchievement,
  GetHealthGoalsRequest,
  GetHealthGoalsResponse,
  GetGoalProgressRequest,
  GetGoalProgressResponse,
  FamilyMember,
  AddFamilyMemberRequest,
  UpdateFamilyMemberRequest,
  FamilyHealthDashboard,
  GetFamilyMembersResponse,
  PatientDocument,
  UploadDocumentRequest,
  UpdateDocumentRequest,
  ShareDocumentRequest,
  DocumentCategory,
  GetDocumentsRequest,
  GetDocumentsResponse,
} from '@/types/patient.types';

// ============================================================================
// Medication Reminders
// ============================================================================

/**
 * Get patient medications
 */
export const getMedications = async (params?: GetMedicationsRequest) => {
  return api.get<GetMedicationsResponse>('/api/v1/patient/medications', { params });
};

/**
 * Get a single medication
 */
export const getMedication = async (medicationId: string) => {
  return api.get<PatientMedication>(`/api/v1/patient/medications/${medicationId}`);
};

/**
 * Create a new medication reminder
 */
export const createMedication = async (data: CreateMedicationRequest) => {
  return api.post<PatientMedication>('/api/v1/patient/medications', data);
};

/**
 * Update a medication reminder
 */
export const updateMedication = async (medicationId: string, data: UpdateMedicationRequest) => {
  return api.put<PatientMedication>(`/api/v1/patient/medications/${medicationId}`, data);
};

/**
 * Delete a medication reminder
 */
export const deleteMedication = async (medicationId: string) => {
  return api.delete(`/api/v1/patient/medications/${medicationId}`);
};

/**
 * Get medication logs
 */
export const getMedicationLogs = async (params?: GetMedicationLogsRequest) => {
  return api.get<GetMedicationLogsResponse>('/api/v1/patient/medication-logs', { params });
};

/**
 * Log medication intake
 */
export const logMedication = async (data: LogMedicationRequest) => {
  return api.post<MedicationLog>('/api/v1/patient/medication-logs', data);
};

/**
 * Get medication adherence statistics
 */
export const getMedicationAdherence = async (medicationId?: string) => {
  return api.get<{ adherence: MedicationAdherence[] }>('/api/v1/patient/medication-adherence', {
    params: medicationId ? { medication_id: medicationId } : undefined,
  });
};

/**
 * Get upcoming medication reminders
 */
export const getUpcomingReminders = async () => {
  return api.get<{ reminders: Array<{ medication: PatientMedication; next_dose: string }> }>(
    '/api/v1/patient/medications/upcoming'
  );
};

// ============================================================================
// Health Goals
// ============================================================================

/**
 * Get health goals
 */
export const getHealthGoals = async (params?: GetHealthGoalsRequest) => {
  return api.get<GetHealthGoalsResponse>('/api/v1/patient/health-goals', { params });
};

/**
 * Get a single health goal
 */
export const getHealthGoal = async (goalId: string) => {
  return api.get<HealthGoal>(`/api/v1/patient/health-goals/${goalId}`);
};

/**
 * Create a new health goal
 */
export const createHealthGoal = async (data: CreateHealthGoalRequest) => {
  return api.post<HealthGoal>('/api/v1/patient/health-goals', data);
};

/**
 * Update a health goal
 */
export const updateHealthGoal = async (goalId: string, data: UpdateHealthGoalRequest) => {
  return api.put<HealthGoal>(`/api/v1/patient/health-goals/${goalId}`, data);
};

/**
 * Delete a health goal
 */
export const deleteHealthGoal = async (goalId: string) => {
  return api.delete(`/api/v1/patient/health-goals/${goalId}`);
};

/**
 * Get goal progress history
 */
export const getGoalProgress = async (params: GetGoalProgressRequest) => {
  return api.get<GetGoalProgressResponse>('/api/v1/patient/goal-progress', { params });
};

/**
 * Log goal progress
 */
export const logGoalProgress = async (data: LogGoalProgressRequest) => {
  return api.post<GoalProgress>('/api/v1/patient/goal-progress', data);
};

/**
 * Get goal achievements
 */
export const getGoalAchievements = async () => {
  return api.get<{ achievements: GoalAchievement[] }>('/api/v1/patient/goal-achievements');
};

/**
 * Get goal statistics
 */
export const getGoalStatistics = async () => {
  return api.get<{
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    average_progress: number;
    total_achievements: number;
  }>('/api/v1/patient/health-goals/statistics');
};

// ============================================================================
// Family Accounts
// ============================================================================

/**
 * Get family members
 */
export const getFamilyMembers = async () => {
  return api.get<GetFamilyMembersResponse>('/api/v1/patient/family-members');
};

/**
 * Get a single family member
 */
export const getFamilyMember = async (memberId: string) => {
  return api.get<FamilyMember>(`/api/v1/patient/family-members/${memberId}`);
};

/**
 * Add a family member
 */
export const addFamilyMember = async (data: AddFamilyMemberRequest) => {
  return api.post<FamilyMember>('/api/v1/patient/family-members', data);
};

/**
 * Update family member permissions
 */
export const updateFamilyMember = async (memberId: string, data: UpdateFamilyMemberRequest) => {
  return api.put<FamilyMember>(`/api/v1/patient/family-members/${memberId}`, data);
};

/**
 * Remove a family member
 */
export const removeFamilyMember = async (memberId: string) => {
  return api.delete(`/api/v1/patient/family-members/${memberId}`);
};

/**
 * Get family health dashboard
 */
export const getFamilyHealthDashboard = async () => {
  return api.get<FamilyHealthDashboard>('/api/v1/patient/family-dashboard');
};

/**
 * Switch to family member account
 */
export const switchToFamilyMember = async (memberId: string) => {
  return api.post<{ access_token: string; member: FamilyMember }>(
    `/api/v1/patient/family-members/${memberId}/switch`
  );
};

// ============================================================================
// Document Upload
// ============================================================================

/**
 * Get patient documents
 */
export const getDocuments = async (params?: GetDocumentsRequest) => {
  return api.get<GetDocumentsResponse>('/api/v1/patient/documents', { params });
};

/**
 * Get a single document
 */
export const getDocument = async (documentId: string) => {
  return api.get<PatientDocument>(`/api/v1/patient/documents/${documentId}`);
};

/**
 * Upload a document
 */
export const uploadDocument = async (data: UploadDocumentRequest) => {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('document_type', data.document_type);
  if (data.notes) {
    formData.append('notes', data.notes);
  }

  return api.post<PatientDocument>('/api/v1/patient/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Update document metadata
 */
export const updateDocument = async (documentId: string, data: UpdateDocumentRequest) => {
  return api.put<PatientDocument>(`/api/v1/patient/documents/${documentId}`, data);
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId: string) => {
  return api.delete(`/api/v1/patient/documents/${documentId}`);
};

/**
 * Share document with doctor
 */
export const shareDocument = async (data: ShareDocumentRequest) => {
  return api.post<PatientDocument>('/api/v1/patient/documents/share', data);
};

/**
 * Unshare document
 */
export const unshareDocument = async (documentId: string) => {
  return api.post<PatientDocument>(`/api/v1/patient/documents/${documentId}/unshare`);
};

/**
 * Get document categories with counts
 */
export const getDocumentCategories = async () => {
  return api.get<{ categories: DocumentCategory[] }>('/api/v1/patient/documents/categories');
};

/**
 * Download document
 */
export const downloadDocument = async (documentId: string) => {
  return api.get(`/api/v1/patient/documents/${documentId}/download`, {
    responseType: 'blob',
  });
};

/**
 * Get document storage statistics
 */
export const getDocumentStatistics = async () => {
  return api.get<{
    total_documents: number;
    total_size_bytes: number;
    storage_limit_bytes: number;
    storage_used_percentage: number;
    documents_by_type: Record<string, number>;
  }>('/api/v1/patient/documents/statistics');
};
