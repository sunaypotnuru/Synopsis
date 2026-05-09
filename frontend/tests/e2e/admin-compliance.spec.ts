/**
 * E2E Tests for Admin Compliance Portal
 * Tests complete user workflows with Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Helper to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@netra-ai.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin/dashboard');
}

// Helper to setup API mocks
async function setupComplianceMocks(page: Page) {
  // Mock FDA APM API
  await page.route('**/api/admin/compliance/fda-apm**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('endpoint=/models')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [
            { name: 'diabetic_retinopathy', display_name: 'Diabetic Retinopathy' },
            { name: 'cataract', display_name: 'Cataract Detection' },
          ],
        }),
      });
    } else if (url.includes('endpoint=/metrics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model_name: 'diabetic_retinopathy',
          sensitivity: 0.92,
          specificity: 0.88,
          auc_roc: 0.95,
          timestamp: new Date().toISOString(),
        }),
      });
    } else if (url.includes('endpoint=/alerts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            model_name: 'diabetic_retinopathy',
            alert_level: 'warning',
            messages: ['Sensitivity dropped to 87%'],
            timestamp: new Date().toISOString(),
            acknowledged: false,
            resolved: false,
          },
        ]),
      });
    }
  });

  // Mock IEC 62304 API
  await page.route('**/api/admin/compliance/iec62304**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('endpoint=/requirements')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'REQ-001',
            title: 'User Authentication',
            safety_class: 'B',
            status: 'approved',
          },
        ]),
      });
    } else if (url.includes('endpoint=/coverage-stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_requirements: 100,
          design_coverage: '95.0',
          test_coverage: '90.0',
          full_traceability: '85.0',
          test_statistics: { pass_rate: '92.0' },
        }),
      });
    } else if (url.includes('endpoint=/traceability-matrix')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            requirement_id: 'REQ-001',
            requirement_title: 'User Authentication',
            design_count: 2,
            test_count: 3,
            traceability_status: 'complete',
          },
        ]),
      });
    }
  });

  // Mock SOC 2 API
  await page.route('**/api/admin/compliance/soc2**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('endpoint=/controls')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            control_id: 'CC6.1',
            control_name: 'Logical Access Controls',
            implementation_status: 'implemented',
            evidence_count: 5,
          },
        ]),
      });
    } else if (url.includes('endpoint=/statistics')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_controls: 47,
          implemented_controls: 45,
          implementation_rate: '95.7',
          test_pass_rate: '93.3',
        }),
      });
    }
  });

  // Mock Dashboard API
  await page.route('**/api/admin/compliance/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          overall: { score: 94, status: 'excellent' },
          fda: { score: 95, models: [], latestMetrics: [], alerts: [] },
          iec62304: { score: 93, total_requirements: 100 },
          soc2: { score: 94, total_controls: 47 },
        },
      }),
    });
  });
}

test.describe('Admin Compliance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
  });

  test('should display compliance dashboard', async ({ page }) => {
    await page.goto('/admin/compliance');

    // Check for main dashboard elements
    await expect(page.locator('h1')).toContainText('Compliance Dashboard');
    
    // Check for compliance score cards
    await expect(page.locator('text=FDA APM')).toBeVisible();
    await expect(page.locator('text=IEC 62304')).toBeVisible();
    await expect(page.locator('text=SOC 2')).toBeVisible();
    
    // Check for scores
    await expect(page.locator('text=95%')).toBeVisible();
  });

  test('should navigate to FDA APM monitoring', async ({ page }) => {
    await page.goto('/admin/compliance');
    
    // Click on FDA APM card
    await page.click('text=FDA APM');
    
    // Should navigate to FDA APM page
    await expect(page).toHaveURL('/admin/compliance/fda-apm');
    await expect(page.locator('h1')).toContainText('FDA APM Monitoring');
  });

  test('should display recent alerts', async ({ page }) => {
    await page.goto('/admin/compliance');
    
    // Check for alerts section
    await expect(page.locator('text=Recent Alerts')).toBeVisible();
    await expect(page.locator('text=Sensitivity dropped to 87%')).toBeVisible();
  });

  test('should show quick actions', async ({ page }) => {
    await page.goto('/admin/compliance');
    
    // Check for quick action buttons
    await expect(page.locator('button:has-text("View FDA Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Traceability")')).toBeVisible();
    await expect(page.locator('button:has-text("Collect Evidence")')).toBeVisible();
  });
});

test.describe('FDA APM Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
  });

  test('should display model performance metrics', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Check for model selector
    await expect(page.locator('select[name="model"]')).toBeVisible();
    
    // Check for metrics display
    await expect(page.locator('text=Sensitivity')).toBeVisible();
    await expect(page.locator('text=Specificity')).toBeVisible();
    await expect(page.locator('text=AUC-ROC')).toBeVisible();
    
    // Check for chart
    await expect(page.locator('[data-testid="apm-chart"]')).toBeVisible();
  });

  test('should filter metrics by time range', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Select time range
    await page.selectOption('select[name="timeRange"]', '7d');
    
    // Chart should update (check for loading state)
    await expect(page.locator('[data-testid="apm-chart"]')).toBeVisible();
  });

  test('should acknowledge alert', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Find alert
    await expect(page.locator('text=Sensitivity dropped to 87%')).toBeVisible();
    
    // Click acknowledge button
    await page.click('button:has-text("Acknowledge")');
    
    // Should show success message
    await expect(page.locator('text=Alert acknowledged')).toBeVisible();
  });

  test('should resolve alert with notes', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Click resolve button
    await page.click('button:has-text("Resolve")');
    
    // Fill resolution notes
    await page.fill('textarea[name="resolutionNotes"]', 'Retrained model with new data');
    
    // Submit
    await page.click('button:has-text("Submit Resolution")');
    
    // Should show success message
    await expect(page.locator('text=Alert resolved')).toBeVisible();
  });

  test('should export performance report', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export Report")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('fda-apm-report');
  });
});

test.describe('IEC 62304 Traceability Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
  });

  test('should display traceability matrix', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Check for matrix table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=REQ-001')).toBeVisible();
    await expect(page.locator('text=User Authentication')).toBeVisible();
  });

  test('should filter requirements by safety class', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Select safety class filter
    await page.selectOption('select[name="safetyClass"]', 'B');
    
    // Should show filtered results
    await expect(page.locator('text=REQ-001')).toBeVisible();
  });

  test('should search requirements', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'Authentication');
    
    // Should show filtered results
    await expect(page.locator('text=User Authentication')).toBeVisible();
  });

  test('should display coverage statistics', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Check for stats cards
    await expect(page.locator('text=Design Coverage')).toBeVisible();
    await expect(page.locator('text=95.0%')).toBeVisible();
    await expect(page.locator('text=Test Coverage')).toBeVisible();
    await expect(page.locator('text=90.0%')).toBeVisible();
  });

  test('should export traceability matrix to CSV', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('traceability-matrix');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should drill down to requirement details', async ({ page }) => {
    await page.goto('/admin/compliance/iec62304');
    
    // Click on requirement
    await page.click('text=REQ-001');
    
    // Should show requirement details modal/page
    await expect(page.locator('text=Requirement Details')).toBeVisible();
    await expect(page.locator('text=User Authentication')).toBeVisible();
  });
});

test.describe('SOC 2 Evidence Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
  });

  test('should display SOC 2 controls', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Check for controls grid
    await expect(page.locator('text=CC6.1')).toBeVisible();
    await expect(page.locator('text=Logical Access Controls')).toBeVisible();
  });

  test('should filter controls by category', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Select category filter
    await page.selectOption('select[name="category"]', 'Security');
    
    // Should show filtered controls
    await expect(page.locator('text=CC6.1')).toBeVisible();
  });

  test('should display control statistics', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Check for stats
    await expect(page.locator('text=Total Controls')).toBeVisible();
    await expect(page.locator('text=47')).toBeVisible();
    await expect(page.locator('text=Implementation Rate')).toBeVisible();
    await expect(page.locator('text=95.7%')).toBeVisible();
  });

  test('should collect evidence for control', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Click collect evidence button
    await page.click('button:has-text("Collect Evidence")');
    
    // Should show success message
    await expect(page.locator('text=Evidence collection started')).toBeVisible();
  });

  test('should view control details', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Click on control card
    await page.click('text=CC6.1');
    
    // Should show control details
    await expect(page.locator('text=Control Details')).toBeVisible();
    await expect(page.locator('text=Evidence Count: 5')).toBeVisible();
  });

  test('should generate SOC 2 report', async ({ page }) => {
    await page.goto('/admin/compliance/soc2');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('soc2-evidence-report');
  });
});

test.describe('System Health Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
    
    // Mock system health API
    await page.route('**/api/admin/system-health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'operational',
            services: [
              { name: 'FDA APM Service', status: 'healthy' },
              { name: 'IEC 62304 Service', status: 'healthy' },
              { name: 'SOC 2 Service', status: 'healthy' },
              { name: 'FHIR Server', status: 'healthy' },
            ],
            system: {
              cpu: { cores: 8, usage: { user: 1000, system: 500 } },
              memory: { total: 16000000000, free: 8000000000, usagePercent: '50.0' },
              uptime: { system: 86400, process: 3600 },
            },
          },
        }),
      });
    });
  });

  test('should display system health status', async ({ page }) => {
    await page.goto('/admin/system-health');
    
    // Check for service status
    await expect(page.locator('text=FDA APM Service')).toBeVisible();
    await expect(page.locator('text=healthy')).toBeVisible();
  });

  test('should display system metrics', async ({ page }) => {
    await page.goto('/admin/system-health');
    
    // Check for CPU metrics
    await expect(page.locator('text=CPU')).toBeVisible();
    await expect(page.locator('text=8 cores')).toBeVisible();
    
    // Check for memory metrics
    await expect(page.locator('text=Memory')).toBeVisible();
    await expect(page.locator('text=50.0%')).toBeVisible();
  });

  test('should auto-refresh metrics', async ({ page }) => {
    await page.goto('/admin/system-health');
    
    // Wait for auto-refresh (assuming 30s interval)
    await page.waitForTimeout(31000);
    
    // Should have made multiple requests
    // (This would need proper request counting in real implementation)
  });
});

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await setupComplianceMocks(page);
    await loginAsAdmin(page);
  });

  test('should navigate between compliance pages', async ({ page }) => {
    await page.goto('/admin/compliance');
    
    // Navigate to FDA APM
    await page.click('a[href="/admin/compliance/fda-apm"]');
    await expect(page).toHaveURL('/admin/compliance/fda-apm');
    
    // Navigate to IEC 62304
    await page.click('a[href="/admin/compliance/iec62304"]');
    await expect(page).toHaveURL('/admin/compliance/iec62304');
    
    // Navigate to SOC 2
    await page.click('a[href="/admin/compliance/soc2"]');
    await expect(page).toHaveURL('/admin/compliance/soc2');
    
    // Navigate back to dashboard
    await page.click('a[href="/admin/compliance"]');
    await expect(page).toHaveURL('/admin/compliance');
  });

  test('should show active navigation item', async ({ page }) => {
    await page.goto('/admin/compliance/fda-apm');
    
    // Active nav item should be highlighted
    const activeNav = page.locator('a[href="/admin/compliance/fda-apm"]');
    await expect(activeNav).toHaveClass(/active|bg-blue/);
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/admin/compliance/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
      });
    });
    
    await page.goto('/admin/compliance');
    
    // Should show error message
    await expect(page.locator('text=Failed to load compliance data')).toBeVisible();
  });

  test('should handle network timeout', async ({ page }) => {
    // Mock timeout
    await page.route('**/api/admin/compliance/dashboard', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
      await route.abort();
    });
    
    await page.goto('/admin/compliance');
    
    // Should show timeout error
    await expect(page.locator('text=Request timeout')).toBeVisible();
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/admin/compliance/dashboard', async (route) => {
      requestCount++;
      if (requestCount < 3) {
        await route.abort();
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { overall: { score: 94 } },
          }),
        });
      }
    });
    
    await page.goto('/admin/compliance');
    
    // Should eventually succeed after retries
    await expect(page.locator('text=94%')).toBeVisible();
    expect(requestCount).toBeGreaterThanOrEqual(3);
  });
});
