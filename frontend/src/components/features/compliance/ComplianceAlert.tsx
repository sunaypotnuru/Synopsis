/**
 * ComplianceAlert - FDA APM compliance alert component.
 * Displays an alert card with severity level, messages,
 * and acknowledged/resolved state.
 */

import React from "react";

export type AlertLevel = "critical" | "warning" | "info";

export interface ComplianceAlertData {
  id: number;
  model_name: string;
  alert_level: AlertLevel;
  messages: string[];
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface ComplianceAlertProps {
  alert: ComplianceAlertData;
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
}

const LEVEL_STYLES: Record<AlertLevel, { border: string; bg: string; badgeColor: string; badgeBg: string }> = {
  critical: {
    border: "#EF4444",
    bg: "#FFF5F5",
    badgeColor: "#fff",
    badgeBg: "#EF4444",
  },
  warning: {
    border: "#F59E0B",
    bg: "#FFFBEB",
    badgeColor: "#fff",
    badgeBg: "#F59E0B",
  },
  info: {
    border: "#3B82F6",
    bg: "#EFF6FF",
    badgeColor: "#fff",
    badgeBg: "#3B82F6",
  },
};

export function ComplianceAlert({
  alert,
  onAcknowledge,
  onResolve,
}: ComplianceAlertProps) {
  const style = LEVEL_STYLES[alert.alert_level] ?? LEVEL_STYLES.info;

  return (
    <div
      className="compliance-alert"
      style={{
        border: `1px solid ${style.border}`,
        borderLeft: `4px solid ${style.border}`,
        background: style.bg,
        borderRadius: "6px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span
            style={{
              padding: "0.2rem 0.5rem",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: style.badgeColor,
              background: style.badgeBg,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {alert.alert_level}
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>
            {alert.model_name.replace(/_/g, " ")}
          </span>
        </div>

        <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Messages */}
      <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
        {alert.messages.map((msg, i) => (
          <li key={i} style={{ fontSize: "0.85rem", color: "#374151" }}>
            {msg}
          </li>
        ))}
      </ul>

      {/* Status indicators */}
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", marginTop: "0.25rem" }}>
        {alert.acknowledged && (
          <span style={{ color: "#059669", fontWeight: 600 }}>✓ Acknowledged</span>
        )}
        {alert.resolved && (
          <span style={{ color: "#2563EB", fontWeight: 600 }}>✓ Resolved</span>
        )}
        {!alert.acknowledged && !alert.resolved && (
          <span style={{ color: "#9CA3AF" }}>Pending review</span>
        )}
      </div>

      {/* Action buttons (only when not yet resolved) */}
      {!alert.resolved && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge?.(alert.id)}
              style={{
                padding: "0.3rem 0.7rem",
                border: "1px solid #D1D5DB",
                borderRadius: "4px",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={() => onResolve?.(alert.id)}
            style={{
              padding: "0.3rem 0.7rem",
              border: "none",
              borderRadius: "4px",
              background: "#22C55E",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

export default ComplianceAlert;
