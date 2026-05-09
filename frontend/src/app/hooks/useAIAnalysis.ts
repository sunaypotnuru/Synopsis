/**
 * useAIAnalysis Hook
 * Fetches AI analysis results and manages AI model interactions
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, API_ENDPOINTS } from '@/app/services/apiClient';

export interface AIAnalysisResult {
  id: string;
  patientId: string;
  modelName: string;
  imageUrl: string;
  prediction: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  notes: string;
  doctorReview?: {
    reviewed: boolean;
    doctorId?: string;
    feedback?: string;
    groundTruth?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  accuracy: number;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch AI analysis results
 */
export function useAIAnalysis(patientId?: string, modelName?: string) {
  const [results, setResults] = useState<AIAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = API_ENDPOINTS.ai.results('');
      if (patientId) {
        endpoint = `/api/patients/${patientId}/ai-analysis`;
      }
      if (modelName) {
        endpoint += `?model=${modelName}`;
      }

      const response = await apiClient.get<AIAnalysisResult[]>(endpoint);

      if (response.success && response.data) {
        setResults(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch AI analysis results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching AI analysis');
    } finally {
      setLoading(false);
    }
  }, [patientId, modelName]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    results,
    loading,
    error,
    refetch: fetchResults,
  };
}

/**
 * Fetch single AI analysis result
 */
export function useAIAnalysisDetail(analysisId: string) {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<AIAnalysisResult>(
        API_ENDPOINTS.ai.results(analysisId)
      );

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Failed to fetch AI analysis result');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching AI analysis');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (analysisId) {
      fetchResult();
    }
  }, [fetchResult, analysisId]);

  return {
    result,
    loading,
    error,
    refetch: fetchResult,
  };
}

/**
 * Fetch available AI models
 */
export function useAIModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<AIModel[]>(API_ENDPOINTS.ai.models);

      if (response.success && response.data) {
        setModels(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch AI models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching AI models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    refetch: fetchModels,
  };
}

/**
 * Upload image and run AI analysis
 */
export async function analyzeImage(
  patientId: string,
  modelName: string,
  imageFile: File
) {
  try {
    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('modelName', modelName);
    formData.append('image', imageFile);

    const response = await apiClient.post<AIAnalysisResult>(
      API_ENDPOINTS.ai.analyze,
      formData
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
 * Submit ground truth for AI model training
 */
export async function submitGroundTruth(
  analysisId: string,
  groundTruth: string,
  feedback: string
) {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.ai.groundTruth,
      {
        analysisId,
        groundTruth,
        feedback,
      }
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
 * Share AI analysis with doctor
 */
export async function shareAnalysisWithDoctor(
  analysisId: string,
  doctorId: string,
  message: string
) {
  try {
    const response = await apiClient.post(
      `/api/ai/results/${analysisId}/share`,
      {
        doctorId,
        message,
      }
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
