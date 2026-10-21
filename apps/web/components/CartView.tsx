"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { imageUrl, MMK } from "@/lib/format";
import type { ShopConfig } from "@/lib/types";

export function CartView({ config }: { config: ShopConfig }) {
  const { t, pick } = useI18n();
  const { lines, subtotal, updateQty, removeLine, hydrated } = useCart();

  if (!hydrated) {
    return <p className="py-16 text-center text-sm text-neutral-500">{t("common.loading")}</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-medium">{t("cart.empty")}</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
        >
          {t("cart.empty_cta")}
        </Link>
      </div>
    );
  }

  const remaining = config.free_delivery_threshold_mmk - subtotal;

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
        {lines.map((line) => (
          <li key={line.variantId} className="flex gap-3 py-4">
            <Link href={`/p/${line.productSlug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-50">
              {line.image ? (
                <Image
                  src={imageUrl(line.image)}
                  alt={pick(line.name_mm, line.name_en)}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/p/${line.productSlug}`} className="text-sm font-medium">
                  {pick(line.name_mm, line.name_en)}
                </Link>
                <p className="mt-1 text-xs text-neutral-500">
                  {t("common.size")} {line.size} · {line.color}
                </p>
                <p className="price mt-1 text-sm font-semibold">{MMK(line.unitPrice)}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="inline-flex items-center rounded-md border border-neutral-200">
                  <button
                    type="button"
                    className="h-11 w-11 text-lg"
                    onClick={() => updateQty(line.variantId, line.qty - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="price w-8 text-center text-sm">{line.qty}</span>
                  <button
                    type="button"
                    className="h-11 w-11 text-lg disabled:text-neutral-200"
                    onClick={() => updateQty(line.variantId, line.qty + 1)}
                    disabled={line.qty >= line.maxQty}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeLine(line.variantId)}
                  className="min-h-11 px-2 text-xs text-neutral-500 underline"
                >
                  {pick("ဖယ်ရှားရန်", "Remove")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{t("common.subtotal")}</span>
          <span className="price font-semibold">{MMK(subtotal)}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {pick(
            "ပို့ဆောင်ခကို မြို့နယ်အလိုက် ငွေချေသည့်အဆင့်တွင် တွက်ချက်ပါမည်။",
            "Delivery is calculated by township at checkout.",
          )}
        </p>
        {remaining > 0 ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs">
            {pick(
              `${MMK(remaining)} ထပ်ဝယ်ပါက ပို့ဆောင်ခ အခမဲ့ ဖြစ်ပါမည်။`,
              `Add ${MMK(remaining)} more for free delivery.`,
            )}
          </p>
        ) : (
          <p className="rounded-md bg-success-500/10 px-3 py-2 text-xs font-medium text-success-500">
            {pick("ပို့ဆောင်ခ အခမဲ့!", "Free delivery unlocked.")}
          </p>
        )}
      </div>

      <Link
        href="/checkout"
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
      >
        {t("common.checkout")}
      </Link>
    </div>
  );
}
