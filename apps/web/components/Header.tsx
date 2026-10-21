"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { count, hydrated } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const badge = count === 0 ? "" : count > 9 ? "10+" : String(count);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-neutral-0">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary-500">
          ZayWear
        </Link>

        <nav className="hidden gap-5 text-sm font-medium md:flex">
          <Link href="/" className={pathname === "/" ? "text-accent-500" : "text-neutral-900"}>
            {t("nav.home")}
          </Link>
          <Link
            href="/c/men"
            className={pathname === "/c/men" ? "text-accent-500" : "text-neutral-900"}
          >
            {t("nav.men")}
          </Link>
          <Link
            href="/c/women"
            className={pathname === "/c/women" ? "text-accent-500" : "text-neutral-900"}
          >
            {t("nav.women")}
          </Link>
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden md:block" role="search">
          <label htmlFor="site-search" className="sr-only">
            {t("nav.search")}
          </label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("nav.search")}
            className="h-9 w-44 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="flex overflow-hidden rounded-md border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLocale("my")}
              aria-pressed={locale === "my"}
              className={`px-2 py-1.5 ${locale === "my" ? "bg-primary-500 text-neutral-0" : "text-neutral-900"}`}
            >
              မြန်မာ
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`px-2 py-1.5 ${locale === "en" ? "bg-primary-500 text-neutral-0" : "text-neutral-900"}`}
            >
              EN
            </button>
          </div>

          <Link
            href="/cart"
            className="relative flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm font-medium"
            aria-label={`${t("nav.cart")} (${count})`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
            </svg>
            {hydrated && badge ? (
              <span className="absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-neutral-0">
                {badge}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <nav className="flex gap-4 overflow-x-auto border-t border-neutral-200 px-4 py-2 text-sm font-medium md:hidden">
        <Link href="/c/men" className="whitespace-nowrap">
          {t("nav.men")}
        </Link>
        <Link href="/c/women" className="whitespace-nowrap">
          {t("nav.women")}
        </Link>
        <Link href="/search" className="whitespace-nowrap">
          {t("nav.search")}
        </Link>
      </nav>
    </header>
  );
}
