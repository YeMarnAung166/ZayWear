"use client";

import { useState } from "react";
import Link from "next/link";

import VariantSelector, { type Variant } from "@/components/VariantSelector";
import SizeChartModal from "@/components/SizeChartModal";
import { addToCart, type CartSnapshot } from "@/lib/cart";

export interface ProductPurchaseProps {
  product: {
    id: number;
    name: string;
    description: string | null;
    base_price: string;
    image_url: string | null;
    variants: Variant[];
  };
}

function formatMmk(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} MMK`;
}

const PERKS = [
  {
    icon: "pin_drop",
    title: "Nationwide Doorstep Delivery:",
    body: "Available across all 330 townships in Myanmar with Cash on Delivery option.",
  },
  {
    icon: "bolt",
    title: "Yangon & Mandalay:",
    body: "Next-day courier delivery available for orders placed before 3:00 PM.",
  },
  {
    icon: "sync",
    title: "Complimentary Exchange:",
    body: "7-day doorstep size replacement policy nationwide.",
  },
];

const ACCORDIONS = [
  {
    title: "Fabric & Sustainable Care",
    lines: [
      "100% certified organic fibre, pre-washed for immediate softness.",
      "Hand wash cool or gentle machine cycle inside a protective mesh pouch.",
      "Dry in shaded breeze; embrace the organic wrinkle or steam while damp.",
      "Naturally breathable, hypoallergenic and thermoregulating.",
    ],
  },
  {
    title: "Fit & Model Measurements",
    lines: [
      "Intentionally cut with a relaxed, boxy oversized silhouette.",
      "Model is 176 cm tall (Bust 32\", Waist 25\", Hips 35\") wearing Size M.",
      "Prefer a trimmer look? We suggest sizing down one size.",
    ],
  },
  {
    title: "Myanmar Township Shipping & COD Terms",
    lines: [
      "Yangon / Mandalay: dispatched within 24 to 48 hours.",
      "Other regions & states: Taunggyi, Mawlamyine, Naypyitaw, Bago within 2 to 4 business days.",
      "Payment methods: Cash on Delivery (COD), KBZPay, WavePay, or direct bank transfer.",
    ],
  },
];

export default function ProductPurchase({ product }: ProductPurchaseProps) {
  const [selected, setSelected] = useState<Variant | null>(
    product.variants[0] ?? null,
  );
  const [added, setAdded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const price = Number(product.base_price) + Number(selected?.price_delta ?? 0);
  const inStock = Boolean(selected && selected.stock_quantity > 0);
  const lowStock = Boolean(
    selected && selected.stock_quantity > 0 && selected.stock_quantity <= 5,
  );

  function handleAdd() {
    if (!selected || !inStock) return;
    const snapshot: CartSnapshot = {
      productId: product.id,
      name: product.name,
      size: selected.size,
      color: selected.color,
      unitPrice: price,
      imageUrl: product.image_url ?? null,
    };
    const ok = addToCart(selected.id, 1, snapshot);
    if (!ok) {
      setSaveError(true);
      window.setTimeout(() => setSaveError(false), 4000);
      return;
    }
    setSaveError(false);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="flex flex-col">
      <span className="text-label-sm font-label-sm font-semibold uppercase tracking-widest text-secondary">
        Pre-washed · Ethically Loomed in Myanmar
      </span>

      <h1 className="mt-space-xs font-headline-lg text-headline-lg tracking-tight text-primary">
        {product.name}
      </h1>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center text-secondary">
          {[0, 1, 2, 3, 4].map((star) => (
            <span
              key={star}
              className="material-symbols-outlined material-symbols-fill text-[16px]"
            >
              star
            </span>
          ))}
        </div>
        <span className="font-body-sm text-body-sm font-medium text-on-surface">
          4.9
        </span>
        <span className="font-body-sm text-body-sm text-outline-variant">·</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Atelier reviews
        </span>
      </div>

      <p className="mt-3 font-headline-sm text-headline-sm font-semibold text-primary">
        {formatMmk(price)}
      </p>

      {product.description && (
        <p className="mt-space-md font-body-md text-body-md leading-relaxed text-on-surface-variant">
          {product.description}
        </p>
      )}

      <VariantSelector
        variants={product.variants}
        selectedVariantId={selected?.id ?? null}
        onChange={setSelected}
        sizeChart={<SizeChartModal />}
      />

      {selected && (
        <div
          className={`mt-space-md flex items-center gap-2 border p-2.5 ${
            inStock
              ? "border-surface-container-highest bg-surface-container-low"
              : "border-error-container bg-error-container/40"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              inStock ? "animate-pulse bg-secondary" : "bg-error"
            }`}
          />
          <span
            className={`text-label-sm font-label-sm font-semibold uppercase tracking-wide ${
              inStock ? "text-secondary" : "text-on-error-container"
            }`}
          >
            {inStock
              ? lowStock
                ? `Low stock — only ${selected.stock_quantity} left in the atelier`
                : "In stock — ready to dispatch"
              : "Out of stock — please choose another option"}
          </span>
        </div>
      )}

      <div className="mt-space-lg flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-label-md font-label-md uppercase tracking-widest text-on-primary transition-all hover:bg-inverse-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">
            shopping_bag
          </span>
          {added
            ? "Added to bag"
            : `Add to Cart — ${formatMmk(price)}`}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-surface text-label-md font-label-md uppercase tracking-wider text-primary transition-all hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              local_shipping
            </span>
            Cash on Delivery
          </Link>
          <button
            type="button"
            aria-label="Save to wishlist"
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-surface-container-highest bg-surface text-primary transition-all hover:border-primary"
          >
            <span className="material-symbols-outlined text-[20px]">
              favorite
            </span>
          </button>
        </div>

        {added && (
          <Link
            href="/cart"
            className="text-center text-body-sm text-secondary underline underline-offset-4"
          >
            View shopping bag
          </Link>
        )}

        {saveError && (
          <p
            role="alert"
            className="text-center text-body-sm text-error"
          >
            Couldn&apos;t save to your bag — enable cookies/local storage and try
            again.
          </p>
        )}
      </div>

      <div className="mt-space-lg space-y-3 border-y border-surface-container-highest py-space-md">
        {PERKS.map((perk) => (
          <div key={perk.icon} className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[20px] text-secondary">
              {perk.icon}
            </span>
            <p className="font-body-sm text-body-sm leading-snug text-on-surface">
              <strong className="font-medium">{perk.title}</strong> {perk.body}
            </p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-surface-container-highest">
        {ACCORDIONS.map((section, index) => {
          const open = openIndex === index;
          return (
            <div key={section.title} className="py-space-md">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between text-left text-label-md font-label-md uppercase tracking-wider text-primary"
              >
                <span>{section.title}</span>
                <span className="material-symbols-outlined text-[18px]">
                  {open ? "expand_less" : "expand_more"}
                </span>
              </button>
              {open && (
                <div className="mt-3 space-y-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {section.lines.map((line) => (
                    <p key={line}>• {line}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
