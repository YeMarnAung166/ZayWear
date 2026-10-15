"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { api, uploadSlip } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

interface OrderItem {
  id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
}

interface Order {
  id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  shipping_fee: string;
  total: string;
  slip_url: string | null;
  shipping_address: string | null;
  phone: string | null;
  delivered_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
  kbzpay: "KBZPay",
  wavepay: "WavePay",
  cod: "Cash on Delivery",
};

function formatMmk(value: string | number): string {
  return `${Number(value).toLocaleString()} MMK`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<Order>(`/orders/${params.id}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [params.id]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadSlip<Order>(order.id, file);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-grow px-space-lg py-space-xl md:px-margin">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Loading order…
        </p>
      </main>
    );
  }

  const needsSlip =
    order.payment_method !== "cod" &&
    order.status === "pending" &&
    !order.slip_url;

  return (
    <main className="mx-auto w-full max-w-3xl flex-grow px-space-lg py-space-xl md:px-margin">
      <nav className="mb-space-sm flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <Link href="/my-orders" className="transition-colors hover:text-primary">
          My Orders
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="font-medium text-primary">
          #{String(order.id).padStart(5, "0")}
        </span>
      </nav>

      <header className="mb-space-lg flex flex-col justify-between gap-4 border-b border-surface-container-highest pb-space-md md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
              Order #{String(order.id).padStart(5, "0")}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Placed {formatDate(order.created_at)}
          </p>
        </div>
        <Link
          href="/my-orders"
          className="inline-flex items-center gap-1.5 self-start rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container md:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">
            arrow_back
          </span>
          All orders
        </Link>
      </header>

      <div className="space-y-6">
        <section className="rounded border border-surface-container-highest bg-surface-container-low p-6 sm:p-7">
          <h2 className="mb-4 border-b border-outline-variant/40 pb-3 font-headline-sm text-headline-sm text-primary">
            Order summary
          </h2>

          <ul className="divide-y divide-surface-container-highest">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">
                      checkroom
                    </span>
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-primary">
                      Item #{item.id} · Variant {item.variant_id}
                    </p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">
                      {formatMmk(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-body-sm font-medium text-primary">
                  {formatMmk(Number(item.unit_price) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-3 border-t border-outline-variant/40 pt-4 font-body-sm text-body-sm">
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Bag subtotal</dt>
              <dd className="font-medium text-primary">
                {formatMmk(order.subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-on-surface-variant">Shipping fee</dt>
              <dd className="font-medium text-primary">
                {formatMmk(order.shipping_fee)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-outline-variant/40 pt-3">
              <dt className="font-headline-sm text-headline-sm text-primary">
                Total
              </dt>
              <dd className="font-headline-md text-headline-md font-semibold text-primary">
                {formatMmk(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded border border-surface-container-highest bg-surface-container-low p-6">
            <div className="mb-3 flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-[20px]">
                payments
              </span>
              <h2 className="font-label-md font-label-md uppercase tracking-wider">
                Payment
              </h2>
            </div>
            <p className="font-body-lg text-body-lg font-semibold text-primary">
              {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
            </p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {order.payment_method === "cod"
                ? "Pay the courier in cash on delivery."
                : "Transfer and upload your slip for verification."}
            </p>
          </div>

          <div className="rounded border border-surface-container-highest bg-surface-container-low p-6">
            <div className="mb-3 flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-[20px]">
                location_on
              </span>
              <h2 className="font-label-md font-label-md uppercase tracking-wider">
                Delivery
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface">
              {order.shipping_address ?? "No address on file"}
            </p>
            {order.phone && (
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                {order.phone}
              </p>
            )}
          </div>
        </section>

        {order.payment_method !== "cod" && (
          <section className="rounded border border-surface-container-highest bg-surface-container-low p-6 sm:p-7">
            <div className="mb-4 flex items-center gap-3 border-b border-outline-variant/40 pb-3">
              <span className="material-symbols-outlined text-[22px] text-secondary">
                receipt_long
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary">
                Payment slip
              </h2>
            </div>

            {order.slip_url ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-[#1b6b34]">
                    check_circle
                  </span>
                  Slip uploaded. Awaiting verification.
                </p>
                <a
                  href={order.slip_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    visibility
                  </span>
                  View slip
                </a>
              </div>
            ) : (
              <>
                <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
                  Upload a screenshot of your{" "}
                  {PAYMENT_LABELS[order.payment_method] ??
                    order.payment_method}{" "}
                  transfer so our team can verify it.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFile}
                  disabled={busy || !needsSlip}
                  className="block w-full text-body-sm text-on-surface-variant file:mr-3 file:rounded file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-label-sm file:font-label-sm file:uppercase file:tracking-wider file:text-surface disabled:opacity-50"
                />
                {busy && (
                  <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                    Uploading…
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="mt-2 font-body-sm text-body-sm text-error">
                {error}
              </p>
            )}
          </section>
        )}

        {order.status === "delivered" && (
          <section className="flex flex-col items-start gap-3 rounded border border-secondary/30 bg-secondary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary">
                Need a different size?
              </h2>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Exchanges are available within 3 days of delivery.
              </p>
            </div>
            <Link
              href={`/exchanges/new?order=${order.id}`}
              className="rounded bg-primary-container px-6 py-3 text-label-md font-label-md uppercase tracking-[0.08em] text-surface transition-colors hover:bg-[#2b2b2b]"
            >
              Request a size exchange
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
