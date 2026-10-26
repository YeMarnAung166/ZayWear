"use client";

import Link from "next/link";
import { OrderHeading } from "@/components/OrderHeading";
import { PaymentPanel } from "@/components/PaymentPanel";
import { useI18n } from "@/lib/i18n";
import { formatOrderTimestamp, orderEventTimes } from "@/lib/order-format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STEPS,
  REFUSAL_REASON_LABELS,
} from "@/lib/order-status";
import type { TrackingOrder } from "@/lib/types";

const TERMINAL_STATUSES = ["cancelled", "refused", "returned"];

/**
 * The shareable view behind the signed tracking link. It answers "where is my
 * parcel?" and deliberately stops there: no address, items, or totals, because
 * the link is forwarded over chat.
 */
export function OrderTracker({
  order,
  token,
}: {
  order: TrackingOrder;
  token: string;
}) {
  const { pick } = useI18n();

  const terminal = TERMINAL_STATUSES.includes(order.status);
  const currentIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const times = orderEventTimes(order);
  const status = ORDER_STATUS_LABELS[order.status];
  const terminalAt = formatOrderTimestamp(times.get(order.status));

  return (
    <div className="space-y-8">
      <OrderHeading order={order} />

      <div className="rounded-lg border border-neutral-200 p-4">
        {terminal ? (
          <div>
            <p className="text-base font-semibold">
              {status ? pick(status.mm, status.en) : order.status}
            </p>
            {terminalAt ? (
              <p className="mt-1 text-xs text-neutral-500">{terminalAt}</p>
            ) : null}
            {order.refusal_reason ? (
              <p className="mt-1 text-sm text-neutral-500">
                {pick("အကြောင်းရင်း — ", "Reason — ")}
                {pick(
                  REFUSAL_REASON_LABELS[order.refusal_reason]?.mm ?? "—",
                  REFUSAL_REASON_LABELS[order.refusal_reason]?.en ?? "—",
                )}
              </p>
            ) : null}
          </div>
        ) : (
          <ol className="space-y-3">
            {ORDER_STEPS.map((step, index) => {
              const done = currentIndex >= index;
              const at = done ? formatOrderTimestamp(times.get(step)) : null;
              const label = ORDER_STATUS_LABELS[step];

              return (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-success-500 text-neutral-0" : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className={done ? "font-medium" : "text-neutral-500"}>
                      {label ? pick(label.mm, label.en) : step}
                    </span>
                    {at ? (
                      <span className="block text-xs text-neutral-500">{at}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <PaymentPanel orderNumber={order.order_number} token={token} />

      {order.shipment?.tracking_number ? (
        <div className="rounded-lg bg-neutral-50 p-4 text-sm">
          <p className="font-medium">{pick("ပို့ဆောင်ရေး အမှတ်စဉ်", "Tracking number")}</p>
          <p className="price mt-1">{order.shipment.tracking_number}</p>
          <p className="mt-1 text-xs text-neutral-500">{order.shipment.carrier}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 border-t border-neutral-200 pt-2 text-sm">
        <Link href="/contact" className="inline-flex min-h-11 items-center font-medium underline">
          {pick("အကူအညီ လိုပါသလား? ဆက်သွယ်ရန်", "Need help? Contact us")}
        </Link>
        {order.status === "delivered" ? (
          <Link href="/returns" className="inline-flex min-h-11 items-center text-neutral-500 underline">
            {pick("ပြန်အမ်း / လဲလှယ်ရေး မူဝါဒ", "Returns policy")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
