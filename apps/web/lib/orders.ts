import { API_URL } from "./api-url";
import { errorMessage } from "./format";
import type { Order, OrderPayment } from "./types";

export type CreateOrderPayload = {
  customer: { name: string; phone: string };
  township_id: number;
  address_line: string;
  landmark: string;
  note?: string;
  payment_method: string;
  items: { variant_id: number; qty: number }[];
};

export type CreateOrderResult =
  | {
      ok: true;
      order: Order;
      trackingPath: string;
    }
  | { ok: false; error: string };

export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey: string,
): Promise<CreateOrderResult> {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error:
          errorMessage(body?.errors) ||
          body?.message ||
          (response.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : "Order failed. Please check your details and try again."),
      };
    }

    return {
      ok: true,
      order: body.data as Order,
      trackingPath: body.tracking.path as string,
    };
  } catch {
    return { ok: false, error: "We could not reach the server. Please try again." };
  }
}

export async function getOrderPayment(
  orderNumber: string,
  token: string,
): Promise<OrderPayment | null> {
  try {
    const response = await fetch(
      `${API_URL}/orders/${encodeURIComponent(orderNumber)}/${encodeURIComponent(token)}/payment`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { data: OrderPayment };

    return body.data;
  } catch {
    return null;
  }
}

export async function uploadPaymentProof(
  orderNumber: string,
  token: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("receipt", file);

  try {
    const response = await fetch(
      `${API_URL}/orders/${encodeURIComponent(orderNumber)}/${encodeURIComponent(token)}/payment-proof`,
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      },
    );

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        error:
          errorMessage(body?.errors) ||
          body?.message ||
          (response.status === 429
            ? "Too many uploads. Please wait a few minutes and try again."
            : "Could not upload the receipt. Please try again."),
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "We could not reach the server. Please try again." };
  }
}
