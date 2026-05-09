/**
 * useDoctor Hook
 * Fetches doctor data and manages doctor-related operations
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/app/services/apiClient';

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  experience: number;
  rating: number;
  bio: string;
  profileImage?: string;
  availability: {
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
    sunday: string[];
  };
  consultationFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAppointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch doctor profile
 */
export function useDoctor(doctorId?: string) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctor = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = doctorId
        ? API_ENDPOINTS.doctors.get(doctorId)
        : '/api/doctors/profile';

      const response = await apiClient.get<Doctor>(endpoint);

      if (response.success && response.data) {
        setDoctor(response.data);
      } else {
        setError(response.error || 'Failed to fetch doctor profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching doctor profile');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchDoctor();
  }, [fetchDoctor]);

  return {
    doctor,
    loading,
    error,
    refetch: fetchDoctor,
  };
}

/**
 * Fetch all doctors (for patient to search)
 */
export function useDoctors(specialization?: string, limit: number = 10) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = `${API_ENDPOINTS.doctors.list}?limit=${limit}`;
      if (specialization) {
        endpoint += `&specialization=${specialization}`;
      }

      const response = await apiClient.get<Doctor[]>(endpoint);

      if (response.success && response.data) {
        setDoctors(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch doctors');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching doctors');
    } finally {
      setLoading(false);
    }
  }, [specialization, limit]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    error,
    refetch: fetchDoctors,
  };
}

/**
 * Fetch doctor's appointments
 */
export function useDoctorAppointments(doctorId: string, date?: string) {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = `${API_ENDPOINTS.doctors.get(doctorId)}/appointments`;
      if (date) {
        endpoint += `?date=${date}`;
      }

      const response = await apiClient.get<DoctorAppointment[]>(endpoint);

      if (response.success && response.data) {
        setAppointments(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch appointments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching appointments');
    } finally {
      setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    if (doctorId) {
      fetchAppointments();
    }
  }, [fetchAppointments, doctorId]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
}

/**
 * Fetch doctor's availability
 */
export async function getDoctorAvailability(doctorId: string, date: string) {
  try {
    const response = await apiClient.get(
      `${API_ENDPOINTS.doctors.get(doctorId)}/availability?date=${date}`
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
 * Update doctor profile
 */
export async function updateDoctorProfile(doctorId: string, profileData: Partial<Doctor>) {
  try {
    const response = await apiClient.put<Doctor>(
      API_ENDPOINTS.doctors.update(doctorId),
      profileData
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
 * Update doctor's availability
 */
export async function updateDoctorAvailability(
  doctorId: string,
  availability: Doctor['availability']
) {
  try {
    const response = await apiClient.put(
      `${API_ENDPOINTS.doctors.get(doctorId)}/availability`,
      { availability }
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
