"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const STATUSES = [
  "pending",
  "slip_uploaded",
  "pending_cod",
  "paid",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

interface Order {
  id: number;
  status: string;
  payment_method: string;
  total: number;
  phone: string | null;
  created_at: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  kbzpay: "KBZPay",
  wavepay: "WavePay",
  cod: "Cash on Delivery",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.get<Order[]>("/admin/orders"));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId: number, status: string) {
    setBusyId(orderId);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
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
            Orders &amp; Fulfillment
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {loading
              ? "Loading…"
              : `${orders.length} ${orders.length === 1 ? "order" : "orders"} in the queue`}
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
        <div className="space-y-3">
          {[0, 1, 2, 4].map((key) => (
            <div
              key={key}
              className="h-16 animate-pulse rounded border border-surface-container-highest bg-surface-container-low"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded border border-surface-container-highest bg-surface-container-low p-8 text-center font-body-sm text-body-sm text-on-surface-variant">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-surface-container-highest bg-surface-container-low">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3 font-label-sm">Order</th>
                <th className="py-3 font-label-sm">Payment</th>
                <th className="py-3 font-label-sm">Phone</th>
                <th className="py-3 font-label-sm">Total</th>
                <th className="py-3 pr-4 font-label-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-surface-container-highest last:border-0 hover:bg-surface-container/60"
                >
                  <td className="py-3 pl-4 font-body-sm font-medium text-primary">
                    #{String(order.id).padStart(5, "0")}
                  </td>
                  <td className="py-3 font-body-sm text-on-surface-variant">
                    {PAYMENT_LABELS[order.payment_method] ??
                      order.payment_method}
                  </td>
                  <td className="py-3 font-body-sm text-on-surface-variant">
                    {order.phone ?? "—"}
                  </td>
                  <td className="py-3 font-body-sm font-medium text-primary">
                    {Number(order.total).toLocaleString()} MMK
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={order.status} />
                      <div className="relative">
                        <select
                          value={order.status}
                          disabled={busyId === order.id}
                          onChange={(e) =>
                            updateStatus(order.id, e.target.value)
                          }
                          className="appearance-none rounded border border-outline-variant bg-surface py-1.5 pl-3 pr-8 text-label-sm capitalize text-on-surface transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1.5 text-[16px] text-on-surface-variant">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
