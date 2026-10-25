import { apiFetch, jsonBody, serverUnavailable } from "@/lib/bff";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();

  try {
    const response = await apiFetch("/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }, request);

    return Response.json(await jsonBody(response), { status: response.status });
  } catch {
    return serverUnavailable();
  }
}
