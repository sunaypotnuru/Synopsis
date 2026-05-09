/**
 * FDAApmChart - FDA Algorithm Performance Monitoring chart component.
 * Renders a line chart of ML model performance metrics over time.
 */

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

export interface FDAApmDataPoint {
  timestamp: string;
  sensitivity?: number;
  specificity?: number;
  auc_roc?: number;
  ppv?: number;
  npv?: number;
  [key: string]: string | number | undefined;
}

export interface FDAApmThresholds {
  target: number;
  alert: number;
  action: number;
  emergency: number;
}

export interface FDAApmChartProps {
  data: FDAApmDataPoint[];
  metrics: string[];
  title: string;
  thresholds?: FDAApmThresholds;
  onExport?: () => void;
}

const METRIC_COLORS: Record<string, string> = {
  sensitivity: "#22C55E",
  specificity: "#3B82F6",
  auc_roc: "#A855F7",
  ppv: "#F59E0B",
  npv: "#EC4899",
};

export function FDAApmChart({
  data,
  metrics,
  title,
  thresholds,
  onExport,
}: FDAApmChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(metrics);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fda-apm-${title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formattedData = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString(),
  }));

  return (
    <div className="fda-apm-chart" style={{ padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button
          onClick={handleExport}
          aria-label="Export chart data"
          style={{
            padding: "0.4rem 0.8rem",
            background: "#3B82F6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export
        </button>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        {metrics.map((m) => (
          <label key={m} style={{ marginRight: "1rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedMetrics.includes(m)}
              onChange={() =>
                setSelectedMetrics((prev) =>
                  prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
                )
              }
              style={{ marginRight: "0.25rem" }}
            />
            {m}
          </label>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          {thresholds && (
            <>
              <ReferenceLine y={thresholds.target} stroke="#22C55E" strokeDasharray="4 4" label="Target" />
              <ReferenceLine y={thresholds.alert} stroke="#F59E0B" strokeDasharray="4 4" label="Alert" />
              <ReferenceLine y={thresholds.action} stroke="#EF4444" strokeDasharray="4 4" label="Action" />
              <ReferenceLine y={thresholds.emergency} stroke="#7C3AED" strokeDasharray="4 4" label="Emergency" />
            </>
          )}
          {selectedMetrics.map((m) => (
            <Line
              key={m}
              type="monotone"
              dataKey={m}
              stroke={METRIC_COLORS[m] ?? "#6B7280"}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default FDAApmChart;
