"use client";

import { useState } from "react";

import VariantSelector, { type Variant } from "@/components/VariantSelector";
import SizeChartModal from "@/components/SizeChartModal";

export interface ProductPurchaseProps {
  product: {
    id: number;
    name: string;
    description: string | null;
    base_price: string;
    variants: Variant[];
  };
}

function formatMmk(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} MMK`;
}

export default function ProductPurchase({ product }: ProductPurchaseProps) {
  const [selected, setSelected] = useState<Variant | null>(
    product.variants[0] ?? null,
  );
  const [added, setAdded] = useState(false);

  const price = Number(product.base_price) + Number(selected?.price_delta ?? 0);

  function addToCart() {
    if (!selected) return;
    const raw = window.localStorage.getItem("zaywear.cart");
    const cart = raw ? (JSON.parse(raw) as Array<{ variantId: number; quantity: number }>) : [];
    const existing = cart.find((line) => line.variantId === selected.id);
    if (existing) existing.quantity += 1;
    else cart.push({ variantId: selected.id, quantity: 1 });
    window.localStorage.setItem("zaywear.cart", JSON.stringify(cart));
    setAdded(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal">{product.name}</h1>
        <p className="mt-2 text-xl">{formatMmk(price)}</p>
        {product.description && (
          <p className="mt-4 text-sm leading-relaxed text-taupe">
            {product.description}
          </p>
        )}
      </div>

      <VariantSelector
        variants={product.variants}
        selectedVariantId={selected?.id ?? null}
        onChange={setSelected}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={addToCart}
          disabled={!selected || selected.stock_quantity <= 0}
          className="h-12 rounded bg-soot px-8 text-[12px] font-semibold uppercase tracking-[0.08em] text-canvas transition hover:bg-[#2B2B2B] disabled:opacity-40"
        >
          {added ? "Added" : "Add to cart"}
        </button>
        <SizeChartModal />
      </div>

      {selected && (
        <p className="text-sm text-taupe">
          {selected.stock_quantity > 0
            ? `${selected.stock_quantity} in stock`
            : "Out of stock"}
        </p>
      )}
    </div>
  );
}
