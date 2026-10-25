"use client";

import { formatOrderDate, orderEventTimes } from "@/lib/order-format";
import { useI18n } from "@/lib/i18n";
import type { TrackingEvent } from "@/lib/types";

type OrderHeadingData = {
  order_number: string;
  created_at: string | null;
  events?: TrackingEvent[];
};

export function OrderHeading({ order }: { order: OrderHeadingData }) {
  const { pick } = useI18n();
  const placedAt = formatOrderDate(orderEventTimes(order).get("pending") ?? order.created_at);

  return (
    <div>
      <p className="text-xs text-neutral-500">{pick("အော်ဒါ", "Order")}</p>
      <h1 className="price text-xl font-bold">{order.order_number}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {pick("မှာယူသည့်ရက်", "Placed")} {placedAt ?? "—"}
      </p>
    </div>
  );
}
