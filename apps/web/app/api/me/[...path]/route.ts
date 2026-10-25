import { NextResponse } from "next/server";
import { apiFetch, serverUnavailable } from "@/lib/bff";
import { getSessionToken } from "@/lib/session";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context): Promise<Response> {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { path } = await context.params;
  const search = new URL(request.url).search;
  const target = `/me/${path.map(encodeURIComponent).join("/")}${search}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let body: string | undefined;

  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();

    if (body !== "") {
      headers["Content-Type"] = "application/json";
    }
  }

  try {
    const response = await apiFetch(target, { method: request.method, headers, body }, request);
    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return serverUnavailable();
  }
}

export function GET(request: Request, context: Context): Promise<Response> {
  return proxy(request, context);
}

export function POST(request: Request, context: Context): Promise<Response> {
  return proxy(request, context);
}

export function PATCH(request: Request, context: Context): Promise<Response> {
  return proxy(request, context);
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return proxy(request, context);
}
