/**
 * Analytics API Client
 * 
 * Provides methods to interact with analytics endpoints (Admin only)
 */

import { apiClient } from '../apiClient';
import type {
  AnalyticsOverview,
  UserAnalytics,
  AppointmentAnalytics,
  AIUsageAnalytics,
  RevenueAnalytics,
  SystemPerformance,
  MessagingAnalytics,
  AnalyticsRequest,
  ExportRequest,
  ExportResponse,
} from '../../types';

const BASE_PATH = '/api/v1/analytics';

// ============================================================================
// Overview Dashboard
// ============================================================================

/**
 * Get analytics overview (all metrics)
 */
export async function getAnalyticsOverview(
  params?: AnalyticsRequest
): Promise<AnalyticsOverview> {
  const response = await apiClient.get<AnalyticsOverview>(
    `${BASE_PATH}/overview`,
    { params }
  );
  return response.data;
}

// ============================================================================
// User Analytics
// ============================================================================

/**
 * Get user analytics
 */
export async function getUserAnalytics(
  params?: AnalyticsRequest
): Promise<UserAnalytics> {
  const response = await apiClient.get<UserAnalytics>(
    `${BASE_PATH}/users`,
    { params }
  );
  return response.data;
}

// ============================================================================
// Appointment Analytics
// ============================================================================

/**
 * Get appointment analytics
 */
export async function getAppointmentAnalytics(
  params?: AnalyticsRequest
): Promise<AppointmentAnalytics> {
  const response = await apiClient.get<AppointmentAnalytics>(
    `${BASE_PATH}/appointments`,
    { params }
  );
  return response.data;
}

// ============================================================================
// AI Usage Analytics
// ============================================================================

/**
 * Get AI usage analytics
 */
export async function getAIUsageAnalytics(
  params?: AnalyticsRequest
): Promise<AIUsageAnalytics> {
  const response = await apiClient.get<AIUsageAnalytics>(
    `${BASE_PATH}/ai-usage`,
    { params }
  );
  return response.data;
}

// ============================================================================
// Revenue Analytics
// ============================================================================

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(
  params?: AnalyticsRequest
): Promise<RevenueAnalytics> {
  const response = await apiClient.get<RevenueAnalytics>(
    `${BASE_PATH}/revenue`,
    { params }
  );
  return response.data;
}

// ============================================================================
// System Performance
// ============================================================================

/**
 * Get system performance metrics
 */
export async function getSystemPerformance(): Promise<SystemPerformance> {
  const response = await apiClient.get<SystemPerformance>(
    `${BASE_PATH}/system-performance`
  );
  return response.data;
}

// ============================================================================
// Messaging Analytics
// ============================================================================

/**
 * Get messaging analytics
 */
export async function getMessagingAnalytics(
  params?: AnalyticsRequest
): Promise<MessagingAnalytics> {
  const response = await apiClient.get<MessagingAnalytics>(
    `${BASE_PATH}/messaging`,
    { params }
  );
  return response.data;
}

// ============================================================================
// Data Export
// ============================================================================

/**
 * Export analytics data
 */
export async function exportAnalytics(
  data: ExportRequest
): Promise<ExportResponse> {
  const response = await apiClient.post<ExportResponse>(
    `${BASE_PATH}/export`,
    data
  );
  return response.data;
}

/**
 * Get export status
 */
export async function getExportStatus(
  exportId: string
): Promise<ExportResponse> {
  const response = await apiClient.get<ExportResponse>(
    `${BASE_PATH}/export/${exportId}`
  );
  return response.data;
}

/**
 * Download export file
 */
export async function downloadExport(exportId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `${BASE_PATH}/export/${exportId}/download`,
    { responseType: 'blob' }
  );
  return response.data;
}
