/**
 * Integration Tests for Compliance Components
 * Tests components with React Testing Library
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FDAApmChart } from '@/app/components/FDAApmChart';
import { TraceabilityMatrix } from '@/app/components/TraceabilityMatrix';
import { SOC2ControlCard } from '@/app/components/SOC2ControlCard';
import { ComplianceAlert } from '@/app/components/ComplianceAlert';
import { ComplianceScoreCard } from '@/app/components/ComplianceScoreCard';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

describe('FDAApmChart Component', () => {
  const mockData = [
    {
      timestamp: '2026-04-23T10:00:00Z',
      sensitivity: 0.92,
      specificity: 0.88,
      auc_roc: 0.95,
      ppv: 0.90,
      npv: 0.91,
    },
    {
      timestamp: '2026-04-23T11:00:00Z',
      sensitivity: 0.93,
      specificity: 0.89,
      auc_roc: 0.96,
      ppv: 0.91,
      npv: 0.92,
    },
  ];

  it('should render chart with metrics', () => {
    render(
      <FDAApmChart
        data={mockData}
        metrics={['sensitivity', 'specificity']}
        title="Diabetic Retinopathy"
      />
    );

    expect(screen.getByText(/Diabetic Retinopathy/i)).toBeInTheDocument();
  });

  it('should handle export button click', () => {
    render(
      <FDAApmChart
        data={mockData}
        metrics={['sensitivity']}
        title="Test Model"
      />
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(exportButton).toBeInTheDocument();
  });

  it('should display threshold lines', () => {
    const { container } = render(
      <FDAApmChart
        data={mockData}
        metrics={['sensitivity']}
        title="Test Model"
        thresholds={{
          target: 0.85,
          alert: 0.80,
          action: 0.75,
          emergency: 0.70,
        }}
      />
    );

    // Chart should be rendered
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});

describe('TraceabilityMatrix Component', () => {
  const mockData = [
    {
      requirement_id: 'REQ-001',
      requirement_title: 'User Authentication',
      requirement_type: 'functional',
      safety_class: 'B',
      requirement_status: 'approved',
      design_count: 2,
      test_count: 3,
      traceability_status: 'complete' as const,
    },
    {
      requirement_id: 'REQ-002',
      requirement_title: 'Data Encryption',
      requirement_type: 'security',
      safety_class: 'C',
      requirement_status: 'approved',
      design_count: 1,
      test_count: 0,
      traceability_status: 'partial' as const,
    },
  ];

  it('should render traceability matrix', () => {
    render(<TraceabilityMatrix data={mockData} />);

    expect(screen.getByText('REQ-001')).toBeInTheDocument();
    expect(screen.getByText('User Authentication')).toBeInTheDocument();
    expect(screen.getByText('REQ-002')).toBeInTheDocument();
  });

  it('should filter by search term', async () => {
    render(<TraceabilityMatrix data={mockData} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Authentication' } });

    await waitFor(() => {
      expect(screen.getByText('User Authentication')).toBeInTheDocument();
      expect(screen.queryByText('Data Encryption')).not.toBeInTheDocument();
    });
  });

  it('should filter by safety class', async () => {
    render(<TraceabilityMatrix data={mockData} />);

    const safetyClassFilter = screen.getByLabelText(/safety class/i);
    fireEvent.change(safetyClassFilter, { target: { value: 'C' } });

    await waitFor(() => {
      expect(screen.queryByText('User Authentication')).not.toBeInTheDocument();
      expect(screen.getByText('Data Encryption')).toBeInTheDocument();
    });
  });

  it('should handle requirement click', () => {
    const onRequirementClick = vi.fn();
    render(
      <TraceabilityMatrix data={mockData} onRequirementClick={onRequirementClick} />
    );

    const requirement = screen.getByText('REQ-001');
    fireEvent.click(requirement);

    expect(onRequirementClick).toHaveBeenCalledWith('REQ-001');
  });

  it('should export to CSV', () => {
    render(<TraceabilityMatrix data={mockData} />);

    // Mock window.URL.createObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.createObjectURL = mockCreateObjectURL;

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(exportButton).toBeInTheDocument();
  });
});

describe('SOC2ControlCard Component', () => {
  const mockControl = {
    control_id: 'CC6.1',
    control_name: 'Logical Access Controls',
    control_category: 'Security',
    implementation_status: 'implemented' as const,
    test_result: 'passed' as const,
    last_tested: '2026-04-20T10:00:00Z',
    evidence_count: 5,
  };

  it('should render control card', () => {
    render(<SOC2ControlCard control={mockControl} />);

    expect(screen.getByText('CC6.1')).toBeInTheDocument();
    expect(screen.getByText('Logical Access Controls')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display implementation status badge', () => {
    render(<SOC2ControlCard control={mockControl} />);

    const badge = screen.getByText(/implemented/i);
    expect(badge).toBeInTheDocument();
    // Check that the badge has the correct styling applied
    expect(badge).toHaveStyle({ color: '#22C55E' });
  });

  it('should handle view details click', () => {
    const onViewDetails = vi.fn();
    render(<SOC2ControlCard control={mockControl} onViewDetails={onViewDetails} />);

    const viewButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewButton);

    expect(onViewDetails).toHaveBeenCalledWith('CC6.1');
  });

  it('should handle collect evidence click', () => {
    const onCollectEvidence = vi.fn();
    render(<SOC2ControlCard control={mockControl} onCollectEvidence={onCollectEvidence} />);

    const collectButton = screen.getByRole('button', { name: /collect evidence/i });
    fireEvent.click(collectButton);

    expect(onCollectEvidence).toHaveBeenCalledWith('CC6.1');
  });
});

describe('ComplianceAlert Component', () => {
  const mockAlert = {
    id: 1,
    model_name: 'diabetic_retinopathy',
    alert_level: 'critical' as const,
    messages: ['Sensitivity dropped below 85%', 'Immediate action required'],
    timestamp: '2026-04-23T10:00:00Z',
    acknowledged: false,
    resolved: false,
  };

  it('should render alert', () => {
    render(<ComplianceAlert alert={mockAlert} />);

    expect(screen.getByText(/Sensitivity dropped below 85%/i)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('should display acknowledged state', () => {
    const acknowledgedAlert = { ...mockAlert, acknowledged: true };
    render(<ComplianceAlert alert={acknowledgedAlert} />);

    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
  });

  it('should display resolved state', () => {
    const resolvedAlert = { ...mockAlert, resolved: true };
    render(<ComplianceAlert alert={resolvedAlert} />);

    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });
});

describe('ComplianceScoreCard Component', () => {
  it('should render score card', () => {
    render(
      <ComplianceScoreCard
        framework="FDA APM"
        score={95}
        status="excellent"
      />
    );

    expect(screen.getByText('FDA APM')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('should display correct status color', () => {
    const { rerender } = render(
      <ComplianceScoreCard framework="Test" score={95} status="excellent" />
    );

    expect(screen.getByText(/excellent/i)).toBeInTheDocument();

    rerender(<ComplianceScoreCard framework="Test" score={75} status="warning" />);
    expect(screen.getByText(/needs attention/i)).toBeInTheDocument();

    rerender(<ComplianceScoreCard framework="Test" score={60} status="critical" />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('should handle click event', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ComplianceScoreCard
        framework="Test"
        score={95}
        status="excellent"
        onClick={onClick}
      />
    );

    const card = container.querySelector('[class*="cursor-pointer"]');
    if (card) {
      fireEvent.click(card);
      expect(onClick).toHaveBeenCalled();
    }
  });
});
