/**
 * Compliance Service
 * Handles API calls to compliance systems (FDA APM, IEC 62304, SOC 2)
 */

import axios, { AxiosInstance } from 'axios';

// API base URLs - Point to FastAPI backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const FDA_APM_API = `${API_BASE}/api/v1/fda-apm`;
const IEC62304_API = `${API_BASE}/api/v1/iec62304`;
const SOC2_API = `${API_BASE}/api/v1/soc2`;

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
      // Ignore malformed entries.
    }
  }
  return null;
}

// Types
export interface PerformanceMetrics {
  model_name: string;
  timestamp: string;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  auc_roc: number;
  calibration_error: number;
  prediction_latency: number;
  total_predictions: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

export interface Alert {
  id: number;
  model_name: string;
  alert_level: 'info' | 'warning' | 'critical' | 'emergency';
  messages: string[];
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  safety_class: string;
  rationale: string;
  verification_method: string;
  status: string;
  parent_requirement_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface TraceabilityMatrix {
  requirement_id: string;
  requirement_title: string;
  requirement_type: string;
  safety_class: string;
  requirement_status: string;
  design_count: number;
  test_count: number;
  traceability_status: string;
}

export interface CoverageStats {
  total_requirements: number;
  requirements_with_design: number;
  requirements_with_tests: number;
  fully_traced_requirements: number;
  design_coverage: string;
  test_coverage: string;
  full_traceability: string;
  test_statistics: {
    total: number;
    passed: number;
    failed: number;
    not_run: number;
    pass_rate: string;
  };
}

export interface SOC2Control {
  control_id: string;
  control_name: string;
  control_category: string;
  implementation_status: string;
  test_result?: string;
  last_tested?: string;
  evidence_count: number;
}

export interface Evidence {
  id: number;
  control_id: string;
  control_name: string;
  evidence_type: string;
  evidence_data: Record<string, unknown>;
  collection_date: string;
  evidence_file_path?: string;
  notes?: string;
}

class ComplianceService {
  private fdaClient: AxiosInstance;
  private iecClient: AxiosInstance;
  private soc2Client: AxiosInstance;

  constructor() {
    this.fdaClient = axios.create({
      baseURL: FDA_APM_API,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.iecClient = axios.create({
      baseURL: IEC62304_API,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.soc2Client = axios.create({
      baseURL: SOC2_API,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptors for authentication
    [this.fdaClient, this.iecClient, this.soc2Client].forEach(client => {
      client.interceptors.request.use(
        (config) => {
          const token = getSupabaseAccessToken();
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );
    });
  }

  // ==================== FDA APM Methods ====================

  async getModels(): Promise<Array<{ name: string }>> {
    const response = await this.fdaClient.get<{ models: Array<{ name: string } | unknown> }>('/models');
    return response.data.models.filter((model): model is { name: string } => 
      typeof model === 'object' && model !== null && 'name' in model && typeof model.name === 'string'
    );
  }

  async getMetrics(modelName: string, hours: number = 24): Promise<PerformanceMetrics[]> {
    const response = await this.fdaClient.get(`/metrics/${modelName}?hours=${hours}`);
    return response.data;
  }

  async getLatestMetrics(modelName: string): Promise<PerformanceMetrics> {
    const response = await this.fdaClient.get(`/metrics/${modelName}/latest`);
    return response.data;
  }

  async getAlerts(params?: {
    modelName?: string;
    level?: string;
    hours?: number;
    unresolvedOnly?: boolean;
  }): Promise<Alert[]> {
    const response = await this.fdaClient.get('/alerts', { params });
    return response.data;
  }

  async acknowledgeAlert(alertId: number, acknowledgedBy: string) {
    const response = await this.fdaClient.post(`/alerts/${alertId}/acknowledge`, null, {
      params: { acknowledged_by: acknowledgedBy },
    });
    return response.data;
  }

  async resolveAlert(alertId: number, resolvedBy: string, resolutionNotes: string) {
    const response = await this.fdaClient.post(`/alerts/${alertId}/resolve`, null, {
      params: {
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes,
      },
    });
    return response.data;
  }

  async recordPrediction(prediction: {
    model_name: string;
    patient_id: string;
    image_id: string;
    predicted_label: number;
    confidence: number;
    metadata?: Record<string, unknown>;
  }) {
    const response = await this.fdaClient.post('/predictions', prediction);
    return response.data;
  }

  async recordGroundTruth(predictionId: number, trueLabel: number, verifiedBy: string) {
    const response = await this.fdaClient.post(`/predictions/${predictionId}/ground-truth`, {
      prediction_id: predictionId,
      true_label: trueLabel,
      verified_by: verifiedBy,
    });
    return response.data;
  }

  async getDriftMetrics(modelName: string, days: number = 30) {
    const response = await this.fdaClient.get(`/drift/${modelName}`, {
      params: { days },
    });
    return response.data;
  }

  async getBiasMetrics(modelName: string, days: number = 30) {
    const response = await this.fdaClient.get(`/bias/${modelName}`, {
      params: { days },
    });
    return response.data;
  }

  async getPerformanceReport(modelName: string, days: number = 30) {
    const response = await this.fdaClient.get(`/report/${modelName}`, {
      params: { days },
    });
    return response.data;
  }

  // ==================== IEC 62304 Methods ====================

  async getRequirements(params?: {
    safetyClass?: string;
    status?: string;
    type?: string;
  }): Promise<Requirement[]> {
    const response = await this.iecClient.get('/requirements', { params });
    return response.data;
  }

  async getRequirement(requirementId: string): Promise<Requirement> {
    const response = await this.iecClient.get(`/requirements/${requirementId}`);
    return response.data;
  }

  async getRequirementTraceability(requirementId: string) {
    const response = await this.iecClient.get(`/requirements/${requirementId}/traceability`);
    return response.data;
  }

  async getDesignElements(safetyClass?: string) {
    const response = await this.iecClient.get('/design-elements', {
      params: { safety_class: safetyClass },
    });
    return response.data;
  }

  async getTraceabilityMatrix(safetyClass?: string): Promise<TraceabilityMatrix[]> {
    const response = await this.iecClient.get('/traceability-matrix', {
      params: { safety_class: safetyClass },
    });
    return response.data;
  }

  async getCoverageStatistics(): Promise<CoverageStats> {
    const response = await this.iecClient.get('/coverage-stats');
    return response.data;
  }

  async exportTraceabilityCSV() {
    const response = await this.iecClient.get('/export-csv', {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `traceability-matrix-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async validateTraceability() {
    const response = await this.iecClient.get('/validate');
    return response.data;
  }

  async getTestCases(params?: { status?: string; type?: string }) {
    const response = await this.iecClient.get('/test-cases', { params });
    return response.data;
  }

  async getImplementations() {
    const response = await this.iecClient.get('/implementations');
    return response.data;
  }

  async getSafetyClasses() {
    const response = await this.iecClient.get('/safety-classes');
    return response.data.safety_classes;
  }

  // ==================== SOC 2 Methods ====================

  async getSOC2Controls(category?: string): Promise<SOC2Control[]> {
    const response = await this.soc2Client.get('/controls', {
      params: { category },
    });
    return response.data;
  }

  async getSOC2Control(controlId: string): Promise<SOC2Control> {
    const response = await this.soc2Client.get(`/controls/${controlId}`);
    return response.data;
  }

  async getEvidence(params?: {
    controlId?: string;
    evidenceType?: string;
    days?: number;
  }): Promise<Evidence[]> {
    const response = await this.soc2Client.get('/evidence', { params });
    return response.data;
  }

  async getControlEvidence(controlId: string): Promise<Evidence[]> {
    const response = await this.soc2Client.get(`/evidence/${controlId}`);
    return response.data;
  }

  async collectEvidence(controlIds?: string[], forceRefresh: boolean = false) {
    const response = await this.soc2Client.post('/collect-evidence', {
      control_ids: controlIds,
      force_refresh: forceRefresh,
    });
    return response.data;
  }

  async generateSOC2Report(params?: {
    startDate?: string;
    endDate?: string;
    controlCategories?: string[];
  }) {
    const response = await this.soc2Client.post('/generate-report', params, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `soc2-evidence-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async getSOC2Statistics() {
    const response = await this.soc2Client.get('/statistics');
    return response.data;
  }

  async getSOC2Categories() {
    const response = await this.soc2Client.get('/categories');
    return response.data.categories;
  }

  // ==================== Dashboard Methods ====================

  async getComplianceDashboard() {
    try {
      const [fdaModels, iecStats, soc2Stats] = await Promise.all([
        this.getModels(),
        this.getCoverageStatistics(),
        this.getSOC2Statistics(),
      ]);

      // Get latest metrics for all models
      const metricsPromises = fdaModels.map((model: { name: string }) =>
        this.getLatestMetrics(model.name).catch(() => null)
      );
      const latestMetrics = await Promise.all(metricsPromises);

      // Get recent alerts
      const alerts = await this.getAlerts({ hours: 24, unresolvedOnly: true });

      return {
        fda: {
          models: fdaModels,
          latestMetrics: latestMetrics.filter((m): m is PerformanceMetrics => m !== null),
          recentAlerts: alerts,
        },
        iec62304: iecStats,
        soc2: soc2Stats,
      };
    } catch (error) {
      console.error('Error fetching compliance dashboard:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complianceService = new ComplianceService();

export default complianceService;
