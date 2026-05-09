/**
 * Analytics Types
 * 
 * Type definitions for admin analytics dashboard including:
 * - User analytics
 * - Appointment analytics
 * - AI usage analytics
 * - Revenue analytics
 * - System performance
 * - Messaging analytics
 */

// ============================================================================
// Common Types
// ============================================================================

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface PercentageChange {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// User Analytics
// ============================================================================

export interface UserAnalytics {
  total_users: number;
  users_by_role: {
    patients: number;
    doctors: number;
    admins: number;
  };
  growth_rate: PercentageChange;
  daily_active_users: number;
  monthly_active_users: number;
  new_users_this_month: number;
  user_growth_trend: TimeSeriesDataPoint[];
  retention_rate: number;
}

export interface UserGrowthStats {
  period: string;
  new_users: number;
  active_users: number;
  churned_users: number;
  growth_rate: number;
}

// ============================================================================
// Appointment Analytics
// ============================================================================

export interface AppointmentAnalytics {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  completion_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  average_duration_minutes: number;
  appointments_trend: TimeSeriesDataPoint[];
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
  appointments_by_specialty: Array<{
    specialty: string;
    count: number;
  }>;
}

export interface AppointmentStats {
  period: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
}

// ============================================================================
// AI Usage Analytics
// ============================================================================

export interface AIUsageAnalytics {
  total_consultations: number;
  average_confidence_score: number;
  consultations_by_model: Array<{
    model: string;
    count: number;
    average_confidence: number;
  }>;
  usage_trend: TimeSeriesDataPoint[];
  low_confidence_count: number;
  high_confidence_count: number;
  average_response_time_ms: number;
  error_rate: number;
}

export interface AIModelStats {
  model_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_confidence: number;
  average_response_time: number;
  error_rate: number;
}

// ============================================================================
// Revenue Analytics
// ============================================================================

export interface RevenueAnalytics {
  total_revenue: number;
  revenue_this_month: number;
  revenue_last_month: number;
  growth_rate: PercentageChange;
  revenue_trend: TimeSeriesDataPoint[];
  revenue_by_service: Array<{
    service: string;
    revenue: number;
    percentage: number;
  }>;
  average_transaction_value: number;
  total_transactions: number;
}

export interface RevenueStats {
  period: string;
  total_revenue: number;
  appointment_revenue: number;
  consultation_revenue: number;
  other_revenue: number;
  transaction_count: number;
}

// ============================================================================
// System Performance
// ============================================================================

export interface SystemPerformance {
  active_sessions: number;
  average_response_time_ms: number;
  error_rate: number;
  uptime_percentage: number;
  database_stats: {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
    database_size_mb: number;
  };
  cache_stats: {
    hit_rate: number;
    miss_rate: number;
    total_keys: number;
    memory_usage_mb: number;
  };
  api_stats: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
  };
}

export interface SystemHealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    response_time_ms: number;
  }>;
}

// ============================================================================
// Messaging Analytics
// ============================================================================

export interface MessagingAnalytics {
  total_messages: number;
  messages_today: number;
  messages_this_week: number;
  messages_this_month: number;
  total_conversations: number;
  active_conversations: number;
  average_response_time_minutes: number;
  messages_trend: TimeSeriesDataPoint[];
  messages_by_type: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  peak_messaging_hours: Array<{
    hour: number;
    count: number;
  }>;
}

// ============================================================================
// Overview Dashboard
// ============================================================================

export interface AnalyticsOverview {
  user_analytics: UserAnalytics;
  appointment_analytics: AppointmentAnalytics;
  ai_usage_analytics: AIUsageAnalytics;
  revenue_analytics: RevenueAnalytics;
  system_performance: SystemPerformance;
  messaging_analytics: MessagingAnalytics;
  generated_at: string;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportRequest {
  type: 'users' | 'appointments' | 'ai_usage' | 'revenue' | 'messaging' | 'all';
  format: 'csv' | 'json';
  date_range: DateRange;
  filters?: Record<string, any>;
}

export interface ExportResponse {
  export_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url: string | null;
  file_size_bytes: number | null;
  created_at: string;
  expires_at: string;
}

// ============================================================================
// API Request Types
// ============================================================================

export interface AnalyticsRequest {
  start_date?: string;
  end_date?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AnalyticsDashboardState {
  overview: AnalyticsOverview | null;
  selectedDateRange: DateRange;
  selectedMetric: 'users' | 'appointments' | 'ai_usage' | 'revenue' | 'messaging' | 'system';
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

// ============================================================================
// Real-time Updates
// ============================================================================

export interface AnalyticsUpdate {
  metric: string;
  value: number;
  change: PercentageChange;
  timestamp: string;
}

export interface AnalyticsWebSocketEvents {
  'analytics:update': AnalyticsUpdate;
  'analytics:alert': {
    type: 'warning' | 'error' | 'info';
    metric: string;
    message: string;
    value: number;
    threshold: number;
  };
}
