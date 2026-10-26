import { headers } from "next/headers";
import { API_URL } from "@/lib/api-url";

/**
 * The admin token stays on the Next.js server. Every admin page and action goes
 * through this module so it can never leak into a client bundle.
 */
export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminVisitorIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || list.get("x-real-ip")?.trim() || null;
}

type LaravelError = {
  message?: string;
  errors?: Record<string, string[]>;
};

function errorMessage(body: LaravelError | null, status: number): string {
  const firstFieldError = body?.errors
    ? Object.values(body.errors).find((messages) => messages.length > 0)?.[0]
    : null;

  return firstFieldError ?? body?.message ?? `The request failed (${status}).`;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = process.env.ADMIN_TOKEN;

  if (!token) {
    throw new AdminApiError("ADMIN_TOKEN is not configured on the server.", 500);
  }

  const ip = await adminVisitorIp();
  const hasBody = init.body !== undefined && init.body !== null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(ip ? { "X-Forwarded-For": ip } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as LaravelError | null;

  if (!response.ok) {
    throw new AdminApiError(errorMessage(body, response.status), response.status);
  }

  return body as T;
}
