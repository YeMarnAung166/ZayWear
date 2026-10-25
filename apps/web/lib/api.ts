import { API_URL } from "./api-url";
import { mockCategories, mockConfig, mockProducts, mockTownships } from "./mock-data";
import type {
  Category,
  Product,
  ShopConfig,
  SizeChart,
  Township,
  TrackingOrder,
} from "./types";

/**
 * Mock data is only a local-development convenience. Production builds must
 * leave NEXT_PUBLIC_USE_MOCK unset: otherwise an API outage would quietly
 * serve placeholder products whose variant ids cannot be ordered.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      // Catalogue data changes rarely and the API already caches for 120s.
      // Revalidating the pages keeps them static (edge-cached) instead of
      // hitting Railway + Postgres on every request.
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getConfig(): Promise<ShopConfig> {
  return (await get<ShopConfig>("/config")) ?? mockConfig;
}

export async function getCategories(): Promise<Category[]> {
  const result = await get<{ data: Category[] }>("/categories");
  return result?.data ?? (USE_MOCK ? mockCategories : []);
}

export async function getTownships(): Promise<Township[]> {
  const result = await get<{ data: Township[] }>("/townships");
  return result?.data ?? (USE_MOCK ? mockTownships : []);
}

export async function getProducts(query: {
  category?: string;
  featured?: boolean;
  q?: string;
  sort?: string;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.featured) params.set("featured", "1");
  if (query.q) params.set("q", query.q);
  if (query.sort) params.set("sort", query.sort);

  const result = await get<{ data: Product[] }>(`/products?${params.toString()}`);

  if (result) {
    return result.data;
  }

  if (!USE_MOCK) {
    return [];
  }

  return mockProducts
    .filter((product) => !query.category || product.category?.slug === query.category)
    .filter((product) => !query.featured || product.is_featured)
    .filter((product) =>
      query.q
        ? (product.name_en + product.name_mm)
            .toLowerCase()
            .includes(query.q.toLowerCase())
        : true,
    )
    .sort((a, b) =>
      query.sort === "price_asc"
        ? a.price_mmk - b.price_mmk
        : query.sort === "price_desc"
          ? b.price_mmk - a.price_mmk
          : b.id - a.id,
    );
}

export async function getProduct(slug: string): Promise<Product | null> {
  const result = await get<{ data: Product }>(`/products/${slug}`);

  if (result) {
    return result.data;
  }

  if (!USE_MOCK) {
    return null;
  }

  return mockProducts.find((product) => product.slug === slug) ?? null;
}

export async function getSizeChart(slug: string): Promise<SizeChart | null> {
  return await get<SizeChart>(`/products/${slug}/size-chart`);
}

export async function getOrder(
  orderNumber: string,
  token: string,
): Promise<{ data: TrackingOrder } | { error: string }> {
  try {
    const response = await fetch(
      `${API_URL}/orders/${encodeURIComponent(orderNumber)}/${encodeURIComponent(token)}`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );

    if (response.status === 403 || response.status === 404) {
      return { error: "This tracking link is invalid or has expired." };
    }

    if (!response.ok) {
      return { error: "We could not load this order right now." };
    }

    return (await response.json()) as { data: TrackingOrder };
  } catch {
    return { error: "We could not reach the server. Please try again." };
  }
}
