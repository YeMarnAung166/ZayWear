import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { adminFetch } from "@/lib/admin/api";
import {
  formatHours,
  formatPercent,
  refusalLabel,
  statusLabel,
} from "@/lib/admin/format";
import type { AdminMetrics } from "@/lib/admin/types";
import { MMK } from "@/lib/format";

export const metadata: Metadata = {
  title: "Metrics",
};

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refused",
  "returned",
];

export default async function AdminMetricsPage() {
  const metrics = await adminFetch<AdminMetrics>("/admin/metrics");

  const cards = [
    { label: "Orders today", value: String(metrics.orders_today) },
    { label: "Orders (7 days)", value: String(metrics.orders_7d) },
    { label: "Orders (30 days)", value: String(metrics.orders_30d) },
    { label: "Refusal rate (30 days)", value: formatPercent(metrics.refusal_rate_30d) },
    { label: "Median delivery", value: formatHours(metrics.median_delivery_hours) },
    { label: "Revenue (30 days, delivered)", value: MMK(metrics.revenue_30d_mmk) },
  ];

  const refusalReasons = Object.entries(metrics.refusal_reasons_30d);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="mt-1 text-sm text-neutral-500">
            A quick read on volume, delivery and refusals.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-neutral-0 p-4"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold price">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="text-base font-bold">Orders by status</h2>
          <div className="mt-3 divide-y divide-neutral-200">
            {STATUS_OPTIONS.map((status) => (
              <Link
                key={status}
                href={`/admin/orders?status=${status}`}
                prefetch={false}
                className="flex min-h-11 items-center justify-between gap-3 text-sm hover:text-primary-500"
              >
                <span>{statusLabel(status)}</span>
                <span className="price font-semibold">
                  {metrics.status_counts[status] ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="text-base font-bold">Refusal reasons (30 days)</h2>
          {refusalReasons.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              No refusals recorded in the last 30 days.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-neutral-200">
              {refusalReasons.map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex min-h-11 items-center justify-between gap-3 text-sm"
                >
                  <span>{refusalLabel(reason)}</span>
                  <span className="price font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
