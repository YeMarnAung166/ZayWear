"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function SearchView({
  products,
  initialQuery,
}: {
  products: Product[];
  initialQuery: string;
}) {
  const { pick } = useI18n();
  const [query, setQuery] = useState(initialQuery);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return products.filter((product) =>
      `${product.name_mm} ${product.name_en} ${product.category?.name_en ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [products, query]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{pick("ရှာဖွေရန်", "Search")}</h1>

      <label htmlFor="search-input" className="sr-only">
        {pick("ပစ္စည်း အမည်", "Product name")}
      </label>
      <input
        id="search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={pick("ဥပမာ — တီရှပ်", "e.g. tee")}
        className="h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
      />

      {!query.trim() ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          {pick("ပစ္စည်း အမည် ရိုက်ထည့်ပါ။", "Type a product name to search.")}
        </p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          {pick("ရှာဖွေမှု မတွေ့ပါ။", "No products found.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
