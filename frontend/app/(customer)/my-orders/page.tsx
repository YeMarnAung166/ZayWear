"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
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
  shipping_address: string | null;
  slip_url: string | null;
  delivered_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const PAYMENT_LABELS: Record<string, string> = {
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Order[]>("/orders")
      .then(setOrders)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load orders"),
      )
      .finally(() => setLoading(false));
  }, []);

  const totalPieces = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + order.items.reduce((s, item) => s + item.quantity, 0),
        0,
      ),
    [orders],
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-grow px-space-lg py-space-xl md:px-margin">
      <nav className="mb-space-sm flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="font-medium text-primary">My Orders</span>
      </nav>

      <header className="mb-space-lg flex flex-col justify-between gap-4 border-b border-surface-container-highest pb-space-md md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-primary">
            My Orders
          </h1>
          <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
            Track atelier reservations, delivery progress, and payment slips.
          </p>
        </div>
        {!loading && orders.length > 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            <span className="font-semibold text-primary">{orders.length}</span>{" "}
            {orders.length === 1 ? "order" : "orders"} •{" "}
            <span className="font-semibold text-primary">{totalPieces}</span>{" "}
            {totalPieces === 1 ? "piece" : "pieces"}
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-32 animate-pulse rounded border border-surface-container-highest bg-surface-container-low"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded border border-error-container bg-error-container/40 p-6 text-body-sm text-on-error-container">
          {error}. Please ensure you are signed in and try again.
        </div>
      ) : orders.length === 0 ? (
        <section className="flex flex-col items-center py-space-xl text-center">
          <div className="mb-space-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">
              package_2
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg tracking-tight text-primary">
            No orders yet
          </h2>
          <p className="mt-3 max-w-md font-body-lg text-body-lg text-on-surface-variant">
            When you reserve a piece, your order will appear here with live
            delivery tracking and payment status.
          </p>
          <Link
            href="/#new-arrivals"
            className="mt-8 inline-block rounded-lg bg-primary-container px-8 py-3.5 text-label-md font-label-md uppercase tracking-[0.08em] text-surface-bright transition-colors hover:bg-[#2b2b2b]"
          >
            Explore New Arrivals
          </Link>
        </section>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const pieces = order.items.reduce((s, item) => s + item.quantity, 0);
            const needsSlip =
              order.payment_method !== "cod" &&
              order.status === "pending" &&
              !order.slip_url;
            return (
              <li
                key={order.id}
                className="rounded border border-surface-container-highest bg-surface-container-low p-5 shadow-[0_8px_30px_rgba(31,31,31,0.03)] transition-colors hover:border-outline-variant sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-headline-sm text-headline-sm text-primary">
                        Order #{String(order.id).padStart(5, "0")}
                      </h2>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Placed {formatDate(order.created_at)} •{" "}
                      {pieces} {pieces === 1 ? "piece" : "pieces"} •{" "}
                      {PAYMENT_LABELS[order.payment_method] ??
                        order.payment_method}
                    </p>
                    {order.shipping_address && (
                      <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined mt-0.5 text-[16px]">
                          local_shipping
                        </span>
                        {order.shipping_address}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <div className="text-right">
                      <p className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
                        Total
                      </p>
                      <p className="font-headline-md text-headline-md font-semibold text-primary">
                        {Number(order.total).toLocaleString()} MMK
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {needsSlip && (
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded bg-secondary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-on-secondary transition-colors hover:bg-[#7a2f18]"
                        >
                          Upload slip
                        </Link>
                      )}
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
                      >
                        View details
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
