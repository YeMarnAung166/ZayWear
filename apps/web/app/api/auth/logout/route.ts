import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/bff";
import { SESSION_COOKIE, getSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request): Promise<Response> {
  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch(
        "/auth/logout",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
        request,
      );
    } catch {
      // The cookie is cleared regardless so the browser never keeps a dead session.
    }
  }

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });

  return response;
}
