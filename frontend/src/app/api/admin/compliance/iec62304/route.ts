import { complianceBase, proxyJson } from "../_shared";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "/coverage-stats";
  return proxyJson(request, complianceBase(`/api/v1/iec62304${endpoint}`), "GET");
}
