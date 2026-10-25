"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { imageUrl, MMK } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Product, Variant } from "@/lib/types";
import { useWishlist } from "@/lib/wishlist";

const LOGIN_PATH = "/account/login?next=%2Faccount%2Fwishlist";

export function WishlistRow({
  product,
  onMoved,
  onRemoved,
}: {
  product: Product;
  onMoved: (productId: number) => void;
  onRemoved: (productId: number) => void;
}) {
  const { t, pick } = useI18n();
  const { addLine } = useCart();
  const { remove } = useWishlist();
  const router = useRouter();

  const inStock = product.variants.filter((variant) => variant.stock_qty > 0);
  const colors = Array.from(new Set(inStock.map((variant) => variant.color)));

  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizesForColor = Array.from(
    new Set(
      inStock
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size),
    ),
  );

  const image = product.images[0];
  const soldOut = inStock.length === 0;

  const chooseColor = (next: string) => {
    setColor(next);
    const stillAvailable = product.variants.some(
      (variant) =>
        variant.color === next &&
        variant.size === size &&
        variant.stock_qty > 0,
    );

    if (!stillAvailable) {
      setSize(null);
    }
  };

  const move = async (variant: Variant) => {
    setError(null);
    setBusy(true);

    const result = await remove(product.id);

    if (result.unauthorized) {
      setBusy(false);
      router.push(LOGIN_PATH);
      return;
    }

    if (!result.ok) {
      setBusy(false);
      setError(pick("ဈေးတောင်းထဲ ထည့်၍ မရပါ။ ထပ်စမ်းပါ။", "Could not move it to your cart. Please try again."));
      return;
    }

    addLine({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      name_mm: product.name_mm,
      name_en: product.name_en,
      size: variant.size,
      color: variant.color,
      unitPrice: variant.price_mmk,
      qty: 1,
      image: image?.path ?? "",
      maxQty: variant.stock_qty,
    });

    setBusy(false);
    onMoved(product.id);
  };

  const moveToCart = () => {
    setError(null);

    if (soldOut) {
      return;
    }

    if (inStock.length === 1) {
      void move(inStock[0]);
      return;
    }

    setPickerOpen((open) => !open);
  };

  const addSelected = () => {
    const chosen = product.variants.find(
      (variant) =>
        variant.color === color &&
        variant.size === size &&
        variant.stock_qty > 0,
    );

    if (!chosen) {
      setError(pick("အရွယ်အစား ရွေးပါ။", "Please choose a size."));
      return;
    }

    void move(chosen);
  };

  const removeItem = async () => {
    setError(null);
    setBusy(true);

    const result = await remove(product.id);
    setBusy(false);

    if (result.unauthorized) {
      setBusy(false);
      router.push(LOGIN_PATH);
      return;
    }

    if (!result.ok) {
      setError(pick("ဖယ်၍ မရပါ။ ထပ်စမ်းပါ။", "Could not remove it. Please try again."));
      return;
    }

    onRemoved(product.id);
  };

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <div className="flex gap-3">
        <Link
          href={`/p/${product.slug}`}
          className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md bg-neutral-50"
        >
          {image ? (
            <Image
              src={imageUrl(image.path)}
              alt={pick(image.alt_mm, image.alt_en)}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/p/${product.slug}`}
              className="line-clamp-2 text-sm leading-snug"
            >
              {pick(product.name_mm, product.name_en)}
            </Link>

            <button
              type="button"
              onClick={removeItem}
              disabled={busy}
              className="min-h-11 shrink-0 px-2 text-xs underline disabled:opacity-60"
            >
              {pick("ဖယ်ရန်", "Remove")}
            </button>
          </div>

          <p className="price mt-1 text-sm font-semibold">
            {MMK(product.price_mmk)}
          </p>
          <p
            className={`mt-1 text-xs ${
              soldOut ? "text-neutral-500" : "text-success-500"
            }`}
          >
            {soldOut ? t("common.out_of_stock") : t("common.in_stock")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={moveToCart}
          disabled={busy || soldOut}
          aria-expanded={pickerOpen}
          className="min-h-11 rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
        >
          {busy
            ? pick("ခဏစောင့်ပါ…", "One moment…")
            : soldOut
              ? t("common.out_of_stock")
              : pick("ဈေးတောင်းထဲ ထည့်ရန်", "Move to cart")}
        </button>
        <Link
          href={`/p/${product.slug}`}
          className="inline-flex min-h-11 items-center px-2 text-xs underline"
        >
          {pick("ပစ္စည်း ကြည့်ရန်", "View product")}
        </Link>
      </div>

      {pickerOpen && !soldOut ? (
        <div className="mt-3 space-y-3 rounded-md bg-neutral-50 p-3">
          <div>
            <p className="text-xs font-medium">
              {t("common.color")}: <span className="text-neutral-500">{color}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((name) => {
                const hex =
                  product.variants.find((variant) => variant.color === name)
                    ?.color_hex ?? "#cccccc";
                const active = name === color;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => chooseColor(name)}
                    aria-pressed={active}
                    aria-label={name}
                    className={`flex min-h-9 items-center gap-1.5 rounded-md border bg-neutral-0 px-2 text-xs ${
                      active ? "border-primary-500" : "border-neutral-200"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-neutral-200"
                      style={{ backgroundColor: hex }}
                    />
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium">{t("common.size")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizesForColor.map((sizeOption) => {
                const available = inStock.some(
                  (variant) =>
                    variant.color === color && variant.size === sizeOption,
                );
                const active = size === sizeOption;

                return (
                  <button
                    key={sizeOption}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setSize(sizeOption);
                      setError(null);
                    }}
                    aria-pressed={active}
                    className={`min-h-9 min-w-9 rounded-md border px-2 text-xs font-medium ${
                      active
                        ? "border-primary-500 bg-primary-500 text-neutral-0"
                        : available
                          ? "border-neutral-200 bg-neutral-0 text-neutral-900"
                          : "cursor-not-allowed border-neutral-200 text-neutral-500 line-through"
                    }`}
                  >
                    {sizeOption}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={addSelected}
            disabled={busy}
            className="min-h-11 w-full rounded-md border border-neutral-900 bg-neutral-0 px-4 text-sm font-semibold disabled:opacity-60"
          >
            {t("common.add_to_cart")}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-error-500" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
