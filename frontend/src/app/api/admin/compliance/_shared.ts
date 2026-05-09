const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getAuthHeader(request: Request): Record<string, string> {
  const authHeader = request.headers.get("authorization");
  return authHeader ? { Authorization: authHeader } : {};
}

export async function proxyJson(
  request: Request,
  upstreamUrl: string,
  method: "GET" | "POST" = "GET"
): Promise<Response> {
  try {
    const response = await fetch(upstreamUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(request),
      },
      body: method === "POST" ? await request.text() : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        {
          success: false,
          error: errorText || `Upstream request failed (${response.status})`,
        },
        { status: response.status }
      );
    }

    const contentType = response.headers?.get?.("content-type") || "";
    const treatAsCsv =
      contentType.includes("text/csv") || upstreamUrl.toLowerCase().includes("export-csv");
    if (treatAsCsv) {
      const blob = await response.blob();
      return new Response(blob, {
        status: response.status,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=traceability-matrix.csv",
        },
      });
    }

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError") {
      return Response.json(
        { success: false, error: "Request timeout" },
        { status: 504 }
      );
    }
    return Response.json(
      { success: false, error: err.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}

export function complianceBase(path: string): string {
  return `${API_BASE_URL}${path}`;
}
