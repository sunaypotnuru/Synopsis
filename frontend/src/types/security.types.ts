/**
 * Security Types
 * 
 * Type definitions for security features including:
 * - Session management
 * - Login history
 * - Device management
 * - Rate limiting
 * - Security settings
 */

// ============================================================================
// Session Management
// ============================================================================

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  last_activity: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: DeviceInfo | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  is_trusted: boolean;
}

export interface SessionStatus {
  is_valid: boolean;
  expires_in_seconds: number;
  last_activity: string;
  requires_refresh: boolean;
  warning_threshold_seconds: number;
}

export interface ExtendSessionRequest {
  extend_by_minutes?: number;
}

// ============================================================================
// Login History
// ============================================================================

export interface LoginAttempt {
  id: string;
  user_id: string | null;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  device_info: DeviceInfo | null;
  failure_reason: string | null;
  is_suspicious: boolean;
  location: LocationInfo | null;
  created_at: string;
}

export interface LocationInfo {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LoginHistoryRequest {
  limit?: number;
  offset?: number;
  success_only?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface LoginHistoryResponse {
  attempts: LoginAttempt[];
  total: number;
  suspicious_count: number;
  failed_count: number;
  has_more: boolean;
}

// ============================================================================
// Active Sessions
// ============================================================================

export interface ActiveSession {
  id: string;
  device_info: DeviceInfo;
  ip_address: string;
  location: LocationInfo | null;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

export interface ActiveSessionsResponse {
  sessions: ActiveSession[];
  total: number;
  current_session_id: string;
}

export interface TerminateSessionRequest {
  session_id: string;
  reason?: string;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number | null;
}

export interface RateLimitStatus {
  endpoint: string;
  limits: {
    per_minute: RateLimitInfo;
    per_hour: RateLimitInfo;
    per_day: RateLimitInfo;
  };
  is_limited: boolean;
}

// ============================================================================
// Security Settings
// ============================================================================

export interface SecuritySettings {
  user_id: string;
  two_factor_enabled: boolean;
  session_timeout_minutes: number;
  trusted_devices: string[];
  login_notifications_enabled: boolean;
  suspicious_activity_alerts: boolean;
  ip_whitelist: string[];
  require_password_change: boolean;
  password_last_changed: string;
  updated_at: string;
}

export interface UpdateSecuritySettingsRequest {
  two_factor_enabled?: boolean;
  session_timeout_minutes?: number;
  login_notifications_enabled?: boolean;
  suspicious_activity_alerts?: boolean;
}

// ============================================================================
// Two-Factor Authentication
// ============================================================================

export interface TwoFactorSetup {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  backup_codes_remaining: number;
}

// ============================================================================
// Password Management
// ============================================================================

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
  is_strong: boolean;
}

// ============================================================================
// Security Alerts
// ============================================================================

export interface SecurityAlert {
  id: string;
  user_id: string;
  type: 'suspicious_login' | 'new_device' | 'password_change' | 'session_hijack' | 'rate_limit_exceeded' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: Record<string, any>;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface SecurityAlertsResponse {
  alerts: SecurityAlert[];
  total: number;
  unread_count: number;
  critical_count: number;
}

export interface MarkAlertReadRequest {
  alert_ids: string[];
}

export interface ResolveAlertRequest {
  alert_id: string;
  resolution_notes?: string;
}

// ============================================================================
// Audit Log
// ============================================================================

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'success' | 'failure';
  error_message: string | null;
  created_at: string;
}

export interface AuditLogRequest {
  user_id?: string;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Device Trust
// ============================================================================

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string;
  device_info: DeviceInfo;
  last_used: string;
  trusted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface TrustDeviceRequest {
  device_name: string;
  remember_for_days?: number;
}

export interface RevokeTrustRequest {
  device_id: string;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export interface SecurityWebSocketEvents {
  // Session events
  'security:session_expiring': { expires_in_seconds: number };
  'security:session_expired': { session_id: string };
  'security:session_terminated': { session_id: string; reason: string };

  // Login events
  'security:new_login': { device_info: DeviceInfo; location: LocationInfo | null };
  'security:suspicious_login': LoginAttempt;

  // Alert events
  'security:alert': SecurityAlert;
  'security:critical_alert': SecurityAlert;

  // Device events
  'security:new_device': { device_info: DeviceInfo };
  'security:device_revoked': { device_id: string };
}

// ============================================================================
// UI State Types
// ============================================================================

export interface SecurityState {
  currentSession: Session | null;
  activeSessions: ActiveSession[];
  loginHistory: LoginAttempt[];
  securitySettings: SecuritySettings | null;
  alerts: SecurityAlert[];
  unreadAlertCount: number;
  sessionExpiresIn: number | null;
  showSessionWarning: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SessionTimeoutWarningState {
  show: boolean;
  expiresIn: number;
  canExtend: boolean;
  isExtending: boolean;
}

// ============================================================================
// Security Compliance
// ============================================================================

export interface ComplianceStatus {
  hipaa_compliant: boolean;
  session_timeout_enforced: boolean;
  two_factor_available: boolean;
  audit_logging_enabled: boolean;
  encryption_enabled: boolean;
  last_security_audit: string;
  compliance_score: number;
}

export interface SecurityMetrics {
  total_sessions: number;
  active_sessions: number;
  failed_login_attempts_24h: number;
  suspicious_activities_24h: number;
  average_session_duration_minutes: number;
  two_factor_adoption_rate: number;
}
