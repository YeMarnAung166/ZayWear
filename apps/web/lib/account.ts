import { headers } from "next/headers";
import { API_URL } from "./api-url";
import { getSessionToken } from "./session";
import type { CustomerAccount, Order, Paginated, Product } from "./types";

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

export type OrderHistory = {
  orders: Order[];
  page: number;
  lastPage: number;
  total: number;
};

/**
 * The API paginates at 10; the account page links between pages rather than
 * dropping everything past the first one.
 */
export async function getAccountOrders(page = 1): Promise<OrderHistory> {
  const body = await accountGet<Paginated<Order>>(`/me/orders?page=${page}`);

  return {
    orders: body?.data ?? [],
    page: body?.meta?.current_page ?? page,
    lastPage: body?.meta?.last_page ?? 1,
    total: body?.meta?.total ?? body?.data?.length ?? 0,
  };
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

/**
 * Returns `null` when the API could not be reached, so the wishlist page can
 * distinguish an outage from a genuinely empty list.
 */
export async function getWishlist(): Promise<Product[] | null> {
  const body = await accountGet<{ data: Product[] }>("/me/wishlist");

  return body ? (body.data ?? []) : null;
}
