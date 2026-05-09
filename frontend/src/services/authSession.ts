export function getSupabaseAccessToken(): string | null {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    } catch {
      // Ignore malformed entries and continue scanning.
    }
  }
  return null;
}

export function getRequiredApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) {
    throw new Error("VITE_API_URL is not configured");
  }
  return baseUrl;
}
