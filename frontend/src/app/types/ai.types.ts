/**
 * AI Types
 * 
 * Type definitions for AI features including:
 * - AI validation
 * - Prompt templates
 * - Context management
 * - Rate limiting
 * - Quality monitoring
 */

// ============================================================================
// AI Request & Response
// ============================================================================

export interface AIRequest {
  id: string;
  user_id: string;
  model: string;
  prompt: string;
  template_id: string | null;
  context: Record<string, any> | null;
  max_tokens: number;
  temperature: number;
  created_at: string;
}

export interface AIResponse {
  id: string;
  request_id: string;
  content: string;
  confidence_score: number;
  validation_results: ValidationResults;
  tokens_used: number;
  response_time_ms: number;
  model_version: string;
  created_at: string;
}

export interface CreateAIRequestPayload {
  model: string;
  prompt: string;
  template_id?: string;
  context?: Record<string, any>;
  max_tokens?: number;
  temperature?: number;
}

// ============================================================================
// AI Validation
// ============================================================================

export interface ValidationResults {
  is_valid: boolean;
  confidence_level: 'high' | 'medium' | 'low';
  checks: {
    length_check: ValidationCheck;
    format_check: ValidationCheck;
    completeness_check: ValidationCheck;
    medical_terminology_check: ValidationCheck;
    coherence_check: ValidationCheck;
    hallucination_check: ValidationCheck;
  };
  overall_score: number;
  warnings: string[];
  errors: string[];
}

export interface ValidationCheck {
  passed: boolean;
  score: number;
  message: string;
  details: Record<string, any> | null;
}

export interface ValidateResponseRequest {
  content: string;
  expected_format?: string;
  context?: Record<string, any>;
}

// ============================================================================
// Prompt Templates
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'diagnosis' | 'treatment' | 'prescription' | 'consultation' | 'general';
  template: string;
  variables: string[];
  example_usage: string | null;
  performance_metrics: TemplatePerformanceMetrics | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplatePerformanceMetrics {
  total_uses: number;
  average_confidence: number;
  average_response_time_ms: number;
  success_rate: number;
  last_used: string;
}

export interface RenderTemplateRequest {
  template_id: string;
  variables: Record<string, any>;
}

export interface RenderTemplateResponse {
  rendered_prompt: string;
  variables_used: string[];
  template_version: number;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: PromptTemplate['category'];
  template: string;
  variables: string[];
  example_usage?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  template?: string;
  variables?: string[];
  example_usage?: string;
  is_active?: boolean;
}

// ============================================================================
// Context Management
// ============================================================================

export interface ConversationContext {
  id: string;
  user_id: string;
  conversation_id: string;
  short_term_memory: ContextMemory[];
  long_term_memory: ContextMemory[];
  working_memory: Record<string, any>;
  token_budget: number;
  tokens_used: number;
  compression_level: number;
  last_updated: string;
  created_at: string;
}

export interface ContextMemory {
  id: string;
  type: 'user_message' | 'assistant_message' | 'system_message' | 'metadata';
  content: string;
  importance: number;
  timestamp: string;
  tokens: number;
}

export interface AddContextRequest {
  conversation_id: string;
  type: ContextMemory['type'];
  content: string;
  importance?: number;
}

export interface GetContextRequest {
  conversation_id: string;
  max_tokens?: number;
  include_long_term?: boolean;
}

export interface GetContextResponse {
  context: ConversationContext;
  formatted_context: string;
  total_tokens: number;
  compression_applied: boolean;
}

export interface CompressContextRequest {
  conversation_id: string;
  target_tokens: number;
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface AIRateLimitInfo {
  user_id: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  limits: {
    requests_per_minute: number;
    requests_per_day: number;
    tokens_per_minute: number;
    tokens_per_day: number;
    cost_per_day: number;
  };
  usage: {
    requests_this_minute: number;
    requests_today: number;
    tokens_this_minute: number;
    tokens_today: number;
    cost_today: number;
  };
  remaining: {
    requests_per_minute: number;
    requests_per_day: number;
    tokens_per_minute: number;
    tokens_per_day: number;
    cost_per_day: number;
  };
  reset_at: {
    minute: string;
    day: string;
  };
  is_limited: boolean;
}

export interface CheckRateLimitRequest {
  estimated_tokens?: number;
}

// ============================================================================
// AI Monitoring
// ============================================================================

export interface AIMetrics {
  id: string;
  model: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_confidence: number;
  average_response_time_ms: number;
  total_tokens_used: number;
  total_cost: number;
  error_rate: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface AIQualityMetrics {
  model: string;
  confidence_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  validation_pass_rate: number;
  average_validation_score: number;
  common_warnings: Array<{
    warning: string;
    count: number;
  }>;
  common_errors: Array<{
    error: string;
    count: number;
  }>;
}

export interface AIPerformanceAlert {
  id: string;
  type: 'drift_detected' | 'high_error_rate' | 'slow_response' | 'low_confidence' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  model: string;
  message: string;
  metrics: Record<string, any>;
  threshold: number;
  actual_value: number;
  created_at: string;
}

// ============================================================================
// AI Models
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'diagnosis' | 'treatment' | 'prescription' | 'general';
  status: 'active' | 'inactive' | 'deprecated';
  capabilities: string[];
  max_tokens: number;
  cost_per_1k_tokens: number;
  average_response_time_ms: number;
  accuracy_score: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelHealthCheck {
  model: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error_rate: number;
  last_check: string;
  issues: string[];
}

// ============================================================================
// WebSocket Events
// ============================================================================

export interface AIWebSocketEvents {
  // Response events
  'ai:response_start': { request_id: string };
  'ai:response_chunk': { request_id: string; chunk: string };
  'ai:response_complete': AIResponse;
  'ai:response_error': { request_id: string; error: string };

  // Rate limit events
  'ai:rate_limit_warning': { remaining_requests: number; reset_at: string };
  'ai:rate_limit_exceeded': { reset_at: string };

  // Quality events
  'ai:low_confidence': { request_id: string; confidence: number };
  'ai:validation_failed': { request_id: string; errors: string[] };

  // Performance events
  'ai:performance_alert': AIPerformanceAlert;
  'ai:model_status_change': { model: string; status: string };
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AIState {
  currentRequest: AIRequest | null;
  currentResponse: AIResponse | null;
  templates: PromptTemplate[];
  selectedTemplate: PromptTemplate | null;
  context: ConversationContext | null;
  rateLimitInfo: AIRateLimitInfo | null;
  metrics: AIMetrics | null;
  isProcessing: boolean;
  isStreaming: boolean;
  streamedContent: string;
  error: string | null;
}

export interface AIConsultationState {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    confidence?: number;
    validation?: ValidationResults;
  }>;
  isTyping: boolean;
  selectedModel: string;
  temperature: number;
  maxTokens: number;
}

export interface TemplateEditorState {
  template: PromptTemplate | null;
  variables: Record<string, any>;
  preview: string;
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// AI Configuration
// ============================================================================

export interface AIConfiguration {
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  enable_streaming: boolean;
  enable_validation: boolean;
  validation_threshold: number;
  enable_context_compression: boolean;
  max_context_tokens: number;
  enable_rate_limiting: boolean;
  enable_monitoring: boolean;
}

export interface UpdateAIConfigurationRequest {
  default_model?: string;
  default_temperature?: number;
  default_max_tokens?: number;
  enable_streaming?: boolean;
  enable_validation?: boolean;
  validation_threshold?: number;
}

// ============================================================================
// AI Feedback
// ============================================================================

export interface AIFeedback {
  id: string;
  request_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback_type: 'accuracy' | 'relevance' | 'completeness' | 'clarity' | 'other';
  comment: string | null;
  is_helpful: boolean;
  created_at: string;
}

export interface SubmitFeedbackRequest {
  request_id: string;
  rating: AIFeedback['rating'];
  feedback_type: AIFeedback['feedback_type'];
  comment?: string;
  is_helpful: boolean;
}
