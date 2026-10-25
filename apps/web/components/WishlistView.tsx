"use client";

import Link from "next/link";
import { useState } from "react";
import { WishlistRow } from "@/components/WishlistRow";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function WishlistView({ products }: { products: Product[] | null }) {
  const { pick } = useI18n();
  const [items, setItems] = useState(products ?? []);
  const [moved, setMoved] = useState(false);
  const unavailable = products === null;

  const drop = (productId: number) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  };

  const movedToCart = (productId: number) => {
    drop(productId);
    setMoved(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{pick("ဝှစ်ရှ်လစ်", "Wishlist")}</h1>
          {items.length > 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              {pick(
                `သိမ်းထားသည် ${items.length} ခု`,
                `${items.length} saved ${items.length === 1 ? "item" : "items"}`,
              )}
            </p>
          ) : null}
        </div>

        <Link href="/account" className="text-sm font-medium underline">
          {pick("အကောင့်သို့", "Back to account")}
        </Link>
      </div>

      {moved ? (
        <p
          className="flex flex-wrap items-center gap-2 rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-500"
          role="status"
        >
          {pick("ဈေးတောင်းထဲ ထည့်ပြီးပါပြီ။", "Added to your cart.")}
          <Link href="/cart" className="font-semibold underline">
            {pick("ဈေးတောင်း ကြည့်ရန်", "View cart")}
          </Link>
        </p>
      ) : null}

      {unavailable ? (
        <div className="rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-sm text-neutral-500">
            {pick(
              "ဝှစ်ရှ်လစ်ကို ဖွင့်၍ မရပါ။ ခဏနေရင် ထပ်စမ်းပါ။",
              "Could not load your wishlist. Please try again.",
            )}
          </p>
          <Link
            href="/account/wishlist"
            className="mt-4 inline-flex min-h-11 items-center rounded-md border border-neutral-900 px-5 text-sm font-semibold"
          >
            {pick("ထပ်စမ်းရန်", "Try again")}
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-sm text-neutral-500">
            {pick("သိမ်းထားသော ပစ္စည်း မရှိသေးပါ။", "No saved items yet.")}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
          >
            {pick("ပစ္စည်းများ ကြည့်ရန်", "Browse products")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((product) => (
            <WishlistRow
              key={product.id}
              product={product}
              onMoved={movedToCart}
              onRemoved={drop}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
