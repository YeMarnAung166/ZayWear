"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WishlistStatus = "loading" | "guest" | "ready";

export type WishlistResult = {
  ok: boolean;
  unauthorized?: boolean;
};

type WishlistValue = {
  status: WishlistStatus;
  count: number;
  isSaved: (productId: number) => boolean;
  toggle: (productId: number) => Promise<WishlistResult>;
  remove: (productId: number) => Promise<WishlistResult>;
  refresh: () => Promise<void>;
  clear: () => void;
};

const WishlistContext = createContext<WishlistValue | null>(null);

/**
 * Saved products are server-side, so the storefront only needs the ids to fill
 * the hearts. The full product payload is fetched by the wishlist page itself.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<WishlistStatus>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await fetch("/api/me/wishlist/ids", { cache: "no-store" });

      if (response.status === 401) {
        setIds(new Set());
        setStatus("guest");
        return;
      }

      if (!response.ok) {
        setIds(new Set());
        setStatus("ready");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { data?: number[] }
        | null;

      setIds(new Set(Array.isArray(body?.data) ? body.data : []));
      setStatus("ready");
    } catch {
      // A failed hydration must not bounce a signed-in customer to login.
      setIds(new Set());
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    // Hydrating saved ids after mount keeps static product pages cacheable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    setIds(new Set());
    setStatus("guest");
  }, []);

  const toggle = useCallback(
    async (productId: number): Promise<WishlistResult> => {
      const saved = ids.has(productId);
      const previous = ids;
      const next = new Set(ids);

      if (saved) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      setIds(next);
      setStatus("ready");

      try {
        const response = await fetch(
          saved ? `/api/me/wishlist/${productId}` : "/api/me/wishlist",
          saved
            ? { method: "DELETE" }
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId }),
              },
        );

        if (response.status === 401) {
          setIds(previous);
          setStatus("guest");
          return { ok: false, unauthorized: true };
        }

        if (!response.ok) {
          setIds(previous);
          return { ok: false };
        }

        return { ok: true };
      } catch {
        setIds(previous);
        return { ok: false };
      }
    },
    [ids],
  );

  const remove = useCallback(
    async (productId: number): Promise<WishlistResult> => {
      const previous = ids;
      const next = new Set(ids);
      next.delete(productId);
      setIds(next);

      try {
        const response = await fetch(`/api/me/wishlist/${productId}`, {
          method: "DELETE",
        });

        if (response.status === 401) {
          setIds(previous);
          setStatus("guest");
          return { ok: false, unauthorized: true };
        }

        if (!response.ok) {
          setIds(previous);
          return { ok: false };
        }

        return { ok: true };
      } catch {
        setIds(previous);
        return { ok: false };
      }
    },
    [ids],
  );

  const isSaved = useCallback((productId: number) => ids.has(productId), [ids]);

  const value = useMemo<WishlistValue>(
    () => ({
      status,
      count: ids.size,
      isSaved,
      toggle,
      remove,
      refresh,
      clear,
    }),
    [status, ids.size, isSaved, toggle, remove, refresh, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}
