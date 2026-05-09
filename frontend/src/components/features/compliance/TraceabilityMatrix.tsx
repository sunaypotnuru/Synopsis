/**
 * TraceabilityMatrix - IEC 62304 requirements traceability matrix component.
 * Displays a filterable, searchable table of software requirements with
 * design and test trace counts.
 */

import React, { useState, useMemo } from "react";

export type TraceabilityStatus = "complete" | "partial" | "missing";

export interface TraceabilityRow {
  requirement_id: string;
  requirement_title: string;
  requirement_type: string;
  safety_class: string;
  requirement_status: string;
  design_count: number;
  test_count: number;
  traceability_status: TraceabilityStatus;
}

export interface TraceabilityMatrixProps {
  data: TraceabilityRow[];
  onRequirementClick?: (requirementId: string) => void;
  onExport?: () => void;
}

const STATUS_COLOR: Record<TraceabilityStatus, string> = {
  complete: "#22C55E",
  partial: "#F59E0B",
  missing: "#EF4444",
};

export function TraceabilityMatrix({
  data,
  onRequirementClick,
  onExport,
}: TraceabilityMatrixProps) {
  const [search, setSearch] = useState("");
  const [safetyClass, setSafetyClass] = useState("");

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch =
        !search ||
        row.requirement_id.toLowerCase().includes(search.toLowerCase()) ||
        row.requirement_title.toLowerCase().includes(search.toLowerCase()) ||
        row.requirement_type.toLowerCase().includes(search.toLowerCase());
      const matchesSafetyClass =
        !safetyClass || row.safety_class === safetyClass;
      return matchesSearch && matchesSafetyClass;
    });
  }, [data, search, safetyClass]);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const headers = [
      "ID",
      "Title",
      "Type",
      "Safety Class",
      "Status",
      "Design Count",
      "Test Count",
      "Traceability",
    ];
    const rows = data.map((r) =>
      [
        r.requirement_id,
        r.requirement_title,
        r.requirement_type,
        r.safety_class,
        r.requirement_status,
        r.design_count,
        r.test_count,
        r.traceability_status,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "traceability-matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const safetyClasses = Array.from(new Set(data.map((r) => r.safety_class))).sort();

  return (
    <div className="traceability-matrix" style={{ padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search requirements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.4rem 0.8rem",
            border: "1px solid #D1D5DB",
            borderRadius: "4px",
            flex: 1,
            minWidth: "180px",
          }}
        />
        <label
          htmlFor="safety-class-filter"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          Safety Class:
          <select
            id="safety-class-filter"
            aria-label="safety class"
            value={safetyClass}
            onChange={(e) => setSafetyClass(e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
            }}
          >
            <option value="">All</option>
            {safetyClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleExport}
          aria-label="Export traceability matrix"
          style={{
            padding: "0.4rem 0.8rem",
            background: "#3B82F6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "#F3F4F6" }}>
            <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #E5E7EB" }}>ID</th>
            <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #E5E7EB" }}>Title</th>
            <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #E5E7EB" }}>Type</th>
            <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #E5E7EB" }}>Safety Class</th>
            <th style={{ padding: "0.5rem", textAlign: "center", border: "1px solid #E5E7EB" }}>Design</th>
            <th style={{ padding: "0.5rem", textAlign: "center", border: "1px solid #E5E7EB" }}>Tests</th>
            <th style={{ padding: "0.5rem", textAlign: "left", border: "1px solid #E5E7EB" }}>Traceability</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.requirement_id} style={{ borderBottom: "1px solid #E5E7EB" }}>
              <td
                style={{
                  padding: "0.5rem",
                  border: "1px solid #E5E7EB",
                  cursor: onRequirementClick ? "pointer" : "default",
                  color: onRequirementClick ? "#2563EB" : "inherit",
                  fontWeight: 600,
                }}
                onClick={() => onRequirementClick?.(row.requirement_id)}
              >
                {row.requirement_id}
              </td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB" }}>{row.requirement_title}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB" }}>{row.requirement_type}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB" }}>{row.safety_class}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB", textAlign: "center" }}>{row.design_count}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB", textAlign: "center" }}>{row.test_count}</td>
              <td style={{ padding: "0.5rem", border: "1px solid #E5E7EB" }}>
                <span
                  style={{
                    color: STATUS_COLOR[row.traceability_status] ?? "#6B7280",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {row.traceability_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#6B7280", marginTop: "1rem" }}>
          No requirements match the current filters.
        </p>
      )}
    </div>
  );
}

export default TraceabilityMatrix;
