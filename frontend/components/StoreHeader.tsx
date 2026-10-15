"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CART_EVENT, cartCount, readCart } from "@/lib/cart";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/#new-arrivals", label: "New Arrivals" },
  { href: "/my-orders", label: "My Orders" },
  { href: "/admin/slips", label: "Admin" },
];

export default function StoreHeader() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => setCount(cartCount(readCart()));
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-container-highest bg-surface">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-space-lg md:px-margin">
        <Link
          href="/"
          className="flex items-center gap-space-xs font-headline-md text-headline-md font-medium tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          ZayWear
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
        </Link>

        <nav className="hidden items-center gap-space-lg md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b pb-1 text-label-md font-label-md transition-colors ${
                isActive(item.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-space-md">
          <Link
            href="/login"
            aria-label="Account"
            className="hidden p-2 text-on-surface-variant transition-colors hover:text-secondary sm:flex"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
          </Link>

          <Link
            href="/cart"
            aria-label="Shopping bag"
            className="relative flex p-2 text-primary transition-colors hover:text-secondary"
          >
            <span className="material-symbols-outlined text-[24px]">
              shopping_bag
            </span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold leading-none text-on-secondary">
                {count}
              </span>
            )}
          </Link>

          <Link
            href="/#new-arrivals"
            className="hidden items-center justify-center rounded-lg bg-primary-container px-5 py-2.5 text-label-md font-label-md text-surface-bright transition-colors hover:bg-[#2b2b2b] sm:inline-flex"
          >
            Shop Now
          </Link>

          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="p-2 text-primary transition-colors hover:text-secondary md:hidden"
          >
            <span className="material-symbols-outlined text-[24px]">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-space-sm border-t border-surface-container-highest bg-surface px-space-lg py-space-md md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`py-2 text-label-md font-label-md ${
                isActive(item.href)
                  ? "border-l-2 border-primary pl-2 text-primary"
                  : "text-on-surface-variant"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="py-2 text-label-md font-label-md text-on-surface-variant"
          >
            Sign in
          </Link>
          <Link
            href="/#new-arrivals"
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-primary-container py-2.5 text-center text-label-md font-label-md text-surface-bright"
          >
            Shop Now
          </Link>
        </div>
      )}
    </header>
  );
}
