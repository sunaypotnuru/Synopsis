/**
 * Security API Client
 * 
 * Provides methods to interact with security endpoints
 */

import { apiClient } from '../apiClient';
import type {
  Session,
  SessionStatus,
  ExtendSessionRequest,
  LoginHistoryRequest,
  LoginHistoryResponse,
  ActiveSessionsResponse,
  TerminateSessionRequest,
  SecuritySettings,
  UpdateSecuritySettingsRequest,
  TwoFactorSetup,
  TwoFactorVerifyRequest,
  TwoFactorStatus,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  PasswordStrength,
  SecurityAlertsResponse,
  MarkAlertReadRequest,
  ResolveAlertRequest,
  AuditLogRequest,
  AuditLogResponse,
} from '../../types';

const BASE_PATH = '/api/v1/security';

// ============================================================================
// Session Management
// ============================================================================

/**
 * Get current session status
 */
export async function getSessionStatus(): Promise<SessionStatus> {
  const response = await apiClient.get<SessionStatus>(
    `${BASE_PATH}/session/status`
  );
  return response.data;
}

/**
 * Extend current session
 */
export async function extendSession(
  data?: ExtendSessionRequest
): Promise<Session> {
  const response = await apiClient.post<Session>(
    `${BASE_PATH}/session/extend`,
    data
  );
  return response.data;
}

/**
 * Terminate current session (logout)
 */
export async function terminateSession(): Promise<void> {
  await apiClient.post(`${BASE_PATH}/session/terminate`);
}

/**
 * Terminate all sessions
 */
export async function terminateAllSessions(): Promise<void> {
  await apiClient.post(`${BASE_PATH}/session/terminate-all`);
}

// ============================================================================
// Login History
// ============================================================================

/**
 * Get login history
 */
export async function getLoginHistory(
  params?: LoginHistoryRequest
): Promise<LoginHistoryResponse> {
  const response = await apiClient.get<LoginHistoryResponse>(
    `${BASE_PATH}/login-history`,
    { params }
  );
  return response.data;
}

// ============================================================================
// Active Sessions
// ============================================================================

/**
 * Get all active sessions
 */
export async function getActiveSessions(): Promise<ActiveSessionsResponse> {
  const response = await apiClient.get<ActiveSessionsResponse>(
    `${BASE_PATH}/sessions/active`
  );
  return response.data;
}

/**
 * Terminate specific session
 */
export async function terminateSpecificSession(
  data: TerminateSessionRequest
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/sessions/terminate`, data);
}

// ============================================================================
// Security Settings
// ============================================================================

/**
 * Get security settings
 */
export async function getSecuritySettings(): Promise<SecuritySettings> {
  const response = await apiClient.get<SecuritySettings>(
    `${BASE_PATH}/settings`
  );
  return response.data;
}

/**
 * Update security settings
 */
export async function updateSecuritySettings(
  data: UpdateSecuritySettingsRequest
): Promise<SecuritySettings> {
  const response = await apiClient.patch<SecuritySettings>(
    `${BASE_PATH}/settings`,
    data
  );
  return response.data;
}

// ============================================================================
// Two-Factor Authentication
// ============================================================================

/**
 * Setup two-factor authentication
 */
export async function setupTwoFactor(): Promise<TwoFactorSetup> {
  const response = await apiClient.post<TwoFactorSetup>(
    `${BASE_PATH}/2fa/setup`
  );
  return response.data;
}

/**
 * Verify two-factor authentication
 */
export async function verifyTwoFactor(
  data: TwoFactorVerifyRequest
): Promise<{ success: boolean }> {
  const response = await apiClient.post<{ success: boolean }>(
    `${BASE_PATH}/2fa/verify`,
    data
  );
  return response.data;
}

/**
 * Disable two-factor authentication
 */
export async function disableTwoFactor(
  data: TwoFactorVerifyRequest
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/2fa/disable`, data);
}

/**
 * Get two-factor status
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const response = await apiClient.get<TwoFactorStatus>(
    `${BASE_PATH}/2fa/status`
  );
  return response.data;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(
  data: TwoFactorVerifyRequest
): Promise<{ backup_codes: string[] }> {
  const response = await apiClient.post<{ backup_codes: string[] }>(
    `${BASE_PATH}/2fa/backup-codes/regenerate`,
    data
  );
  return response.data;
}

// ============================================================================
// Password Management
// ============================================================================

/**
 * Change password
 */
export async function changePassword(
  data: PasswordChangeRequest
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/password/change`, data);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  data: PasswordResetRequest
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `${BASE_PATH}/password/reset`,
    data
  );
  return response.data;
}

/**
 * Confirm password reset
 */
export async function confirmPasswordReset(
  data: PasswordResetConfirmRequest
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/password/reset/confirm`, data);
}

/**
 * Check password strength
 */
export async function checkPasswordStrength(
  password: string
): Promise<PasswordStrength> {
  const response = await apiClient.post<PasswordStrength>(
    `${BASE_PATH}/password/strength`,
    { password }
  );
  return response.data;
}

// ============================================================================
// Security Alerts
// ============================================================================

/**
 * Get security alerts
 */
export async function getSecurityAlerts(params?: {
  unread_only?: boolean;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<SecurityAlertsResponse> {
  const response = await apiClient.get<SecurityAlertsResponse>(
    `${BASE_PATH}/alerts`,
    { params }
  );
  return response.data;
}

/**
 * Mark alerts as read
 */
export async function markAlertsRead(
  data: MarkAlertReadRequest
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/alerts/read`, data);
}

/**
 * Resolve alert
 */
export async function resolveAlert(data: ResolveAlertRequest): Promise<void> {
  await apiClient.post(`${BASE_PATH}/alerts/resolve`, data);
}

// ============================================================================
// Audit Log
// ============================================================================

/**
 * Get audit log
 */
export async function getAuditLog(
  params?: AuditLogRequest
): Promise<AuditLogResponse> {
  const response = await apiClient.get<AuditLogResponse>(
    `${BASE_PATH}/audit-log`,
    { params }
  );
  return response.data;
}

/**
 * Export audit log
 */
export async function exportAuditLog(params?: AuditLogRequest): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `${BASE_PATH}/audit-log/export`,
    { params, responseType: 'blob' }
  );
  return response.data;
}
