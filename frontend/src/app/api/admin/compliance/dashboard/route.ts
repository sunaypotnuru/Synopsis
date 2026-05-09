import { complianceBase, proxyJson } from "../_shared";

async function fetchSafe(request: Request, path: string): Promise<unknown> {
  const response = await proxyJson(request, complianceBase(path), "GET");
  const json = await response.json();
  if (!response.ok || (json && typeof json === "object" && "success" in json && json.success === false)) {
    throw new Error(
      (json as { error?: string }).error || `Failed to fetch compliance data from ${path}`
    );
  }
  return json;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const [fdaModels, iecCoverage, soc2Stats, fdaAlerts, fdaLatest] = await Promise.all([
      fetchSafe(request, "/api/v1/fda-apm/models"),
      fetchSafe(request, "/api/v1/iec62304/coverage-stats"),
      fetchSafe(request, "/api/v1/soc2/statistics"),
      fetchSafe(request, "/api/v1/fda-apm/alerts"),
      fetchSafe(request, "/api/v1/fda-apm/metrics/diabetic_retinopathy/latest"),
    ]);

    const iec = iecCoverage as Record<string, unknown>;
    const soc2 = soc2Stats as Record<string, unknown>;
    const latest = fdaLatest as Record<string, unknown>;

    const score =
      Number(iec?.full_traceability || 0) * 0.4 +
      Number(soc2?.implementation_rate || 0) * 0.3 +
      (Number(latest?.auc_roc || 0) * 100) * 0.3;

    return Response.json({
      success: true,
      data: {
        overall: { score: Math.round(score * 100) / 100 },
        fda: { models: fdaModels, latest_metrics: latest, alerts: fdaAlerts },
        iec62304: iec,
        soc2: soc2,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const err = error as Error;
    return Response.json(
      { success: false, error: err.message || "Failed to build compliance dashboard" },
      { status: 500 }
    );
  }
}
