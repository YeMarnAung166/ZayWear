"use client";

import Link from "next/link";
import { OrderHeading } from "@/components/OrderHeading";
import { MMK } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { formatOrderTimestamp, latestOrderEventAt } from "@/lib/order-format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";

/**
 * The account view: the full record of what was bought and where it goes. The
 * live timeline lives on the shareable tracker, one tap away.
 */
export function OrderReceipt({ order, trackingPath }: { order: Order; trackingPath: string }) {
  const { t, pick } = useI18n();

  const status = ORDER_STATUS_LABELS[order.status];
  const latestAt = formatOrderTimestamp(latestOrderEventAt(order));
  const paymentMethod = PAYMENT_METHOD_LABELS[order.payment_method];
  const paymentStatus = PAYMENT_STATUS_LABELS[order.payment_status];

  return (
    <div className="space-y-8">
      <OrderHeading order={order} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
              ORDER_STATUS_TONES[order.status] ?? "bg-neutral-50 text-neutral-500"
            }`}
          >
            {status ? pick(status.mm, status.en) : order.status}
          </span>
          {latestAt ? <span className="text-xs text-neutral-500">{latestAt}</span> : null}
        </div>

        <Link
          href={trackingPath}
          className="inline-flex min-h-11 items-center text-sm font-medium underline"
        >
          {pick("ပို့ဆောင်မှု လမ်းကြောင်း ကြည့်ရန်", "View tracking")}
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold">{pick("ပစ္စည်းများ", "Items")}</h2>
        <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          {order.items.map((item, index) => (
            <li key={`${item.size}-${item.color}-${index}`} className="flex justify-between gap-3 py-3">
              <span>
                {pick(item.product_name_mm, item.product_name_en)}
                <span className="block text-xs text-neutral-500">
                  {t("common.size")} {item.size} · {item.color} × {item.qty}
                </span>
              </span>
              <span className="price whitespace-nowrap">{MMK(item.line_total_mmk)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t("common.subtotal")}</dt>
            <dd className="price">{MMK(order.subtotal_mmk)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("common.delivery")}</dt>
            <dd className="price">
              {order.delivery_fee_mmk === 0 ? pick("အခမဲ့", "Free") : MMK(order.delivery_fee_mmk)}
            </dd>
          </div>
          {order.discount_mmk > 0 ? (
            <div className="flex justify-between">
              <dt>{pick("လျှော့စျေး", "Discount")}</dt>
              <dd className="price">−{MMK(order.discount_mmk)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{pick("ငွေပေးချေမှု", "Payment")}</dt>
            <dd className="text-right">
              {pick(paymentMethod?.mm ?? order.payment_method, paymentMethod?.en ?? order.payment_method)}
              <span className="block text-xs text-neutral-500">
                {pick(paymentStatus?.mm ?? order.payment_status, paymentStatus?.en ?? order.payment_status)}
              </span>
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
            <dt>{t("common.total")}</dt>
            <dd className="price">{MMK(order.total_mmk)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 text-sm">
        <p className="font-medium">{pick("ပို့ဆောင်ရန်", "Delivering to")}</p>
        <p className="mt-1">
          {order.customer?.name} · <span className="price">{order.customer?.phone}</span>
        </p>
        <p className="mt-1 text-neutral-500">
          {order.address_line}, {pick(order.township?.name_mm ?? "", order.township?.name_en ?? "")}
        </p>
        <p className="text-neutral-500">{order.landmark}</p>
      </div>
    </div>
  );
}
