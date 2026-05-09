/**
 * usePatient Hook
 * Fetches patient data from backend API
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/app/services/apiClient';

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  bloodType: string;
  medicalHistory: string[];
  allergies: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UsePatientReturn {
  patient: Patient | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch patient profile data
 */
export function usePatient(patientId?: string): UsePatientReturn {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = patientId
        ? API_ENDPOINTS.patients.get(patientId)
        : API_ENDPOINTS.patients.profile;

      const response = await apiClient.get<Patient>(endpoint);

      if (response.success && response.data) {
        setPatient(response.data);
      } else {
        setError(response.error || 'Failed to fetch patient data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching patient data');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return {
    patient,
    loading,
    error,
    refetch: fetchPatient,
  };
}

/**
 * Fetch all patients (admin/doctor view)
 */
export function usePatients(limit: number = 10, offset: number = 0) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{
        data: Patient[];
        total: number;
      }>(`${API_ENDPOINTS.patients.list}?limit=${limit}&offset=${offset}`);

      if (response.success && response.data) {
        setPatients(response.data.data || []);
        setTotal(response.data.total || 0);
      } else {
        setError(response.error || 'Failed to fetch patients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching patients');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    loading,
    error,
    total,
    refetch: fetchPatients,
  };
}

/**
 * Create new patient
 */
export async function createPatient(patientData: Partial<Patient>) {
  try {
    const response = await apiClient.post<Patient>(
      API_ENDPOINTS.patients.create,
      patientData
    );

    if (response.success) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update patient
 */
export async function updatePatient(patientId: string, patientData: Partial<Patient>) {
  try {
    const response = await apiClient.put<Patient>(
      API_ENDPOINTS.patients.update(patientId),
      patientData
    );

    if (response.success) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Delete patient
 */
export async function deletePatient(patientId: string) {
  try {
    const response = await apiClient.delete(
      API_ENDPOINTS.patients.delete(patientId)
    );

    if (response.success) {
      return { success: true };
    } else {
      return { success: false, error: response.error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
