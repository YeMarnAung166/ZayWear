"use client";

import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/WishlistButton";
import { useI18n } from "@/lib/i18n";
import { imageUrl, MMK } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { pick } = useI18n();
  const image = product.images[0];
  const onSale =
    product.compare_at_price_mmk !== null &&
    product.compare_at_price_mmk > product.price_mmk;
  const lowStock =
    product.in_stock &&
    product.variants.every((variant) => variant.stock_qty <= 3);

  return (
    <div className="group relative">
      <Link href={`/p/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-50">
          {image ? (
            <Image
              src={imageUrl(image.path)}
              alt={pick(image.alt_mm, image.alt_en)}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              // The first card is often the largest paint on mobile, so it must
              // not wait for layout before the browser discovers it.
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="object-cover transition group-hover:scale-[1.02]"
            />
          ) : null}

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {onSale ? (
              <span className="rounded-sm bg-accent-500 px-1.5 py-0.5 text-[11px] font-bold text-neutral-0">
                SALE
              </span>
            ) : null}
            {!product.in_stock ? (
              <span className="rounded-sm bg-neutral-900 px-1.5 py-0.5 text-[11px] font-bold text-neutral-0">
                {pick("ပြတ်နေသည်", "SOLD OUT")}
              </span>
            ) : lowStock ? (
              <span className="rounded-sm bg-warning-500 px-1.5 py-0.5 text-[11px] font-bold text-neutral-0">
                {pick("လက်ကျန်နည်း", "LOW STOCK")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <p className="line-clamp-2 text-sm leading-snug">
            {pick(product.name_mm, product.name_en)}
          </p>
          <p className="price text-sm font-semibold">
            {MMK(product.price_mmk)}
            {onSale ? (
              <span className="price ml-2 text-xs font-normal text-neutral-500 line-through">
                {MMK(product.compare_at_price_mmk ?? 0)}
              </span>
            ) : null}
          </p>
        </div>
      </Link>

      <WishlistButton
        productId={product.id}
        className="absolute right-2 top-2 z-10"
      />
    </div>
  );
}
