/**
 * SOC2ControlCard - SOC 2 Type II control card component.
 * Displays a single control's implementation status, test result,
 * evidence count, and action buttons.
 */

import React from "react";

export type ImplementationStatus =
  | "implemented"
  | "partial"
  | "planned"
  | "not_implemented";
export type TestResult = "passed" | "failed" | "not_tested";

export interface SOC2Control {
  control_id: string;
  control_name: string;
  control_category: string;
  implementation_status: ImplementationStatus;
  test_result: TestResult;
  last_tested: string;
  evidence_count: number;
}

export interface SOC2ControlCardProps {
  control: SOC2Control;
  onViewDetails?: (controlId: string) => void;
  onCollectEvidence?: (controlId: string) => void;
}

const STATUS_STYLES: Record<ImplementationStatus, { color: string; bg: string }> = {
  implemented: { color: "#22C55E", bg: "#DCFCE7" },
  partial: { color: "#F59E0B", bg: "#FEF3C7" },
  planned: { color: "#3B82F6", bg: "#DBEAFE" },
  not_implemented: { color: "#EF4444", bg: "#FEE2E2" },
};

const TEST_STYLES: Record<TestResult, { color: string }> = {
  passed: { color: "#22C55E" },
  failed: { color: "#EF4444" },
  not_tested: { color: "#6B7280" },
};

export function SOC2ControlCard({
  control,
  onViewDetails,
  onCollectEvidence,
}: SOC2ControlCardProps) {
  const statusStyle = STATUS_STYLES[control.implementation_status] ?? {
    color: "#6B7280",
    bg: "#F3F4F6",
  };
  const testStyle = TEST_STYLES[control.test_result] ?? { color: "#6B7280" };

  return (
    <div
      className="soc2-control-card"
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: "1rem",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "#374151",
            }}
          >
            {control.control_id}
          </span>
          <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>
            {control.control_name}
          </p>
          <p style={{ margin: "0.125rem 0 0", fontSize: "0.8rem", color: "#6B7280" }}>
            {control.control_category}
          </p>
        </div>

        {/* Implementation status badge */}
        <span
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: statusStyle.color,
            background: statusStyle.bg,
            textTransform: "capitalize",
          }}
        >
          {control.implementation_status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
        <div>
          <span style={{ color: "#6B7280" }}>Test result: </span>
          <span style={{ fontWeight: 600, color: testStyle.color, textTransform: "capitalize" }}>
            {control.test_result.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <span style={{ color: "#6B7280" }}>Evidence: </span>
          <span style={{ fontWeight: 700 }}>{control.evidence_count}</span>
        </div>
        <div>
          <span style={{ color: "#6B7280" }}>Last tested: </span>
          <span>{new Date(control.last_tested).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => onViewDetails?.(control.control_id)}
          aria-label="View details"
          style={{
            padding: "0.35rem 0.75rem",
            border: "1px solid #D1D5DB",
            borderRadius: "4px",
            background: "#fff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          View Details
        </button>
        <button
          onClick={() => onCollectEvidence?.(control.control_id)}
          aria-label="Collect evidence"
          style={{
            padding: "0.35rem 0.75rem",
            border: "none",
            borderRadius: "4px",
            background: "#3B82F6",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          Collect Evidence
        </button>
      </div>
    </div>
  );
}

export default SOC2ControlCard;
