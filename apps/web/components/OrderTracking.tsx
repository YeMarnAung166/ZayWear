"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MMK } from "@/lib/format";
import type { Order } from "@/lib/types";

const STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"] as const;

const LABELS: Record<string, { mm: string; en: string }> = {
  pending: { mm: "မှာယူပြီး", en: "Placed" },
  confirmed: { mm: "အတည်ပြုပြီး", en: "Confirmed" },
  packed: { mm: "ထုပ်ပိုးပြီး", en: "Packed" },
  shipped: { mm: "ပို့ဆောင်နေသည်", en: "Shipped" },
  delivered: { mm: "ရောက်ရှိပြီး", en: "Delivered" },
  cancelled: { mm: "ပယ်ဖျက်ပြီး", en: "Cancelled" },
  refused: { mm: "လက်မခံခဲ့ပါ", en: "Refused" },
  returned: { mm: "ပြန်အမ်းပြီး", en: "Returned" },
};

const REFUSALS: Record<string, { mm: string; en: string }> = {
  wrong_size: { mm: "အရွယ်အစား မကိုက်ညီ", en: "Wrong size" },
  too_expensive: { mm: "ဈေးနှုန်း မတန်ဟု ထင်ခဲ့", en: "Too expensive" },
  did_not_order: { mm: "မှာယူခဲ့ခြင်း မရှိ", en: "Did not order" },
  unreachable: { mm: "ဆက်သွယ်၍ မရ", en: "Could not reach" },
  changed_mind: { mm: "စိတ်ပြောင်းသွား", en: "Changed mind" },
  other: { mm: "အခြား", en: "Other" },
};

export function OrderTracking({ order }: { order: Order }) {
  const { t, pick } = useI18n();

  const terminal = ["cancelled", "refused", "returned"].includes(order.status);
  const currentIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {pick("အော်ဒါ", "Order")}
        </p>
        <h1 className="price text-xl font-bold">{order.order_number}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {pick("မှာယူသည့်ရက်", "Placed")}{" "}
          {order.created_at
            ? new Date(order.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4">
        {terminal ? (
          <div>
            <p className="text-base font-semibold">
              {pick(LABELS[order.status].mm, LABELS[order.status].en)}
            </p>
            {order.refusal_reason ? (
              <p className="mt-1 text-sm text-neutral-500">
                {pick("အကြောင်းရင်း — ", "Reason — ")}
                {pick(
                  REFUSALS[order.refusal_reason]?.mm ?? "—",
                  REFUSALS[order.refusal_reason]?.en ?? "—",
                )}
              </p>
            ) : null}
          </div>
        ) : (
          <ol className="space-y-3">
            {STEPS.map((step, index) => {
              const done = currentIndex >= index;
              return (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-success-500 text-neutral-0" : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={done ? "font-medium" : "text-neutral-500"}>
                    {pick(LABELS[step].mm, LABELS[step].en)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {order.shipment?.tracking_number ? (
        <div className="rounded-lg bg-neutral-50 p-4 text-sm">
          <p className="font-medium">{pick("ပို့ဆောင်ရေး အမှတ်စဉ်", "Tracking number")}</p>
          <p className="price mt-1">{order.shipment.tracking_number}</p>
          <p className="mt-1 text-xs text-neutral-500">{order.shipment.carrier}</p>
        </div>
      ) : null}

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

      {order.status === "delivered" ? (
        <Link href="/returns" className="block min-h-11 rounded-md border border-neutral-900 px-4 py-3 text-center text-sm font-semibold">
          {pick("ပြန်အမ်း / လဲလှယ်ရန်", "Return or exchange")}
        </Link>
      ) : null}
    </div>
  );
}
