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

export type CartLine = {
  variantId: number;
  productId: number;
  productSlug: string;
  name_mm: string;
  name_en: string;
  size: string;
  color: string;
  unitPrice: number;
  qty: number;
  image: string;
  maxQty: number;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addLine: (line: CartLine) => void;
  updateQty: (variantId: number, qty: number) => void;
  removeLine: (variantId: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "zw_cart";
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Reading persisted cart state after mount keeps SSR and client markup in sync.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines(JSON.parse(raw) as CartLine[]);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  const addLine = useCallback((line: CartLine) => {
    setLines((current) => {
      const existing = current.find((item) => item.variantId === line.variantId);

      if (existing) {
        return current.map((item) =>
          item.variantId === line.variantId
            ? {
                ...item,
                qty: Math.min(item.qty + line.qty, item.maxQty),
              }
            : item,
        );
      }

      return [...current, line];
    });
  }, []);

  const updateQty = useCallback((variantId: number, qty: number) => {
    setLines((current) =>
      current
        .map((item) =>
          item.variantId === variantId
            ? { ...item, qty: Math.max(1, Math.min(qty, item.maxQty)) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  }, []);

  const removeLine = useCallback((variantId: number) => {
    setLines((current) => current.filter((item) => item.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((total, line) => total + line.qty, 0);
    const subtotal = lines.reduce(
      (total, line) => total + line.unitPrice * line.qty,
      0,
    );

    return {
      lines,
      count,
      subtotal,
      hydrated,
      addLine,
      updateQty,
      removeLine,
      clear,
    };
  }, [lines, hydrated, addLine, updateQty, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
