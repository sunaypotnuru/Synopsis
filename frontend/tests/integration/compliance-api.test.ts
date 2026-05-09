/**
 * Integration Tests for Compliance API Routes
 * Tests API proxy routes with mocked backend responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/admin/compliance/dashboard/route';
import { GET as getFdaApm } from '@/app/api/admin/compliance/fda-apm/route';
import { GET as getIec62304 } from '@/app/api/admin/compliance/iec62304/route';
import { GET as getSoc2 } from '@/app/api/admin/compliance/soc2/route';
import { GET as getSystemHealth } from '@/app/api/admin/system-health/route';

// Mock fetch globally
global.fetch = vi.fn();

describe('Compliance Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return compliance dashboard data', async () => {
    // Mock responses from all services
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: 'diabetic_retinopathy' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_requirements: 100,
          design_coverage: '95.0',
          test_coverage: '90.0',
          full_traceability: '85.0',
          test_statistics: { pass_rate: '92.0' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          implementation_rate: '95.0',
          test_pass_rate: '90.0',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sensitivity: 0.92,
          specificity: 0.88,
          auc_roc: 0.95,
        }),
      });

    const request = new Request('http://localhost:3000/api/admin/compliance/dashboard');
    const response = await GET(request as unknown as Request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('overall');
    expect(data.data).toHaveProperty('fda');
    expect(data.data).toHaveProperty('iec62304');
    expect(data.data).toHaveProperty('soc2');
    expect(data.data.overall.score).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    // Mock fetch to throw error
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost:3000/api/admin/compliance/dashboard');
    const response = await GET(request as unknown as Request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(response.status).toBe(500);
  });
});

describe('FDA APM API Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should proxy GET requests to FDA APM service', async () => {
    const mockMetrics = {
      model_name: 'diabetic_retinopathy',
      sensitivity: 0.92,
      specificity: 0.88,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockMetrics,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/fda-apm?endpoint=/metrics/diabetic_retinopathy/latest'
    );
    const response = await getFdaApm(request as unknown as Request);
    const data = await response.json();

    expect(data).toEqual(mockMetrics);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/metrics/diabetic_retinopathy/latest'),
      expect.any(Object)
    );
  });

  it('should proxy POST requests to FDA APM service', async () => {
    const mockResponse = { status: 'acknowledged', alert_id: 123 };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/fda-apm?endpoint=/alerts/123/acknowledge',
      {
        method: 'POST',
        body: JSON.stringify({ acknowledged_by: 'admin' }),
      }
    );
    const response = await getFdaApm(request as unknown as Request);
    const data = await response.json();

    expect(data).toEqual(mockResponse);
  });

  it('should handle timeout errors', async () => {
    // Mock AbortError
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/fda-apm?endpoint=/metrics/test'
    );
    const response = await getFdaApm(request as unknown as Request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('Request timeout');
    expect(response.status).toBe(504);
  });
});

describe('IEC 62304 API Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should proxy requirements request', async () => {
    const mockRequirements = [
      {
        id: 'REQ-001',
        title: 'Test Requirement',
        safety_class: 'B',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRequirements,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/iec62304?endpoint=/requirements'
    );
    const response = await getIec62304(request as unknown as Request);
    const data = await response.json();

    expect(data).toEqual(mockRequirements);
  });

  it('should handle CSV export', async () => {
    const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/iec62304?endpoint=/export-csv'
    );
    const response = await getIec62304(request as unknown as Request);

    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
  });
});

describe('SOC 2 API Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should proxy controls request', async () => {
    const mockControls = [
      {
        control_id: 'CC6.1',
        control_name: 'Logical Access Controls',
        implementation_status: 'implemented',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockControls,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/soc2?endpoint=/controls'
    );
    const response = await getSoc2(request as unknown as Request);
    const data = await response.json();

    expect(data).toEqual(mockControls);
  });

  it('should handle evidence collection', async () => {
    const mockResponse = {
      status: 'started',
      message: 'Evidence collection started',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const request = new Request(
      'http://localhost:3000/api/admin/compliance/soc2?endpoint=/collect-evidence',
      {
        method: 'POST',
        body: JSON.stringify({ control_ids: ['CC6.1'], force_refresh: false }),
      }
    );
    const response = await getSoc2(request as unknown as Request);
    const data = await response.json();

    expect(data).toEqual(mockResponse);
  });
});

describe('System Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return system health metrics', async () => {
    const request = new Request('http://localhost:3000/api/admin/system-health');
    const response = await getSystemHealth(request as unknown as Request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('timestamp');
    expect(data.data).toHaveProperty('system');
    expect(data.data.system).toHaveProperty('cpu');
    expect(data.data.system).toHaveProperty('memory');
  });

  it('should check service health', async () => {
    // Mock service health checks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
    });

    const request = new Request('http://localhost:3000/api/admin/system-health?metric=services');
    const response = await getSystemHealth(request as unknown as Request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('services');
    expect(Array.isArray(data.data.services)).toBe(true);
  });
});
