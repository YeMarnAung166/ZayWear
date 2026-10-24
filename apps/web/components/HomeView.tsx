"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import type { Category, Product, ShopConfig } from "@/lib/types";
import { MMK } from "@/lib/format";

export function HomeView({
  featured,
  categories,
  config,
}: {
  featured: Product[];
  categories: Category[];
  config: ShopConfig;
}) {
  const { t, pick } = useI18n();

  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-primary-500 px-5 py-10 text-neutral-0">
        <p className="text-xs uppercase tracking-widest text-neutral-200">
          {pick("မြန်မာနိုင်ငံ", "Myanmar")}
        </p>
        <h1 className="mt-2 max-w-lg text-2xl font-bold leading-snug sm:text-3xl">
          {pick(
            "နေ့စဉ် ဝတ်ဆင်ရ အဆင်ပြေသော အထည်များ",
            "Everyday clothes that fit real life.",
          )}
        </h1>
        <p className="mt-3 max-w-md text-sm text-neutral-200">
          {pick(
            "ပစ္စည်းရောက်မှ ငွေချေ။ မြို့နယ်အလိုက် ပို့ဆောင်ခ တိကျစွာ သိရသည်။",
            "Cash on delivery. Delivery fee shown up front, by township.",
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/c/men"
            className="flex min-h-11 items-center rounded-md bg-neutral-0 px-5 text-sm font-semibold text-primary-500"
          >
            {t("nav.men")}
          </Link>
          <Link
            href="/c/women"
            className="flex min-h-11 items-center rounded-md border border-neutral-500 px-5 text-sm font-semibold text-neutral-0"
          >
            {t("nav.women")}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">{t("nav.categories")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/c/${category.slug}`}
              className="flex min-h-24 flex-col justify-end rounded-lg bg-neutral-50 p-4"
            >
              <span className="text-base font-semibold">
                {pick(category.name_mm, category.name_en)}
              </span>
              <span className="text-xs text-neutral-500">
                {pick("ကြည့်ရှုရန်", "Browse")} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">{pick("အသစ်ရောက်များ", "New arrivals")}</h2>
          <Link href="/c/men" className="text-xs text-neutral-500 underline">
            {pick("အားလုံး", "See all")}
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index === 0} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <h2 className="text-base font-semibold">
          {pick("Telegram ဖြင့် လွယ်ကူစွာ မှာယူပါ", "Order in under a minute on Telegram")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {pick(
            "အရွယ်အစား ရွေးပြီး လိပ်စာ ထည့်လိုက်ရုံ။ အော်ဒါနံပါတ် ချက်ချင်း ရပါမည်။",
            "Pick a size, send your address, get an order number instantly.",
          )}
        </p>
        <a
          href={`https://t.me/${config.telegram_bot}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-telegram-700 px-5 text-sm font-semibold text-neutral-0"
        >
          {t("common.order_telegram")}
        </a>
        <p className="mt-3 text-xs text-neutral-500">
          {pick("ပို့ဆောင်ခ အခမဲ့ — ", "Free delivery over ")}
          {MMK(config.free_delivery_threshold_mmk)}
        </p>
      </section>
    </div>
  );
}
