import { NextResponse } from "next/server";
import { apiFetch, jsonBody, serverUnavailable } from "@/lib/bff";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();

  try {
    const response = await apiFetch("/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }, request);
    const body = await jsonBody(response);
    const data = body.data as { token?: string; customer?: unknown } | undefined;

    if (response.ok && data?.token) {
      const result = NextResponse.json({ status: "ok", customer: data.customer });
      result.cookies.set(SESSION_COOKIE, data.token, sessionCookieOptions);

      return result;
    }

    return NextResponse.json(body, { status: response.status });
  } catch {
    return serverUnavailable();
  }
}
