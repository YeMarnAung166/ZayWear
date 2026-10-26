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

export async function markPaymentPaidAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = Number(formData.get("order_id"));
  const reference = String(formData.get("reference") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const proofId = Number(formData.get("proof_id") ?? 0);

  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/orders?error=Invalid%20order.");
  }

  try {
    await adminFetch(`/admin/orders/${id}/payment/verify`, {
      method: "POST",
      body: JSON.stringify({
        ...(reference ? { reference } : {}),
        ...(note ? { note } : {}),
        ...(Number.isInteger(proofId) && proofId > 0 ? { proof_id: proofId } : {}),
      }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not verify the payment. Please try again.";

    redirect(orderPath(id, "error", message));
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/metrics");
  redirect(orderPath(id, "updated", "paid"));
}

export async function rejectPaymentProofAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = Number(formData.get("order_id"));
  const proofId = Number(formData.get("proof_id"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/orders?error=Invalid%20order.");
  }

  if (!Number.isInteger(proofId) || proofId <= 0) {
    redirect(orderPath(id, "error", "Invalid receipt."));
  }

  if (!reason) {
    redirect(orderPath(id, "error", "Tell the customer why the receipt was rejected."));
  }

  try {
    await adminFetch(`/admin/orders/${id}/payment/reject`, {
      method: "POST",
      body: JSON.stringify({ proof_id: proofId, reason }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not reject the receipt. Please try again.";

    redirect(orderPath(id, "error", message));
  }

  revalidatePath(`/admin/orders/${id}`);
  redirect(orderPath(id, "updated", "proof-rejected"));
}

export async function savePaymentSettingsAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const flag = (key: string) => formData.get(key) === "on";

  try {
    await adminFetch("/admin/settings/payments", {
      method: "PUT",
      body: JSON.stringify({
        cod_enabled: flag("cod_enabled"),
        kbzpay_enabled: flag("kbzpay_enabled"),
        wave_enabled: flag("wave_enabled"),
        kbzpay_account_name: text("kbzpay_account_name"),
        kbzpay_phone: text("kbzpay_phone"),
        wave_account_name: text("wave_account_name"),
        wave_phone: text("wave_phone"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not save the payment settings. Please try again.";

    redirect(`/admin/settings?tab=payments&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings?tab=payments&updated=1");
}

export async function saveStoreSettingsAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const integer = (key: string) => Number.parseInt(text(key), 10);

  try {
    await adminFetch("/admin/settings/store", {
      method: "PUT",
      body: JSON.stringify({
        free_delivery_threshold_mmk: integer("free_delivery_threshold_mmk"),
        return_window_days: integer("return_window_days"),
        support_telegram: text("support_telegram"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof AdminApiError
        ? error.message
        : "Could not save the store settings. Please try again.";

    redirect(`/admin/settings?tab=store&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/settings?tab=store&updated=1");
}
