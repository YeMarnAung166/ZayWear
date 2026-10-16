"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { api } from "@/lib/api";
import { readCart, writeCart, type CartLine } from "@/lib/cart";

interface Variant {
  id: number;
  size: string;
  color: string;
  stock_quantity: number;
  price_delta: string;
}
interface Product {
  id: number;
  name: string;
  base_price: string;
  image_url: string | null;
  variants: Variant[];
}
interface Township {
  id: number;
  name: string;
  region: string | null;
  shipping_fee: string;
  supports_cod: boolean;
}

interface CartRow {
  variantId: number;
  quantity: number;
  name: string;
  size: string;
  color: string;
  unit: number;
  imageUrl: string | null;
}

function formatMmk(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} MMK`;
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [townships, setTownships] = useState<Township[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [townshipId, setTownshipId] = useState<number | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get<Product[]>("/products");
      setProducts(Array.isArray(data) ? data : []);
      setCatalogError(false);
    } catch {
      setProducts([]);
      setCatalogError(true);
    }
  }, []);

  useEffect(() => {
    setCart(readCart());
    void loadCatalog();
    api
      .get<Township[]>("/townships")
      .then(setTownships)
      .catch(() => setTownships([]));
  }, [loadCatalog]);

  function persist(next: CartLine[]) {
    setCart(next);
    writeCart(next);
  }

  const rows = useMemo<CartRow[]>(() => {
    return cart.flatMap((line) => {
      for (const product of products) {
        const variant = product.variants.find((v) => v.id === line.variantId);
        if (variant) {
          return [
            {
              variantId: variant.id,
              quantity: line.quantity,
              name: product.name,
              size: variant.size,
              color: variant.color,
              unit: Number(product.base_price) + Number(variant.price_delta),
              imageUrl: product.image_url,
            },
          ];
        }
      }
      if (line.snapshot) {
        return [
          {
            variantId: line.variantId,
            quantity: line.quantity,
            name: line.snapshot.name,
            size: line.snapshot.size,
            color: line.snapshot.color,
            unit: line.snapshot.unitPrice,
            imageUrl: line.snapshot.imageUrl,
          },
        ];
      }
      return [];
    });
  }, [cart, products]);

  const unresolvedCount = cart.length - rows.length;
  const itemCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = rows.reduce((sum, row) => sum + row.unit * row.quantity, 0);
  const township = townships.find((t) => t.id === townshipId) ?? null;
  const shipping = township ? Number(township.shipping_fee) : 0;
  const total = subtotal + shipping;

  return (
    <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg py-space-xl md:px-margin">
      <nav className="mb-space-sm flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="font-medium text-primary">Shopping Cart</span>
      </nav>

      {cart.length === 0 ? (
        <section className="flex flex-col items-center py-space-xl text-center">
          <div className="mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              shopping_bag
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
            Your shopping bag is empty
          </h1>
          <p className="mt-3 max-w-md font-body-lg text-body-lg text-on-surface-variant">
            Explore our latest collection of mindful silhouettes constructed from
            organic raw fibres and traditional Burmese weaves.
          </p>
          <Link
            href="/#new-arrivals"
            className="mt-8 inline-block rounded-lg bg-primary-container px-8 py-3.5 text-label-md font-label-md uppercase tracking-[0.08em] text-surface-bright transition-colors hover:bg-[#2b2b2b]"
          >
            Explore New Arrivals
          </Link>
        </section>
      ) : rows.length === 0 ? (
        <section className="flex flex-col items-center py-space-xl text-center">
          <div className="mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              cloud_off
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
            We couldn&apos;t load your bag
          </h1>
          <p className="mt-3 max-w-md font-body-lg text-body-lg text-on-surface-variant">
            {catalogError
              ? "Your saved items are still safe — we just couldn't reach our catalogue. Please try again."
              : "These items are no longer available. Please remove them or start a new bag."}
          </p>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            className="mt-8 inline-block rounded-lg bg-primary-container px-8 py-3.5 text-label-md font-label-md uppercase tracking-[0.08em] text-surface-bright transition-colors hover:bg-[#2b2b2b]"
          >
            Retry
          </button>
        </section>
      ) : (
        <>
          <div className="mb-space-lg flex flex-col justify-between border-b border-surface-container-highest pb-space-md md:flex-row md:items-end">
            <div>
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
                Your Shopping Bag ({itemCount} {itemCount === 1 ? "item" : "items"})
              </h1>
              <p className="mt-1.5 flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Handcrafted artisanal pieces reserved for 30 minutes
              </p>
            </div>
          </div>

          {unresolvedCount > 0 && (
            <p className="mb-space-md rounded border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              {unresolvedCount}{" "}
              {unresolvedCount === 1 ? "item" : "items"} in your bag couldn&apos;t
              be loaded and won&apos;t appear below.
            </p>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <section className="flex flex-col space-y-6 lg:col-span-7 xl:col-span-8">
              <div className="divide-y divide-surface-container-highest border-y border-surface-container-highest">
                {rows.map(({ variantId, quantity, name, size, color, unit, imageUrl }) => {
                  const rowTotal = unit * quantity;
                  return (
                    <article
                      key={variantId}
                      className="flex flex-col gap-5 py-6 sm:flex-row"
                    >
                      <div className="relative h-56 w-full flex-shrink-0 overflow-hidden rounded bg-surface-container sm:h-44 sm:w-32">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            sizes="(max-width: 640px) 100vw, 128px"
                            className="object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-outline-variant">
                            <span className="material-symbols-outlined text-[28px]">
                              checkroom
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-label-sm font-label-sm uppercase tracking-widest text-secondary">
                                ZayWear Atelier
                              </span>
                              <h2 className="mt-0.5 font-headline-sm text-headline-sm text-primary">
                                {name}
                              </h2>
                            </div>
                            <button
                              type="button"
                              title="Remove piece"
                              onClick={() =>
                                persist(
                                  cart.filter(
                                    (l) => l.variantId !== variantId,
                                  ),
                                )
                              }
                              className="p-1 text-on-surface-variant transition-colors hover:text-error"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                close
                              </span>
                            </button>
                          </div>
                          <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
                            Size:{" "}
                            <span className="font-medium text-primary">
                              {size}
                            </span>{" "}
                            &nbsp;|&nbsp; Color:{" "}
                            <span className="font-medium text-primary">
                              {color}
                            </span>
                          </p>
                          <p className="mt-1 text-label-sm font-label-sm text-on-surface-variant">
                            SKU: ZW-{String(variantId).padStart(4, "0")} • Hand
                            finished in Myanmar
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between pt-4">
                          <div className="inline-flex items-center rounded border border-outline-variant bg-surface">
                            <button
                              type="button"
                              onClick={() =>
                                persist(
                                  cart.map((l) =>
                                    l.variantId === variantId
                                      ? {
                                          ...l,
                                          quantity: Math.max(1, l.quantity - 1),
                                        }
                                      : l,
                                  ),
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                remove
                              </span>
                            </button>
                            <span className="w-10 text-center text-label-md font-label-md text-primary">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                persist(
                                  cart.map((l) =>
                                    l.variantId === variantId
                                      ? {
                                          ...l,
                                          quantity: Math.min(99, l.quantity + 1),
                                        }
                                      : l,
                                  ),
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                add
                              </span>
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-label-sm font-label-sm text-on-surface-variant">
                              {formatMmk(unit)} / unit
                            </p>
                            <p className="font-body-lg text-body-lg font-semibold text-primary">
                              {formatMmk(rowTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="space-y-4 rounded border border-surface-container-highest bg-surface-container-low p-6">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[24px] text-secondary">
                    local_shipping
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      Nationwide doorstep delivery across Myanmar
                    </h3>
                    <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                      Reliable express handling to townships nationwide. Pay
                      comfortably via Cash on Delivery (COD), KBZPay or WavePay
                      when your garment arrives.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-outline-variant/30 pt-4 font-body-sm text-body-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      swap_calls
                    </span>
                    <span>7-day complimentary size exchange</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      verified
                    </span>
                    <span>100% pre-washed natural textiles</span>
                  </div>
                </div>
              </div>
            </section>

            <aside className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-28 flex flex-col gap-6 rounded border border-surface-container-highest bg-surface-container-low p-6 shadow-[0_8px_30px_rgba(31,31,31,0.03)] sm:p-7">
                <div className="border-b border-outline-variant/40 pb-4">
                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Order Summary
                  </h2>
                  <p className="mt-1 text-label-sm font-label-sm text-on-surface-variant">
                    Review taxes and delivery calculation
                  </p>
                </div>

                <div className="space-y-3.5 font-body-sm text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Bag subtotal</span>
                    <span className="font-medium text-primary">
                      {formatMmk(subtotal)}
                    </span>
                  </div>

                  <div className="pt-2">
                    <label
                      htmlFor="township-select"
                      className="mb-1 block text-label-sm font-label-sm text-on-surface-variant"
                    >
                      Deliver to township
                    </label>
                    <div className="relative">
                      <select
                        id="township-select"
                        value={townshipId ?? ""}
                        onChange={(event) =>
                          setTownshipId(Number(event.target.value))
                        }
                        className="w-full appearance-none rounded border border-outline-variant bg-surface px-3 py-2 pr-9 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none"
                      >
                        <option value="" disabled>
                          Select township
                        </option>
                        {townships.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.region ? ` (${t.region})` : ""} —{" "}
                            {formatMmk(Number(t.shipping_fee))}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-[18px] text-on-surface-variant">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      Shipping fee
                    </span>
                    <span className="font-medium text-primary">
                      {township ? formatMmk(shipping) : "Select township"}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="voucher-input"
                      className="mb-1 block text-label-sm font-label-sm text-on-surface-variant"
                    >
                      Atelier voucher or promo code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="voucher-input"
                        type="text"
                        placeholder="e.g. ATELIER10"
                        className="flex-1 rounded border border-outline-variant bg-surface px-3 py-2 text-body-sm uppercase tracking-wider placeholder:normal-case focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVoucherMsg(
                            "Promo codes are validated at checkout.",
                          )
                        }
                        className="rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
                      >
                        Apply
                      </button>
                    </div>
                    {voucherMsg && (
                      <p className="mt-1 text-label-sm font-label-sm text-secondary">
                        {voucherMsg}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-outline-variant/40 pt-4">
                    <div>
                      <span className="block font-headline-sm text-headline-sm text-primary">
                        Grand Total
                      </span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant">
                        Includes all Myanmar commercial duties
                      </span>
                    </div>
                    <span className="font-headline-md text-headline-md font-semibold text-primary">
                      {formatMmk(total)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Link
                    href="/checkout"
                    className="flex w-full items-center justify-center gap-2 rounded bg-primary-container px-6 py-3.5 text-label-md font-label-md font-semibold uppercase tracking-[0.08em] text-surface transition-all duration-200 hover:bg-[#2b2b2b]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      lock
                    </span>
                    Proceed to Checkout
                    <span className="font-normal text-outline-variant">•</span>
                    <span>{formatMmk(total)}</span>
                  </Link>
                  <Link
                    href="/#new-arrivals"
                    className="block text-center font-body-sm text-body-sm text-primary underline underline-offset-4 transition-colors hover:text-secondary"
                  >
                    Continue shopping
                  </Link>
                </div>

                <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                  <p className="text-center text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
                    Secure payment options in Myanmar
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded border border-outline-variant/60 bg-surface px-2.5 py-1 text-[11px] font-semibold text-on-surface">
                      Cash on Delivery
                    </span>
                    <span className="rounded border border-[#10539b]/30 bg-[#10539b]/10 px-2.5 py-1 text-[11px] font-bold text-[#10539b]">
                      KBZPay
                    </span>
                    <span className="rounded border border-[#ffcb05]/60 bg-[#ffcb05]/20 px-2.5 py-1 text-[11px] font-bold text-[#544600]">
                      WavePay
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
