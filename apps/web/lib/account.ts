import { headers } from "next/headers";
import { API_URL } from "./api-url";
import { getSessionToken } from "./session";
import type { CustomerAccount, Order } from "./types";

async function visitorIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || list.get("x-real-ip")?.trim() || null;
}

async function accountGet<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  try {
    const ip = await visitorIp();
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getAccount(): Promise<CustomerAccount | null> {
  const body = await accountGet<{ data: CustomerAccount }>("/me");

  return body?.data ?? null;
}

export async function getAccountOrders(): Promise<Order[]> {
  const body = await accountGet<{ data: Order[] }>("/me/orders");

  return body?.data ?? [];
}

export async function getAccountOrder(
  orderNumber: string,
): Promise<{ order: Order; trackingPath: string } | null> {
  const body = await accountGet<{ data: Order; tracking: { path: string } }>(
    `/me/orders/${encodeURIComponent(orderNumber)}`,
  );

  if (!body) {
    return null;
  }

  return { order: body.data, trackingPath: body.tracking.path };
}
