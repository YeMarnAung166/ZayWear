"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function CategoryView({
  products,
  titleMm,
  titleEn,
}: {
  products: Product[];
  titleMm: string;
  titleEn: string;
}) {
  const { pick, t } = useI18n();
  const [size, setSize] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");

  const sizes = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.sizes))),
    [products],
  );

  const visible = useMemo(() => {
    const filtered = size
      ? products.filter((product) =>
          product.variants.some(
            (variant) => variant.size === size && variant.stock_qty > 0,
          ),
        )
      : products;

    return [...filtered].sort((a, b) =>
      sort === "price_asc"
        ? a.price_mmk - b.price_mmk
        : sort === "price_desc"
          ? b.price_mmk - a.price_mmk
          : b.id - a.id,
    );
  }, [products, size, sort]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{pick(titleMm, titleEn)}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {visible.length} {pick("ပစ္စည်း", "items")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-neutral-200 py-3">
        <span className="text-xs font-medium text-neutral-500">{t("common.size")}</span>
        <button
          type="button"
          onClick={() => setSize(null)}
          aria-pressed={size === null}
          className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
            size === null ? "border-primary-500 bg-primary-500 text-neutral-0" : "border-neutral-200"
          }`}
        >
          {pick("အားလုံး", "All")}
        </button>
        {sizes.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSize(option === size ? null : option)}
            aria-pressed={size === option}
            className={`min-h-9 min-w-9 rounded-full border px-3 text-xs font-medium ${
              size === option ? "border-primary-500 bg-primary-500 text-neutral-0" : "border-neutral-200"
            }`}
          >
            {option}
          </button>
        ))}

        <label htmlFor="sort" className="ml-auto text-xs text-neutral-500">
          {pick("စီရန်", "Sort")}
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-neutral-0 px-2 text-xs"
        >
          <option value="newest">{pick("အသစ်ဆုံး", "Newest")}</option>
          <option value="price_asc">{pick("ဈေးနည်းမှ များသို့", "Price: low to high")}</option>
          <option value="price_desc">{pick("ဈေးများမှ နည်းသို့", "Price: high to low")}</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          {pick(
            "ဤရွေးချယ်မှုအတွက် ပစ္စည်း မရှိပါ။ အရွယ်အစား ပြန်ရွေးပါ။",
            "Nothing matches that filter. Try another size.",
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
