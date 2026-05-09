import { complianceBase, proxyJson } from "../_shared";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "/statistics";
  return proxyJson(request, complianceBase(`/api/v1/soc2${endpoint}`), "GET");
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "/collect-evidence";
  return proxyJson(request, complianceBase(`/api/v1/soc2${endpoint}`), "POST");
}
