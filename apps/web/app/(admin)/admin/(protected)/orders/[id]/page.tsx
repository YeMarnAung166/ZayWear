import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { StatusActions } from "@/components/admin/StatusActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { saveShipmentAction } from "@/lib/admin/actions";
import { AdminApiError, adminFetch } from "@/lib/admin/api";
import {
  formatAdminDateTime,
  refusalLabel,
  statusLabel,
} from "@/lib/admin/format";
import type { AdminOrderDetail } from "@/lib/admin/types";
import { MMK } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Order detail",
};

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let order: AdminOrderDetail;

  try {
    const body = await adminFetch<{ data: AdminOrderDetail }>(`/admin/orders/${id}`);
    order = body.data;
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const { updated, error } = await searchParams;
  const notice = updated
    ? updated === "shipment"
      ? "Shipment saved."
      : `Order moved to ${statusLabel(updated)}.`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            prefetch={false}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900"
          >
            ← All orders
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{order.order_number}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Placed {formatAdminDateTime(order.created_at)} · {order.placed_via}
          </p>
        </div>
        <RefreshButton />
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-md border border-success-500/30 bg-success-500/10 px-3 py-2 text-sm font-medium text-success-500"
        >
          {notice}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm font-medium text-error-500"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Move order</h2>
            <div className="mt-3">
              <StatusActions
                orderId={order.id}
                transitions={order.allowed_transitions}
              />
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Items</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-semibold text-neutral-500">
                  <tr>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Size</th>
                    <th className="py-2 pr-3">Colour</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {order.items.map((item, index) => (
                    <tr key={`${item.name_en}-${item.size}-${item.color}-${index}`}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{item.name_en}</p>
                        <p className="text-xs text-neutral-500">{item.name_mm}</p>
                      </td>
                      <td className="py-3 pr-3">{item.size}</td>
                      <td className="py-3 pr-3">{item.color}</td>
                      <td className="py-3 pr-3">{item.qty}</td>
                      <td className="py-3 pr-3 price">{MMK(item.unit_price_mmk)}</td>
                      <td className="py-3 price font-semibold">
                        {MMK(item.line_total_mmk)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Timeline</h2>
            {order.events.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No events yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {order.events.map((event, index) => (
                  <li
                    key={`${event.to}-${event.at ?? index}`}
                    className="border-l-2 border-neutral-200 pl-3"
                  >
                    <p className="text-sm font-semibold">
                      {event.from ? `${statusLabel(event.from)} → ` : ""}
                      {statusLabel(event.to)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatAdminDateTime(event.at)} · {event.actor}
                    </p>
                    {event.reason ? (
                      <p className="mt-1 text-sm">{refusalLabel(event.reason)}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Customer</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Name</dt>
                <dd className="font-semibold">{order.customer.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Phone</dt>
                <dd className="font-semibold">
                  {order.customer.phone ? (
                    <a href={`tel:${order.customer.phone}`} className="underline">
                      {order.customer.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Township</dt>
                <dd>
                  {order.township
                    ? `${order.township.name_en} / ${order.township.name_mm} (${order.township.region})`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Address</dt>
                <dd>{order.address_line}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Landmark</dt>
                <dd>{order.landmark}</dd>
              </div>
              {order.note ? (
                <div>
                  <dt className="text-neutral-500">Customer note</dt>
                  <dd className="rounded-md bg-warning-500/10 px-3 py-2 text-warning-500">
                    {order.note}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Method</dt>
                <dd className="font-semibold">
                  {PAYMENT_METHOD_LABELS[order.payment_method]?.en ??
                    order.payment_method}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Status</dt>
                <dd className="font-semibold">
                  {PAYMENT_STATUS_LABELS[order.payment_status]?.en ??
                    order.payment_status}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-neutral-200 pt-2">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd className="price">{MMK(order.subtotal_mmk)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Delivery</dt>
                <dd className="price">{MMK(order.delivery_fee_mmk)}</dd>
              </div>
              {order.discount_mmk > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">Discount</dt>
                  <dd className="price">-{MMK(order.discount_mmk)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-neutral-200 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="price">{MMK(order.total_mmk)}</dd>
              </div>
            </dl>
            {order.refusal_reason ? (
              <p className="mt-3 text-sm">
                <span className="text-neutral-500">Refusal:</span>{" "}
                {refusalLabel(order.refusal_reason)}
              </p>
            ) : null}
            {order.cancel_reason ? (
              <p className="mt-2 text-sm">
                <span className="text-neutral-500">Cancellation:</span>{" "}
                {order.cancel_reason}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Shipment</h2>
            <form action={saveShipmentAction} className="mt-3 space-y-3">
              <input type="hidden" name="order_id" value={order.id} />
              <div>
                <label htmlFor="carrier" className="text-sm font-semibold">
                  Carrier
                </label>
                <input
                  id="carrier"
                  name="carrier"
                  required
                  maxLength={80}
                  defaultValue={order.shipment?.carrier ?? ""}
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="tracking_number" className="text-sm font-semibold">
                  Tracking number
                </label>
                <input
                  id="tracking_number"
                  name="tracking_number"
                  maxLength={80}
                  defaultValue={order.shipment?.tracking_number ?? ""}
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
              >
                Save shipment
              </button>
            </form>

            {order.shipment ? (
              <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">COD amount</dt>
                  <dd className="price">{MMK(order.shipment.cod_amount_mmk)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">Dispatched</dt>
                  <dd>{formatAdminDateTime(order.shipment.dispatched_at)}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
