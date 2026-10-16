"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { readCart, clearCart, type CartLine } from "@/lib/cart";

interface Township {
  id: number;
  name: string;
  region: string | null;
  shipping_fee: string;
  supports_cod: boolean;
}

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

type PaymentMethod = "kbzpay" | "wavepay" | "cod";

interface CartRow {
  variantId: number;
  quantity: number;
  name: string;
  size: string;
  color: string;
  unit: number;
  imageUrl: string | null;
}
export default function CheckoutPage() {
  const router = useRouter();
  const [townships, setTownships] = useState<Township[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [townshipId, setTownshipId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kbzpay");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(readCart());
    api
      .get<Township[]>("/townships")
      .then(setTownships)
      .catch(() => setTownships([]));
    api
      .get<Product[]>("/products")
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const township = townships.find((t) => t.id === townshipId) ?? null;

  const detailed = useMemo<CartRow[]>(() => {
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
  const subtotal = detailed.reduce((sum, d) => sum + d.unit * d.quantity, 0);

  async function submitOrder() {
    if (cart.length === 0) {
      setError("Your shopping bag is empty.");
      return;
    }
    if (!townshipId) {
      setError("Please select a delivery township.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter a contact phone number.");
      return;
    }
    if (!address.trim()) {
      setError("Please provide a delivery address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const composedAddress = fullName.trim()
        ? `${fullName.trim()} — ${address.trim()}`
        : address.trim();
      const order = await api.post<{ id: number }>("/orders", {
        township_id: townshipId,
        payment_method: paymentMethod,
        shipping_address: composedAddress,
        phone,
        items: cart.map((line) => ({
          variant_id: line.variantId,
          quantity: line.quantity,
        })),
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  const itemCount = detailed.reduce((sum, d) => sum + d.quantity, 0);
  const shipping_fee = township ? Number(township.shipping_fee) : 0;
  const total_due = subtotal + shipping_fee;

  return (
    <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg py-space-xl md:px-margin">
      <nav className="mb-space-sm flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <Link href="/cart" className="transition-colors hover:text-primary">
          Cart
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="font-medium text-primary">Checkout</span>
      </nav>

      {detailed.length === 0 ? (
        <section className="flex flex-col items-center py-space-xl text-center">
          <div className="mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              shopping_bag
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
            Nothing to check out yet
          </h1>
          <p className="mt-3 max-w-md font-body-lg text-body-lg text-on-surface-variant">
            Add a piece to your bag before proceeding to checkout.
          </p>
          <Link
            href="/#new-arrivals"
            className="mt-8 inline-block rounded-lg bg-primary-container px-8 py-3.5 text-label-md font-label-md uppercase tracking-[0.08em] text-surface-bright transition-colors hover:bg-[#2b2b2b]"
          >
            Explore New Arrivals
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <section className="space-y-8 lg:col-span-7 xl:col-span-8">
            <div>
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
                Checkout
              </h1>
              <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
                Complete your delivery details and choose a payment method.
              </p>
            </div>

            <div className="space-y-5 rounded border border-surface-container-highest bg-surface-container-low p-6 sm:p-7">
              <div className="flex items-center gap-3 border-b border-outline-variant/40 pb-4">
                <span className="material-symbols-outlined text-[22px] text-secondary">
                  location_on
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  Shipping details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-label-md font-label-md uppercase tracking-wider text-on-surface-variant"
                  >
                    Recipient name
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Daw Aye Aye"
                    className="w-full rounded border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-label-md font-label-md uppercase tracking-wider text-on-surface-variant"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full rounded border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="township"
                  className="mb-1.5 block text-label-md font-label-md uppercase tracking-wider text-on-surface-variant"
                >
                  Township
                </label>
                <div className="relative">
                  <select
                    id="township"
                    value={townshipId ?? ""}
                    onChange={(event) =>
                      setTownshipId(Number(event.target.value))
                    }
                    className="w-full appearance-none rounded border border-outline-variant bg-surface px-3 py-2.5 pr-10 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="" disabled>
                      Select your township
                    </option>
                    {townships.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.region ? ` (${t.region})` : ""} —{" "}
                        {Number(t.shipping_fee).toLocaleString()} MMK
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-3 text-[18px] text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-1.5 block text-label-md font-label-md uppercase tracking-wider text-on-surface-variant"
                >
                  Full delivery address
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={3}
                  placeholder="House no., street, quarter, landmark"
                  className="w-full resize-none rounded border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-5 rounded border border-surface-container-highest bg-surface-container-low p-6 sm:p-7">
              <div className="flex items-center gap-3 border-b border-outline-variant/40 pb-4">
                <span className="material-symbols-outlined text-[22px] text-secondary">
                  payments
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  Payment method
                </h2>
              </div>

              <div className="space-y-3">
                {(
                  [
                    {
                      value: "kbzpay" as PaymentMethod,
                      label: "KBZPay",
                      hint: "Transfer and upload your slip for verification.",
                      badgeClass:
                        "border-[#10539b]/30 bg-[#10539b]/10 text-[#10539b]",
                    },
                    {
                      value: "wavepay" as PaymentMethod,
                      label: "WavePay",
                      hint: "Pay via Wave Money and upload your transfer slip.",
                      badgeClass:
                        "border-[#ffcb05]/70 bg-[#ffcb05]/20 text-[#544600]",
                    },
                    {
                      value: "cod" as PaymentMethod,
                      label: "Cash on Delivery",
                      hint: township
                        ? township.supports_cod
                          ? "Pay the courier in cash when your parcel arrives."
                          : "Not available in your selected township."
                        : "Select a township to check availability.",
                      badgeClass:
                        "border-outline-variant/60 bg-surface text-on-surface",
                    },
                  ]
                ).map((option) => {
                  const disabled =
                    option.value === "cod" &&
                    (!township || !township.supports_cod);
                  const selected = paymentMethod === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-4 rounded border p-4 transition-colors ${
                        disabled
                          ? "cursor-not-allowed border-outline-variant/40 opacity-50"
                          : selected
                            ? "border-primary bg-surface"
                            : "border-outline-variant/60 bg-surface hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        className="mt-1 accent-[#1f1f1f]"
                        disabled={disabled}
                        checked={selected}
                        onChange={() => setPaymentMethod(option.value)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-body-lg text-body-lg font-semibold text-primary">
                            {option.label}
                          </span>
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${option.badgeClass}`}
                          >
                            {option.value === "cod"
                              ? "COD"
                              : option.value.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {option.hint}
                        </p>
                      </div>
                    </label>
                  );
                })}
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
                  {itemCount} {itemCount === 1 ? "piece" : "pieces"} reserved
                </p>
              </div>

              <ul className="space-y-4">
                {detailed.map(({ variantId, quantity, name, size, color, unit, imageUrl }) => (
                  <li key={variantId} className="flex gap-3">
                    <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded bg-surface-container">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-outline-variant">
                          <span className="material-symbols-outlined text-[20px]">
                            checkroom
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-body-sm font-medium text-primary">
                        {name}
                      </span>
                      <span className="text-label-sm font-label-sm text-on-surface-variant">
                        {size} • {color} • ×{quantity}
                      </span>
                    </div>
                    <span className="text-body-sm font-medium text-primary">
                      {Number(unit * quantity).toLocaleString()} MMK
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 border-t border-outline-variant/40 pt-4 font-body-sm text-body-sm">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Bag subtotal</span>
                  <span className="font-medium text-primary">
                    {subtotal.toLocaleString()} MMK
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Shipping fee</span>
                  <span className="font-medium text-primary">
                    {township
                      ? `${Number(township.shipping_fee).toLocaleString()} MMK`
                      : "Select township"}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-outline-variant/40 pt-4">
                  <span className="font-headline-sm text-headline-sm text-primary">
                    Total
                  </span>
                  <span className="font-headline-md text-headline-md font-semibold text-primary">
                    {Number(total_due).toLocaleString()} MMK
                  </span>
                </div>
              </div>

              {error && (
                <p className="rounded border border-error/30 bg-error-container/40 px-3 py-2 text-body-sm text-on-error-container">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded bg-primary-container px-6 py-3.5 text-label-md font-label-md font-semibold uppercase tracking-[0.08em] text-surface transition-all duration-200 hover:bg-[#2b2b2b] disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">
                  lock
                </span>
                {submitting ? "Placing order…" : "Place order"}
                <span className="font-normal text-outline-variant">•</span>
                <span>{total_due.toLocaleString()} MMK</span>
              </button>

              <Link
                href="/cart"
                className="block text-center font-body-sm text-body-sm text-primary underline underline-offset-4 transition-colors hover:text-secondary"
              >
                Back to shopping bag
              </Link>

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
      )}
    </main>
  );
}
