/**
 * API Client Service
 * Centralized API communication for all frontend requests
 * Handles authentication, error handling, loading states, and retries
 */

// API Client Service - Centralized API communication

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

function getSupabaseAccessToken(): string | null {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    } catch {
      // Ignore malformed values and continue scanning.
    }
  }
  return null;
}

// Request/Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
  name?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'text';
  onUploadProgress?: (progressEvent: any) => void;
}

/**
 * API Client Class
 * Handles all HTTP requests with proper error handling and authentication
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = MAX_RETRIES;
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = getSupabaseAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retries = this.maxRetries,
      skipAuth = false,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    try {
      // Prepare headers
      const finalHeaders = {
        ...(!skipAuth && this.getAuthHeaders()),
        ...headers,
      };

      // Prepare request options
      const fetchOptions: RequestInit = {
        method,
        headers: finalHeaders,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make request
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle response status
      if (!response.ok) {
        const errorData = data as { error?: string; message?: string; code?: string };
        throw {
          message: errorData?.error || errorData?.message || `HTTP ${response.status}`,
          status: response.status,
          code: errorData?.code,
          details: data,
          name: 'ApiError',
        };
      }

      const responseData = data as { data?: T } | T;
      return {
        success: true,
        data: (responseData && typeof responseData === 'object' && 'data' in responseData) ? responseData.data : (data as T),
        status: response.status,
      };
    } catch (error) {
      const err = error as ApiError;
      // Handle timeout
      if (err.name === 'AbortError') {
        if (retryCount < retries) {
          await this.delay(RETRY_DELAY * (retryCount + 1));
          return this.makeRequest<T>(endpoint, options, retryCount + 1);
        }

        return {
          success: false,
          error: 'Request timeout',
          status: 408,
        };
      }

      // Handle network errors
      if (error instanceof TypeError) {
        if (retryCount < retries) {
          await this.delay(RETRY_DELAY * (retryCount + 1));
          return this.makeRequest<T>(endpoint, options, retryCount + 1);
        }

        return {
          success: false,
          error: 'Network error. Please check your connection.',
          status: 0,
        };
      }

      // Handle API errors
      if (err.status) {
        // Handle 401 Unauthorized
        if (err.status === 401) {
          // Clear all Supabase auth tokens and redirect to login
          for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i);
            if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
          window.location.href = '/login';
        }

        return {
          success: false,
          error: err.message,
          status: err.status,
        };
      }

      // Handle unknown errors
      return {
        success: false,
        error: err?.message || 'An unexpected error occurred',
        status: 500,
      };
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * API Endpoints - Organized by feature
 */
export const API_ENDPOINTS = {
  // Health
  health: '/health',

  // Authentication
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    mfa: {
      setup: '/api/auth/mfa/setup',
      verify: '/api/auth/mfa/verify',
    },
  },

  // Patients
  patients: {
    list: '/api/patients',
    get: (id: string) => `/api/patients/${id}`,
    create: '/api/patients',
    update: (id: string) => `/api/patients/${id}`,
    delete: (id: string) => `/api/patients/${id}`,
    profile: '/api/patients/profile',
    medicalHistory: (id: string) => `/api/patients/${id}/medical-history`,
    familyProfiles: (id: string) => `/api/patients/${id}/family-profiles`,
  },

  // Doctors
  doctors: {
    list: '/api/doctors',
    get: (id: string) => `/api/doctors/${id}`,
    create: '/api/doctors',
    update: (id: string) => `/api/doctors/${id}`,
    delete: (id: string) => `/api/doctors/${id}`,
    schedule: (id: string) => `/api/doctors/${id}/schedule`,
    availability: (id: string) => `/api/doctors/${id}/availability`,
  },

  // Appointments
  appointments: {
    list: '/api/appointments',
    get: (id: string) => `/api/appointments/${id}`,
    create: '/api/appointments',
    update: (id: string) => `/api/appointments/${id}`,
    cancel: (id: string) => `/api/appointments/${id}/cancel`,
    reschedule: (id: string) => `/api/appointments/${id}/reschedule`,
    videoCall: (id: string) => `/api/appointments/${id}/video-call`,
  },

  // Medical Records
  medicalRecords: {
    list: (patientId: string) => `/api/patients/${patientId}/medical-records`,
    get: (id: string) => `/api/medical-records/${id}`,
    create: '/api/medical-records',
    update: (id: string) => `/api/medical-records/${id}`,
    delete: (id: string) => `/api/medical-records/${id}`,
  },

  // Lab Results
  labResults: {
    list: (patientId: string) => `/api/patients/${patientId}/lab-results`,
    get: (id: string) => `/api/lab-results/${id}`,
    create: '/api/lab-results',
    update: (id: string) => `/api/lab-results/${id}`,
  },

  // Prescriptions
  prescriptions: {
    list: (patientId: string) => `/api/patients/${patientId}/prescriptions`,
    get: (id: string) => `/api/prescriptions/${id}`,
    create: '/api/prescriptions',
    update: (id: string) => `/api/prescriptions/${id}`,
    delete: (id: string) => `/api/prescriptions/${id}`,
  },

  // AI Analysis
  ai: {
    analyze: '/api/ai/analyze',
    results: (id: string) => `/api/ai/results/${id}`,
    models: '/api/ai/models',
    groundTruth: '/api/ai/ground-truth',
  },

  // Analytics
  analytics: {
    dashboard: '/api/analytics/dashboard',
    metrics: '/api/analytics/metrics',
    reports: '/api/analytics/reports',
  },

  // Admin
  admin: {
    users: '/api/admin/users',
    settings: '/api/admin/settings',
    compliance: '/api/admin/compliance',
    systemHealth: '/api/admin/system-health',
  },

  // FHIR
  fhir: {
    patients: '/fhir/R4/Patient',
    observations: '/fhir/R4/Observation',
    diagnosticReports: '/fhir/R4/DiagnosticReport',
    medicationRequests: '/fhir/R4/MedicationRequest',
  },
};

/**
 * Hook for using API client in components
 */
export function useApi() {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
  };
}

export default apiClient;
