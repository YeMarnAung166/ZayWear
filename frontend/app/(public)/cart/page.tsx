"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";

interface Variant {
  id: number;
  size: string;
  color: string;
  stock_quantity: number;
  price_delta: string;
}
interface Product {
  id: number;
  name: string;
  base_price: string;
  variants: Variant[];
}
interface Township {
  id: number;
  name: string;
  shipping_fee: string;
}
interface CartLine {
  variantId: number;
  quantity: number;
}

function formatMmk(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} MMK`;
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [townships, setTownships] = useState<Township[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [townshipId, setTownshipId] = useState<number | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("zaywear.cart");
    if (raw) setCart(JSON.parse(raw) as CartLine[]);

    api
      .get<Product[]>("/products")
      .then(setProducts)
      .catch(() => setProducts([]));
    api
      .get<Township[]>("/townships")
      .then(setTownships)
      .catch(() => setTownships([]));
  }, []);

  function persist(next: CartLine[]) {
    setCart(next);
    window.localStorage.setItem("zaywear.cart", JSON.stringify(next));
  }

  const detailed = useMemo(() => {
    return cart
      .map((line) => {
        for (const product of products) {
          const variant = product.variants.find((v) => v.id === line.variantId);
          if (variant) {
            const unit = Number(product.base_price) + Number(variant.price_delta);
            return { line, product, variant, unit };
          }
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cart, products]);

  const subtotal = detailed.reduce((sum, d) => sum + d.unit * d.line.quantity, 0);
  const township = townships.find((t) => t.id === townshipId) ?? null;
  const shipping = township ? Number(township.shipping_fee) : 0;

  if (detailed.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="mb-4 text-xl font-medium">Your cart is empty</h1>
        <Link href="/" className="text-sm underline underline-offset-4">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-normal">Shopping Cart</h1>

      <div className="grid gap-10 md:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-hairline border-y border-hairline">
          {detailed.map(({ line, product, variant, unit }) => (
            <li key={variant.id} className="flex items-center gap-4 py-5">
              <div className="h-20 w-16 rounded bg-raised" />
              <div className="flex-1">
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-taupe">
                  {variant.size} · {variant.color}
                </p>
                <p className="mt-1 text-sm">{formatMmk(unit)}</p>
              </div>
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => {
                  const qty = Math.max(1, Number(e.target.value));
                  persist(
                    cart.map((l) =>
                      l.variantId === variant.id ? { ...l, quantity: qty } : l,
                    ),
                  );
                }}
                className="w-16 rounded border border-hairline bg-raised p-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  persist(cart.filter((l) => l.variantId !== variant.id))
                }
                className="text-xs text-taupe underline underline-offset-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg bg-raised p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em]">
            Order summary
          </h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-taupe">Subtotal</span>
              <span>{formatMmk(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taupe">Shipping</span>
              <span>{township ? formatMmk(shipping) : "Select township"}</span>
            </div>
            <div className="flex justify-between border-t border-hairline pt-2 font-medium">
              <span>Total</span>
              <span>{formatMmk(subtotal + shipping)}</span>
            </div>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Deliver to township
          </label>
          <select
            value={townshipId ?? ""}
            onChange={(e) => setTownshipId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-hairline bg-canvas p-2 text-sm"
          >
            <option value="" disabled>
              Select township
            </option>
            {townships.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {formatMmk(Number(t.shipping_fee))}
              </option>
            ))}
          </select>

          <Link
            href="/checkout"
            className="mt-6 block rounded bg-soot py-3 text-center text-sm uppercase tracking-[0.08em] text-canvas"
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
