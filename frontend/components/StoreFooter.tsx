"use client";

import Link from "next/link";

const SHOP_LINKS = [
  { href: "/#new-arrivals", label: "New Arrivals" },
  { href: "/#categories", label: "Linen & Voile" },
  { href: "/#new-arrivals", label: "Everyday Basics" },
  { href: "/#atelier", label: "Textile Archive" },
];

const CARE_LINKS = [
  { href: "/my-orders", label: "Editorial Care" },
  { href: "/#delivery", label: "Shipping & Cash on Delivery" },
  { href: "/#new-arrivals", label: "Size & Fit Guide" },
  { href: "/login", label: "Contact Atelier" },
];

export default function StoreFooter() {
  return (
    <footer className="border-t border-surface-container-highest bg-surface-container-low">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-lg px-space-lg py-space-xl md:px-margin">
        <div className="grid grid-cols-1 gap-8 border-b border-surface-container-highest pb-8 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <Link
              href="/"
              className="font-headline-sm text-headline-sm font-medium tracking-tight text-primary"
            >
              ZayWear
            </Link>
            <p className="max-w-sm text-body-sm font-body-sm text-on-surface-variant">
              A contemporary digital fashion atelier exploring Southeast Asian
              textile traditions through clean silhouettes and everyday tactile
              luxury.
            </p>
            <div className="pt-2 text-label-sm font-label-sm uppercase tracking-wider text-secondary">
              Nationwide delivery across all townships in Myanmar | Cash on
              Delivery available.
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <h4 className="text-label-md font-label-md uppercase tracking-wider text-primary">
              Shop
            </h4>
            <ul className="space-y-2 text-body-sm font-body-sm">
              <li>
                <Link
                  href="/#new-arrivals"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link
                  href="/my-orders"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-2">
            <h4 className="text-label-md font-label-md uppercase tracking-wider text-primary">
              Customer Care
            </h4>
            <ul className="space-y-2 text-body-sm font-body-sm">
              <li>
                <Link
                  href="/my-orders"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Track Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/exchanges/new"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Size Exchange
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Checkout
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/slips"
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <h4 className="text-label-md font-label-md uppercase tracking-wider text-primary">
              Newsletter
            </h4>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Subscribe for quiet release announcements and receive 10% off your
              initial order.
            </p>
            <form
              className="flex"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-l-lg border border-surface-container-highest bg-surface px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-r-lg bg-primary-container px-4 py-2 text-label-md text-surface-bright transition-colors hover:bg-[#2b2b2b]"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-body-sm font-body-sm text-on-surface-variant md:flex-row">
          <p className="text-label-sm font-label-sm">
            © 2026 ZayWear. Nationwide delivery across all townships in Myanmar |
            Cash on Delivery available. All rights reserved.
          </p>
          <div className="flex items-center gap-space-md text-[18px]">
            <span
              className="material-symbols-outlined"
              title="Doorstep Cash On Delivery"
            >
              payments
            </span>
            <span
              className="material-symbols-outlined"
              title="Nationwide Dispatch"
            >
              local_shipping
            </span>
            <span className="material-symbols-outlined" title="SSL Protected">
              lock
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
