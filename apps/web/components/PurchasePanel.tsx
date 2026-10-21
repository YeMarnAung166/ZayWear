"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { MMK, telegramLink } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Product, SizeChart } from "@/lib/types";
import { SizeGuideButton } from "@/components/SizeGuideButton";

export function PurchasePanel({
  product,
  telegramBot,
  sizeChart,
}: {
  product: Product;
  telegramBot: string;
  sizeChart: SizeChart | null;
}) {
  const { t, pick } = useI18n();
  const { addLine } = useCart();

  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.color))),
    [product.variants],
  );

  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const variantsForColor = product.variants.filter(
    (variant) => variant.color === color,
  );

  const selected = variantsForColor.find((variant) => variant.size === size) ?? null;
  const maxQty = selected?.stock_qty ?? 1;

  const chooseColor = (next: string) => {
    setColor(next);
    const stillAvailable = product.variants.some(
      (variant) => variant.color === next && variant.size === size && variant.stock_qty > 0,
    );
    if (!stillAvailable) {
      setSize(null);
      setQty(1);
    }
  };

  const addToCart = () => {
    if (!selected) {
      setNotice(pick("အရွယ်အစား ရွေးပါ။", "Please choose a size."));
      return;
    }

    addLine({
      variantId: selected.id,
      productId: product.id,
      productSlug: product.slug,
      name_mm: product.name_mm,
      name_en: product.name_en,
      size: selected.size,
      color: selected.color,
      unitPrice: selected.price_mmk,
      qty,
      image: product.images[0]?.path ?? "",
      maxQty: selected.stock_qty,
    });

    setNotice(pick("ဈေးတောင်းထဲ ထည့်ပြီးပါပြီ။", "Added to your cart."));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold leading-snug">
          {pick(product.name_mm, product.name_en)}
        </h1>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="price text-lg font-bold">{MMK(product.price_mmk)}</span>
          {product.compare_at_price_mmk ? (
            <span className="price text-sm text-neutral-500 line-through">
              {MMK(product.compare_at_price_mmk)}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-sm bg-success-500 px-2 py-1 text-neutral-0">
            {t("common.cod")}
          </span>
          <span
            className={`rounded-sm px-2 py-1 ${
              product.in_stock
                ? "bg-neutral-50 text-success-500"
                : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {product.in_stock ? t("common.in_stock") : t("common.out_of_stock")}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          {t("common.color")}: <span className="text-neutral-500">{color}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {colors.map((name) => {
            const hex =
              product.variants.find((variant) => variant.color === name)?.color_hex ??
              "#cccccc";
            const active = name === color;

            return (
              <button
                key={name}
                type="button"
                onClick={() => chooseColor(name)}
                aria-pressed={active}
                aria-label={name}
                className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${
                  active ? "border-primary-500" : "border-neutral-200"
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-neutral-200"
                  style={{ backgroundColor: hex }}
                />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("common.size")}</p>
          <SizeGuideButton chart={sizeChart} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.sizes.map((sizeOption) => {
            const variant = variantsForColor.find((item) => item.size === sizeOption);
            const available = Boolean(variant && variant.stock_qty > 0);
            const active = size === sizeOption;

            return (
              <button
                key={sizeOption}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSize(sizeOption);
                  setQty(1);
                  setNotice(null);
                }}
                aria-pressed={active}
                className={`min-h-11 min-w-11 rounded-md border px-3 text-sm font-medium ${
                  active
                    ? "border-primary-500 bg-primary-500 text-neutral-0"
                    : available
                      ? "border-neutral-200 text-neutral-900"
                      : "cursor-not-allowed border-neutral-200 text-neutral-500 line-through"
                }`}
              >
                {sizeOption}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">{t("common.quantity")}</p>
        <div className="mt-2 inline-flex items-center rounded-md border border-neutral-200">
          <button
            type="button"
            className="h-11 w-11 text-lg"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="price w-10 text-center text-sm">{qty}</span>
          <button
            type="button"
            className="h-11 w-11 text-lg"
            onClick={() => setQty((value) => Math.min(maxQty, value + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {notice ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      <div className="space-y-2">
        <a
          href={telegramLink(telegramBot, product.id)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-telegram-700 px-4 text-sm font-semibold text-neutral-0"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
            <path d="M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.2 12.1 2.7 10.7c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.4 1.8Z" />
          </svg>
          {t("common.order_telegram")}
        </a>

        <button
          type="button"
          onClick={addToCart}
          className="min-h-12 w-full rounded-md border border-neutral-900 px-4 text-sm font-semibold"
        >
          {t("common.add_to_cart")}
        </button>
      </div>
    </div>
  );
}
