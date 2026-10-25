import { API_URL } from "./api-url";

/**
 * The BFF calls Railway from Vercel's servers, so without forwarding the
 * visitor's address every user would share one rate-limit bucket. Laravel
 * already trusts Railway's proxy headers, so X-Forwarded-For is the right
 * channel (and is spoofable exactly as much as a direct call already is).
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || request.headers.get("x-real-ip")?.trim() || null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  request?: Request,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  const ip = request ? clientIp(request) : null;

  if (ip) {
    headers["X-Forwarded-For"] = ip;
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}

export async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function serverUnavailable(): Response {
  return Response.json(
    { message: "We could not reach the server. Please try again." },
    { status: 502 },
  );
}
