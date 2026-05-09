import { complianceBase, proxyJson } from "../_shared";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "/metrics/diabetic_retinopathy/latest";
  return proxyJson(request, complianceBase(`/api/v1/fda-apm${endpoint}`), "GET");
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "/alerts/acknowledge";
  return proxyJson(request, complianceBase(`/api/v1/fda-apm${endpoint}`), "POST");
}
