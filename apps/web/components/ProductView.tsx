"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PurchasePanel } from "@/components/PurchasePanel";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/format";
import type { Product, ShopConfig, SizeChart } from "@/lib/types";

export function ProductView({
  product,
  sizeChart,
  config,
}: {
  product: Product;
  sizeChart: SizeChart | null;
  config: ShopConfig;
}) {
  const { t, pick } = useI18n();
  const [activeImage, setActiveImage] = useState(0);
  const image = product.images[activeImage] ?? product.images[0];

  return (
    <div className="space-y-8">
      <nav className="text-xs text-neutral-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          {t("nav.home")}
        </Link>
        {product.category ? (
          <>
            {" / "}
            <Link href={`/c/${product.category.slug}`} className="hover:underline">
              {pick(product.category.name_mm, product.category.name_en)}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-50">
            {image ? (
              <Image
                src={imageUrl(image.path)}
                alt={pick(image.alt_mm, image.alt_en)}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : null}
          </div>

          {product.images.length > 1 ? (
            <div className="mt-2 flex gap-2">
              {product.images.map((item, index) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Image ${index + 1}`}
                  className={`relative h-16 w-14 overflow-hidden rounded-md border ${
                    index === activeImage ? "border-primary-500" : "border-neutral-200"
                  }`}
                >
                  <Image src={imageUrl(item.path)} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <PurchasePanel product={product} telegramBot={config.telegram_bot} sizeChart={sizeChart} />
      </div>

      <div className="divide-y divide-neutral-200 border-y border-neutral-200">
        <details className="group py-3" open>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium">
            {pick("အကြောင်းအရာ", "Description")}
            <span className="text-neutral-500 group-open:rotate-45">+</span>
          </summary>
          <p className="pb-2 text-sm leading-relaxed text-neutral-500">
            {pick(product.description_mm ?? "—", product.description_en ?? "—")}
          </p>
        </details>

        <details className="group py-3">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium">
            {pick("အထည်နှင့် ပြုစုနည်း", "Fabric & care")}
            <span className="text-neutral-500 group-open:rotate-45">+</span>
          </summary>
          <p className="pb-2 text-sm leading-relaxed text-neutral-500">
            {pick(product.fabric_care_mm ?? "—", product.fabric_care_en ?? "—")}
          </p>
        </details>

        <details className="group py-3">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium">
            {pick("ပို့ဆောင်မှုနှင့် ပြန်အမ်း", "Delivery & returns")}
            <span className="text-neutral-500 group-open:rotate-45">+</span>
          </summary>
          <p className="pb-2 text-sm leading-relaxed text-neutral-500">
            {pick(
              `မြို့နယ်အလိုက် ပို့ဆောင်ခ ${config.free_delivery_threshold_mmk.toLocaleString()} MMK အထက် အခမဲ့။ ပစ္စည်းရောက်မှ ငွေချေ။ ${config.return_window_days} ရက်အတွင်း လဲလှယ်နိုင်သည်။`,
              `Township-based delivery, free over ${config.free_delivery_threshold_mmk.toLocaleString()} MMK. Cash on delivery. Exchanges within ${config.return_window_days} days.`,
            )}
          </p>
        </details>
      </div>
    </div>
  );
}
