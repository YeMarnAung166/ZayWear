import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch } from "@/lib/admin/api";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminOrderList } from "@/lib/admin/types";
import { MMK } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Orders",
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

const PAYMENT_STATUS_OPTIONS = ["unpaid", "paid", "refunded"];

const PAYMENT_METHOD_OPTIONS = ["cod", "kbzpay", "wave"];

type Filters = {
  status?: string;
  payment_status?: string;
  payment_method?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function ordersHref(filters: Filters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.payment_status) {
    params.set("payment_status", filters.payment_status);
  }

  if (filters.payment_method) {
    params.set("payment_method", filters.payment_method);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = first(params.status);
  const paymentStatus = first(params.payment_status);
  const paymentMethod = first(params.payment_method);
  const from = first(params.from);
  const to = first(params.to);
  const q = first(params.q);
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);

  const query = new URLSearchParams();

  if (status) {
    query.set("status", status);
  }

  if (paymentStatus) {
    query.set("payment_status", paymentStatus);
  }

  if (paymentMethod) {
    query.set("payment_method", paymentMethod);
  }

  if (from) {
    query.set("from", from);
  }

  if (to) {
    query.set("to", to);
  }

  if (q) {
    query.set("q", q);
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const list = await adminFetch<AdminOrderList>(
    `/admin/orders${query.size ? `?${query.toString()}` : ""}`,
  );
  const counts = list.meta.status_counts;
  const allCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const filters = {
    status,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    from,
    to,
    q,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {list.meta.total} matching {list.meta.total === 1 ? "order" : "orders"}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max gap-2">
          <Link
            href={ordersHref({ ...filters, status: "" })}
            prefetch={false}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-semibold ${
              status === ""
                ? "border-primary-500 bg-primary-500 text-neutral-0"
                : "border-neutral-200 bg-neutral-0 text-neutral-900"
            }`}
          >
            All <span className="ml-1 text-xs opacity-70">{allCount}</span>
          </Link>

          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option}
              href={ordersHref({ ...filters, status: option })}
              prefetch={false}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-semibold ${
                status === option
                  ? "border-primary-500 bg-primary-500 text-neutral-0"
                  : "border-neutral-200 bg-neutral-0 text-neutral-900"
              }`}
            >
              {ORDER_STATUS_LABELS[option]?.en ?? option}
              <span className="ml-1 text-xs opacity-70">{counts[option] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      <form
        method="GET"
        action="/admin/orders"
        className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}

        <div>
          <label htmlFor="from" className="text-sm font-semibold">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
        </div>

        <div>
          <label htmlFor="to" className="text-sm font-semibold">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
        </div>

        <div>
          <label htmlFor="q" className="text-sm font-semibold">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order number or phone"
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
        </div>

        <div>
          <label htmlFor="payment_status" className="text-sm font-semibold">
            Payment status
          </label>
          <select
            id="payment_status"
            name="payment_status"
            defaultValue={paymentStatus}
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm"
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_STATUS_LABELS[option]?.en ?? option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payment_method" className="text-sm font-semibold">
            Payment method
          </label>
          <select
            id="payment_method"
            name="payment_method"
            defaultValue={paymentMethod}
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm"
          >
            <option value="">All payment methods</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_METHOD_LABELS[option]?.en ?? option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
          >
            Apply
          </button>
          <Link
            href={ordersHref({ status })}
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-semibold"
          >
            Clear
          </Link>
        </div>
      </form>

      {list.data.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8 text-center">
          <p className="text-sm font-semibold">No orders match these filters.</p>
          <Link
            href="/admin/orders"
            prefetch={false}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary-500 underline"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.data.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                prefetch={false}
                className="block rounded-lg border border-neutral-200 bg-neutral-0 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {formatAdminDateTime(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="text-neutral-500">Customer</span>
                    <br />
                    {order.customer.name ?? "—"}
                  </p>
                  <p>
                    <span className="text-neutral-500">Township</span>
                    <br />
                    {order.township?.name_en ?? "—"}
                  </p>
                  <p>
                    <span className="text-neutral-500">Items</span>
                    <br />
                    {order.items_count}
                  </p>
                  <p>
                    <span className="text-neutral-500">Total</span>
                    <br />
                    <span className="price font-semibold">{MMK(order.total_mmk)}</span>
                  </p>
                  <p className="col-span-2">
                    <span className="text-neutral-500">Payment</span>
                    <br />
                    {PAYMENT_METHOD_LABELS[order.payment_method]?.en ??
                      order.payment_method}{" "}
                    ·{" "}
                    {PAYMENT_STATUS_LABELS[order.payment_status]?.en ??
                      order.payment_status}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Township</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {list.data.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        prefetch={false}
                        className="underline-offset-2 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatAdminDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p>{order.customer.name ?? "—"}</p>
                      <p className="text-xs text-neutral-500">
                        {order.customer.phone ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{order.township?.name_en ?? "—"}</td>
                    <td className="px-4 py-3">{order.items_count}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span className="price">{MMK(order.total_mmk)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p>{PAYMENT_METHOD_LABELS[order.payment_method]?.en ?? order.payment_method}</p>
                      <p className="text-xs text-neutral-500">
                        {PAYMENT_STATUS_LABELS[order.payment_status]?.en ?? order.payment_status}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-neutral-500">
              Page {list.meta.current_page} of {list.meta.last_page}
            </p>
            <div className="flex gap-2">
              {list.meta.current_page > 1 ? (
                <Link
                  href={ordersHref({
                    ...filters,
                    page: list.meta.current_page - 1,
                  })}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 font-semibold"
                >
                  Previous
                </Link>
              ) : null}
              {list.meta.current_page < list.meta.last_page ? (
                <Link
                  href={ordersHref({
                    ...filters,
                    page: list.meta.current_page + 1,
                  })}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 font-semibold"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
