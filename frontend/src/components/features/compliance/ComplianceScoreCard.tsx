/**
 * ComplianceScoreCard - Displays a framework compliance score with status.
 * Used in the FDA APM / SOC2 / IEC62304 compliance dashboards.
 */

import React from "react";

export type ComplianceStatus = "excellent" | "good" | "warning" | "critical";

export interface ComplianceScoreCardProps {
  framework: string;
  score: number;
  status: ComplianceStatus;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; color: string; bg: string; ring: string }
> = {
  excellent: {
    label: "Excellent",
    color: "#22C55E",
    bg: "#DCFCE7",
    ring: "#86EFAC",
  },
  good: {
    label: "Good",
    color: "#3B82F6",
    bg: "#DBEAFE",
    ring: "#93C5FD",
  },
  warning: {
    label: "Needs Attention",
    color: "#F59E0B",
    bg: "#FEF3C7",
    ring: "#FCD34D",
  },
  critical: {
    label: "Critical",
    color: "#EF4444",
    bg: "#FEE2E2",
    ring: "#FCA5A5",
  },
};

export function ComplianceScoreCard({
  framework,
  score,
  status,
  onClick,
}: ComplianceScoreCardProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.good;

  return (
    <div
      className={onClick ? "cursor-pointer" : undefined}
      onClick={onClick}
      style={{
        border: `1px solid ${config.ring}`,
        borderRadius: "10px",
        padding: "1.25rem",
        background: config.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "box-shadow 0.15s",
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      {/* Score circle */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          border: `4px solid ${config.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: config.color }}>
          {score}
        </span>
      </div>

      {/* Framework name */}
      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#1F2937" }}>
        {framework}
      </p>

      {/* Status label */}
      <span
        style={{
          padding: "0.2rem 0.6rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: config.color,
          background: "#fff",
          border: `1px solid ${config.ring}`,
          textTransform: "capitalize",
        }}
      >
        {config.label}
      </span>
    </div>
  );
}

export default ComplianceScoreCard;
