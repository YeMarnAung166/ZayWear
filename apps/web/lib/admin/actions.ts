"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api-url";
import { AdminApiError, adminFetch, adminVisitorIp } from "./api";
import {
  adminSessionConfigured,
  createAdminSession,
  destroyAdminSession,
  requireAdminSession,
} from "./session";

const loginError = (code: string): never => {
  redirect(`/admin/login?error=${code}`);
};

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return loginError("missing");
  }

  if (!adminSessionConfigured()) {
    return loginError("config");
  }

  const ip = await adminVisitorIp();
  const response = await fetch(`${API_URL}/admin/session`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(ip ? { "X-Forwarded-For": ip } : {}),
    },
    body: JSON.stringify({ password }),
  }).catch(() => null);

  if (!response) {
    return loginError("unreachable");
  }

  if (response.status === 429) {
    return loginError("rate");
  }

  if (!response.ok) {
    return loginError("invalid");
  }

  await createAdminSession();
  redirect("/admin/orders");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

function orderPath(id: number, key: string, value: string): string {
  return `/admin/orders/${id}?${key}=${encodeURIComponent(value)}`;
}

export async function updateStatusAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = Number(formData.get("order_id"));
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const refusalReason = String(formData.get("refusal_reason") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0 || !status) {
    redirect("/admin/orders?error=Invalid%20order%20action.");
  }

  try {
    await adminFetch(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ...(reason ? { reason } : {}),
        ...(refusalReason ? { refusal_reason: refusalReason } : {}),
      }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not update the order. Please try again.";

    redirect(orderPath(id, "error", message));
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/metrics");
  redirect(orderPath(id, "updated", status));
}

export async function saveShipmentAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = Number(formData.get("order_id"));
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("tracking_number") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/orders?error=Invalid%20order.");
  }

  if (!carrier) {
    redirect(orderPath(id, "error", "Carrier is required."));
  }

  try {
    await adminFetch(`/admin/orders/${id}/shipment`, {
      method: "POST",
      body: JSON.stringify({
        carrier,
        tracking_number: trackingNumber || null,
      }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not save the shipment. Please try again.";

    redirect(orderPath(id, "error", message));
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  redirect(orderPath(id, "updated", "shipment"));
}
