/**
 * useAppointments Hook
 * Fetches appointments data from backend API
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/app/services/apiClient';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes: string;
  videoCallUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch appointments list
 */
export function useAppointments(
  status?: string,
  limit: number = 10,
  offset: number = 0
): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = `${API_ENDPOINTS.appointments.list}?limit=${limit}&offset=${offset}`;
      if (status) {
        endpoint += `&status=${status}`;
      }

      const response = await apiClient.get<Appointment[]>(endpoint);

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
  }, [status, limit, offset]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
}

/**
 * Fetch single appointment
 */
export function useAppointment(appointmentId: string) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Appointment>(
        API_ENDPOINTS.appointments.get(appointmentId)
      );

      if (response.success && response.data) {
        setAppointment(response.data);
      } else {
        setError(response.error || 'Failed to fetch appointment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching appointment');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  return {
    appointment,
    loading,
    error,
    refetch: fetchAppointment,
  };
}

/**
 * Create appointment
 */
export async function createAppointment(appointmentData: Partial<Appointment>) {
  try {
    const response = await apiClient.post<Appointment>(
      API_ENDPOINTS.appointments.create,
      appointmentData
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
 * Update appointment
 */
export async function updateAppointment(
  appointmentId: string,
  appointmentData: Partial<Appointment>
) {
  try {
    const response = await apiClient.put<Appointment>(
      API_ENDPOINTS.appointments.update(appointmentId),
      appointmentData
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
 * Cancel appointment
 */
export async function cancelAppointment(appointmentId: string, reason: string) {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.appointments.cancel(appointmentId),
      { reason }
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

/**
 * Reschedule appointment
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.appointments.reschedule(appointmentId),
      { date: newDate, time: newTime }
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
 * Start video call
 */
export async function startVideoCall(appointmentId: string) {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.appointments.videoCall(appointmentId),
      {}
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
