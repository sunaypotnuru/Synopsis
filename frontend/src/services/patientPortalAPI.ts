/**
 * Patient Portal API Service
 * Handles all API calls for patient portal features (Categories 5-6)
 */

import api from '@/lib/api';

export const patientPortalAPI = {
  // ==================== MEDICATIONS ====================
  
  /**
   * Get all medications for the current patient
   */
  getMedications: () => api.get('/api/v1/patient/medications'),
  
  /**
   * Get details of a specific medication
   */
  getMedication: (medicationId: string) => 
    api.get(`/api/v1/patient/medications/${medicationId}`),
  
  /**
   * Get medication logs (history of taken/missed medications)
   */
  getMedicationLogs: (medicationId: string) => 
    api.get(`/api/v1/patient/medications/${medicationId}/logs`),
  
  /**
   * Log a medication as taken/missed/skipped
   */
  logMedication: (medicationId: string, data: {
    scheduled_at: string;
    taken_at?: string;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
  }) => api.post(`/api/v1/patient/medications/${medicationId}/log`, data),
  
  /**
   * Get medication reminders
   */
  getMedicationReminders: () => 
    api.get('/api/v1/patient/medications/reminders'),
  
  /**
   * Update medication reminder settings
   */
  updateMedicationReminders: (medicationId: string, data: {
    reminder_times: string[];
    reminder_enabled: boolean;
  }) => api.put(`/api/v1/patient/medications/${medicationId}/reminders`, data),
  
  // ==================== HEALTH GOALS ====================
  
  /**
   * Get all health goals for the current patient
   */
  getGoals: () => api.get('/api/v1/patient/goals'),
  
  /**
   * Create a new health goal
   */
  createGoal: (data: {
    goal_type: string;
    title: string;
    description?: string;
    target_value: number;
    current_value: number;
    unit: string;
    start_date: string;
    target_date: string;
  }) => api.post('/api/v1/patient/goals', data),
  
  /**
   * Get details of a specific health goal
   */
  getGoal: (goalId: string) => 
    api.get(`/api/v1/patient/goals/${goalId}`),
  
  /**
   * Update a health goal
   */
  updateGoal: (goalId: string, data: {
    title?: string;
    description?: string;
    target_value?: number;
    target_date?: string;
    status?: 'active' | 'completed' | 'abandoned';
  }) => api.put(`/api/v1/patient/goals/${goalId}`, data),
  
  /**
   * Delete a health goal
   */
  deleteGoal: (goalId: string) => 
    api.delete(`/api/v1/patient/goals/${goalId}`),
  
  /**
   * Log progress for a health goal
   */
  logGoalProgress: (goalId: string, data: {
    value: number;
    notes?: string;
  }) => api.post(`/api/v1/patient/goals/${goalId}/progress`, data),
  
  /**
   * Get achievements
   */
  getAchievements: () => 
    api.get('/api/v1/patient/goals/achievements'),
  
  // ==================== FAMILY MEMBERS ====================
  
  /**
   * Get all family members
   */
  getFamilyMembers: () => api.get('/api/v1/patient/family'),
  
  /**
   * Add a new family member
   */
  addFamilyMember: (data: {
    name: string;
    relationship: string;
    date_of_birth: string;
    gender: string;
    phone?: string;
    email?: string;
    can_view_records?: boolean;
    can_book_appointments?: boolean;
  }) => api.post('/api/v1/patient/family', data),
  
  /**
   * Get details of a specific family member
   */
  getFamilyMember: (memberId: string) => 
    api.get(`/api/v1/patient/family/${memberId}`),
  
  /**
   * Update a family member
   */
  updateFamilyMember: (memberId: string, data: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    can_view_records?: boolean;
    can_book_appointments?: boolean;
  }) => api.put(`/api/v1/patient/family/${memberId}`, data),
  
  /**
   * Remove a family member
   */
  deleteFamilyMember: (memberId: string) => 
    api.delete(`/api/v1/patient/family/${memberId}`),
  
  // ==================== DOCUMENTS ====================
  
  /**
   * Upload a new document
   */
  uploadDocument: (formData: FormData) => 
    api.post('/api/v1/patient/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  /**
   * Share a document with a doctor
   */
  shareDocument: (documentId: string, data: {
    doctor_id: string;
    notes?: string;
  }) => api.post(`/api/v1/patient/documents/${documentId}/share`, data),
  
  // ==================== HEALTH RECORDS ====================
  
  /**
   * Get vitals history
   */
  getVitalsHistory: () => 
    api.get('/api/v1/patient/records/vitals'),
  
  /**
   * Get lab results history
   */
  getLabResults: () => 
    api.get('/api/v1/patient/records/lab-results'),
  
  /**
   * Get prescriptions history
   */
  getPrescriptions: () => 
    api.get('/api/v1/patient/records/prescriptions'),
  
  /**
   * Get health timeline
   */
  getTimeline: () => 
    api.get('/api/v1/patient/records/timeline'),
  
  // ==================== APPOINTMENTS ====================
  
  /**
   * Get all appointments
   */
  getAppointments: () => 
    api.get('/api/v1/patient/appointments'),
  
  /**
   * Get upcoming appointments
   */
  getUpcomingAppointments: () => 
    api.get('/api/v1/patient/appointments/upcoming'),
  
  /**
   * Get appointment details
   */
  getAppointment: (appointmentId: string) => 
    api.get(`/api/v1/patient/appointments/${appointmentId}`),
  
  /**
   * Cancel an appointment
   */
  cancelAppointment: (appointmentId: string, data: {
    reason?: string;
  }) => api.post(`/api/v1/patient/appointments/${appointmentId}/cancel`, data),
  
  /**
   * Reschedule an appointment
   */
  rescheduleAppointment: (appointmentId: string, data: {
    new_date: string;
    reason?: string;
  }) => api.post(`/api/v1/patient/appointments/${appointmentId}/reschedule`, data),
  
  // ==================== DASHBOARD ====================
  
  /**
   * Get dashboard overview data
   */
  getDashboard: () => 
    api.get('/api/v1/patient/dashboard'),
  
  /**
   * Get health summary
   */
  getHealthSummary: () => 
    api.get('/api/v1/patient/health-summary'),
  
  // ==================== SETTINGS ====================
  
  /**
   * Get profile settings
   */
  getProfile: () => 
    api.get('/api/v1/patient/settings/profile'),
  
  /**
   * Update profile settings
   */
  updateProfile: (data: {
    full_name?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }) => api.put('/api/v1/patient/settings/profile', data),
  
  /**
   * Get preferences
   */
  getPreferences: () => 
    api.get('/api/v1/patient/settings/preferences'),
  
  /**
   * Update preferences
   */
  updatePreferences: (data: {
    language?: string;
    timezone?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  }) => api.put('/api/v1/patient/settings/preferences', data),
};

export default patientPortalAPI;
