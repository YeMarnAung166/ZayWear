import { apiFetch, jsonBody, serverUnavailable } from "@/lib/bff";

export async function POST(request: Request): Promise<Response> {
  try {
    const response = await apiFetch("/auth/telegram/start", { method: "POST" }, request);

    return Response.json(await jsonBody(response), { status: response.status });
  } catch {
    return serverUnavailable();
  }
}
