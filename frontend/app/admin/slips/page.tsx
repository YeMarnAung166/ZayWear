"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

interface Order {
  id: number;
  status: string;
  total: number;
  slip_url: string | null;
  created_at: string;
}

export default function SlipVerificationPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.get<Order[]>("/admin/slips"));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(orderId: number, approve: boolean) {
    setBusyId(orderId);
    try {
      await api.post(`/admin/orders/${orderId}/verify`, { approve });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-space-md flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Payment Slips
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {loading
              ? "Loading…"
              : orders.length === 0
                ? "Nothing awaiting verification."
                : `${orders.length} ${orders.length === 1 ? "slip" : "slips"} awaiting verification`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[16px]">
            refresh
          </span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-28 animate-pulse rounded border border-surface-container-highest bg-surface-container-low"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <section className="flex flex-col items-center rounded border border-surface-container-highest bg-surface-container-low py-space-xl text-center">
          <div className="mb-space-sm flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[28px]">
              fact_check
            </span>
          </div>
          <p className="font-body-lg text-body-lg text-primary">
            All slips verified
          </p>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            New uploads will appear here for review.
          </p>
        </section>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-4 rounded border border-surface-container-highest bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <a
                  href={order.slip_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-outline-variant/50 bg-surface-container text-on-surface-variant transition-colors hover:border-primary"
                  title="Open slip in a new tab"
                >
                  {order.slip_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.slip_url}
                      alt={`Slip for order ${order.id}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[24px]">
                      image
                    </span>
                  )}
                </a>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      Order #{String(order.id).padStart(5, "0")}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    {new Date(order.created_at).toLocaleString("en-GB")} •{" "}
                    {Number(order.total).toLocaleString()} MMK
                  </p>
                  <a
                    href={order.slip_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-label-sm font-label-sm uppercase tracking-wider text-secondary underline underline-offset-4"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      visibility
                    </span>
                    View slip
                  </a>
                </div>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => decide(order.id, true)}
                  className="inline-flex items-center gap-1.5 rounded bg-[#1b6b34] px-4 py-2.5 text-label-sm font-label-sm uppercase tracking-wider text-white transition-colors hover:bg-[#155229] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => decide(order.id, false)}
                  className="inline-flex items-center gap-1.5 rounded border border-error px-4 py-2.5 text-label-sm font-label-sm uppercase tracking-wider text-error transition-colors hover:bg-error-container/40 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
