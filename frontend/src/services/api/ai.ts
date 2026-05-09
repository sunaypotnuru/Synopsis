/**
 * AI API Client
 * 
 * Provides methods to interact with AI endpoints
 */

import { apiClient } from '../apiClient';
import type {
  AIRequest,
  AIResponse,
  CreateAIRequestPayload,
  ValidationResults,
  ValidateResponseRequest,
  PromptTemplate,
  RenderTemplateRequest,
  RenderTemplateResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ConversationContext,
  AddContextRequest,
  GetContextRequest,
  GetContextResponse,
  CompressContextRequest,
  AIRateLimitInfo,
  CheckRateLimitRequest,
  AIMetrics,
  AIQualityMetrics,
  AIModel,
  ModelHealthCheck,
  AIFeedback,
  SubmitFeedbackRequest,
} from '../../types';

const BASE_PATH = '/api/v1/ai';

// ============================================================================
// AI Requests
// ============================================================================

/**
 * Create AI request
 */
export async function createAIRequest(
  data: CreateAIRequestPayload
): Promise<AIResponse> {
  const response = await apiClient.post<AIResponse>(
    `${BASE_PATH}/requests`,
    data
  );
  return response.data;
}

/**
 * Get AI request by ID
 */
export async function getAIRequest(requestId: string): Promise<AIRequest> {
  const response = await apiClient.get<AIRequest>(
    `${BASE_PATH}/requests/${requestId}`
  );
  return response.data;
}

/**
 * Get AI response by request ID
 */
export async function getAIResponse(requestId: string): Promise<AIResponse> {
  const response = await apiClient.get<AIResponse>(
    `${BASE_PATH}/requests/${requestId}/response`
  );
  return response.data;
}

// ============================================================================
// AI Validation
// ============================================================================

/**
 * Validate AI response
 */
export async function validateResponse(
  data: ValidateResponseRequest
): Promise<ValidationResults> {
  const response = await apiClient.post<ValidationResults>(
    `${BASE_PATH}/validate`,
    data
  );
  return response.data;
}

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Get all prompt templates
 */
export async function getPromptTemplates(params?: {
  category?: string;
  active_only?: boolean;
}): Promise<PromptTemplate[]> {
  const response = await apiClient.get<PromptTemplate[]>(
    `${BASE_PATH}/templates`,
    { params }
  );
  return response.data;
}

/**
 * Get prompt template by ID
 */
export async function getPromptTemplate(
  templateId: string
): Promise<PromptTemplate> {
  const response = await apiClient.get<PromptTemplate>(
    `${BASE_PATH}/templates/${templateId}`
  );
  return response.data;
}

/**
 * Create prompt template
 */
export async function createPromptTemplate(
  data: CreateTemplateRequest
): Promise<PromptTemplate> {
  const response = await apiClient.post<PromptTemplate>(
    `${BASE_PATH}/templates`,
    data
  );
  return response.data;
}

/**
 * Update prompt template
 */
export async function updatePromptTemplate(
  templateId: string,
  data: UpdateTemplateRequest
): Promise<PromptTemplate> {
  const response = await apiClient.patch<PromptTemplate>(
    `${BASE_PATH}/templates/${templateId}`,
    data
  );
  return response.data;
}

/**
 * Delete prompt template
 */
export async function deletePromptTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/templates/${templateId}`);
}

/**
 * Render prompt template
 */
export async function renderTemplate(
  data: RenderTemplateRequest
): Promise<RenderTemplateResponse> {
  const response = await apiClient.post<RenderTemplateResponse>(
    `${BASE_PATH}/templates/render`,
    data
  );
  return response.data;
}

// ============================================================================
// Context Management
// ============================================================================

/**
 * Get conversation context
 */
export async function getContext(
  data: GetContextRequest
): Promise<GetContextResponse> {
  const response = await apiClient.post<GetContextResponse>(
    `${BASE_PATH}/context/get`,
    data
  );
  return response.data;
}

/**
 * Add to conversation context
 */
export async function addContext(
  data: AddContextRequest
): Promise<ConversationContext> {
  const response = await apiClient.post<ConversationContext>(
    `${BASE_PATH}/context/add`,
    data
  );
  return response.data;
}

/**
 * Compress conversation context
 */
export async function compressContext(
  data: CompressContextRequest
): Promise<ConversationContext> {
  const response = await apiClient.post<ConversationContext>(
    `${BASE_PATH}/context/compress`,
    data
  );
  return response.data;
}

/**
 * Clear conversation context
 */
export async function clearContext(conversationId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/context/${conversationId}`);
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Get rate limit info
 */
export async function getRateLimitInfo(): Promise<AIRateLimitInfo> {
  const response = await apiClient.get<AIRateLimitInfo>(
    `${BASE_PATH}/rate-limit`
  );
  return response.data;
}

/**
 * Check rate limit before request
 */
export async function checkRateLimit(
  data?: CheckRateLimitRequest
): Promise<{ allowed: boolean; reason?: string }> {
  const response = await apiClient.post<{ allowed: boolean; reason?: string }>(
    `${BASE_PATH}/rate-limit/check`,
    data
  );
  return response.data;
}

// ============================================================================
// AI Monitoring
// ============================================================================

/**
 * Get AI metrics
 */
export async function getAIMetrics(params?: {
  model?: string;
  start_date?: string;
  end_date?: string;
}): Promise<AIMetrics> {
  const response = await apiClient.get<AIMetrics>(
    `${BASE_PATH}/metrics`,
    { params }
  );
  return response.data;
}

/**
 * Get AI quality metrics
 */
export async function getQualityMetrics(params?: {
  model?: string;
  start_date?: string;
  end_date?: string;
}): Promise<AIQualityMetrics> {
  const response = await apiClient.get<AIQualityMetrics>(
    `${BASE_PATH}/metrics/quality`,
    { params }
  );
  return response.data;
}

// ============================================================================
// AI Models
// ============================================================================

/**
 * Get available AI models
 */
export async function getAIModels(): Promise<AIModel[]> {
  const response = await apiClient.get<AIModel[]>(`${BASE_PATH}/models`);
  return response.data;
}

/**
 * Get AI model by ID
 */
export async function getAIModel(modelId: string): Promise<AIModel> {
  const response = await apiClient.get<AIModel>(
    `${BASE_PATH}/models/${modelId}`
  );
  return response.data;
}

/**
 * Check model health
 */
export async function checkModelHealth(
  modelId: string
): Promise<ModelHealthCheck> {
  const response = await apiClient.get<ModelHealthCheck>(
    `${BASE_PATH}/models/${modelId}/health`
  );
  return response.data;
}

// ============================================================================
// AI Feedback
// ============================================================================

/**
 * Submit AI feedback
 */
export async function submitFeedback(
  data: SubmitFeedbackRequest
): Promise<AIFeedback> {
  const response = await apiClient.post<AIFeedback>(
    `${BASE_PATH}/feedback`,
    data
  );
  return response.data;
}

/**
 * Get feedback for request
 */
export async function getFeedback(requestId: string): Promise<AIFeedback | null> {
  const response = await apiClient.get<AIFeedback | null>(
    `${BASE_PATH}/requests/${requestId}/feedback`
  );
  return response.data;
}
