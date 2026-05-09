/**
 * useMedicalRecords Hook
 * Fetches medical records, lab results, and prescriptions
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/app/services/apiClient';

export interface MedicalRecord {
  id: string;
  patientId: string;
  type: 'condition' | 'allergy' | 'medication' | 'procedure' | 'lab_result';
  title: string;
  description: string;
  date: string;
  doctor: string;
  notes: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  date: string;
  doctor: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  startDate: string;
  endDate: string;
  doctor: string;
  notes: string;
  refills: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch medical records
 */
export function useMedicalRecords(patientId: string, type?: string) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = API_ENDPOINTS.medicalRecords.list(patientId);
      if (type) {
        endpoint += `?type=${type}`;
      }

      const response = await apiClient.get<MedicalRecord[]>(endpoint);

      if (response.success && response.data) {
        setRecords(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch medical records');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching medical records');
    } finally {
      setLoading(false);
    }
  }, [patientId, type]);

  useEffect(() => {
    if (patientId) {
      fetchRecords();
    }
  }, [fetchRecords, patientId]);

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
  };
}

/**
 * Fetch lab results
 */
export function useLabResults(patientId: string) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<LabResult[]>(
        `${API_ENDPOINTS.labResults.list(patientId)}`
      );

      if (response.success && response.data) {
        setResults(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch lab results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching lab results');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      fetchResults();
    }
  }, [fetchResults, patientId]);

  return {
    results,
    loading,
    error,
    refetch: fetchResults,
  };
}

/**
 * Fetch prescriptions
 */
export function usePrescriptions(patientId: string) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Prescription[]>(
        API_ENDPOINTS.prescriptions.list(patientId)
      );

      if (response.success && response.data) {
        setPrescriptions(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch prescriptions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching prescriptions');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      fetchPrescriptions();
    }
  }, [fetchPrescriptions, patientId]);

  return {
    prescriptions,
    loading,
    error,
    refetch: fetchPrescriptions,
  };
}

/**
 * Create medical record
 */
export async function createMedicalRecord(recordData: Partial<MedicalRecord>) {
  try {
    const response = await apiClient.post<MedicalRecord>(
      API_ENDPOINTS.medicalRecords.create,
      recordData
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
 * Create lab result
 */
export async function createLabResult(resultData: Partial<LabResult>) {
  try {
    const response = await apiClient.post<LabResult>(
      API_ENDPOINTS.labResults.create,
      resultData
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
 * Create prescription
 */
export async function createPrescription(prescriptionData: Partial<Prescription>) {
  try {
    const response = await apiClient.post<Prescription>(
      API_ENDPOINTS.prescriptions.create,
      prescriptionData
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
