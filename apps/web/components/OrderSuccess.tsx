"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentPanel } from "@/components/PaymentPanel";
import { useI18n } from "@/lib/i18n";
import { MMK } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/order-status";

type Snapshot = {
  order_number: string;
  subtotal_mmk: number;
  delivery_fee_mmk: number;
  total_mmk: number;
  township_mm: string;
  township_en: string;
  payment_method: string;
  tracking_path: string;
  items: {
    name_mm: string;
    name_en: string;
    size: string;
    color: string;
    qty: number;
    line_total_mmk: number;
  }[];
};

export function OrderSuccess({ orderNumber }: { orderNumber: string }) {
  const { t, pick } = useI18n();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTrackingLink = async () => {
    if (!snapshot) {
      return;
    }

    const url = `${window.location.origin}${snapshot.tracking_path}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(pick("လင့်ကို ကော်ပီ လုပ်ပါ", "Copy this link"), url);
    }
  };

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("zw_last_order");
      if (raw) {
        const parsed = JSON.parse(raw) as Snapshot;
        if (parsed.order_number === orderNumber) {
          // Reading the order snapshot after mount keeps SSR and client markup in sync.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSnapshot(parsed);
        }
      }
    } catch {
      setSnapshot(null);
    }
    setReady(true);
  }, [orderNumber]);

  if (!ready) {
    return <p className="py-16 text-center text-sm text-neutral-500">{t("common.loading")}</p>;
  }

  const prepaid = snapshot ? snapshot.payment_method !== "cod" : false;
  const trackingToken = snapshot
    ? (snapshot.tracking_path.split("/").filter(Boolean).pop() ?? "")
    : "";
  const paymentMethod = snapshot ? PAYMENT_METHOD_LABELS[snapshot.payment_method] : null;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div className="rounded-lg bg-success-500/10 p-5 text-center">
        <p className="text-sm font-medium text-success-500">
          {pick("မှာယူမှု အောင်မြင်ပါသည်", "Order received")}
        </p>
        <p className="price mt-2 text-2xl font-bold">{orderNumber}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {prepaid
            ? pick(
                "ငွေလွှဲပြီး ပြေစာ တင်ပေးပါ။ စစ်ဆေးအတည်ပြုပြီးမှ ပို့ဆောင်ပါမည်။",
                "Transfer the total and upload your receipt. We ship once the payment is verified.",
              )
            : pick(
                "၂၄ နာရီအတွင်း ဖုန်းဆက်၍ အတည်ပြုပါမည်။",
                "We will call you within 24 hours to confirm.",
              )}
        </p>
      </div>

      {snapshot && trackingToken && prepaid ? (
        <PaymentPanel orderNumber={orderNumber} token={trackingToken} />
      ) : null}

      {snapshot ? (
        <>
          <dl className="space-y-2 rounded-lg border border-neutral-200 p-4 text-sm">
            {snapshot.items.map((item, index) => (
              <div key={`${item.size}-${index}`} className="flex justify-between gap-3">
                <dt>
                  {pick(item.name_mm, item.name_en)}
                  <span className="block text-xs text-neutral-500">
                    {item.size} · {item.color} × {item.qty}
                  </span>
                </dt>
                <dd className="price whitespace-nowrap">{MMK(item.line_total_mmk)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-neutral-200 pt-2">
              <dt>{t("common.delivery")}</dt>
              <dd className="price">
                {snapshot.delivery_fee_mmk === 0
                  ? pick("အခမဲ့", "Free")
                  : MMK(snapshot.delivery_fee_mmk)}
              </dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>{t("common.total")}</dt>
              <dd className="price">{MMK(snapshot.total_mmk)}</dd>
            </div>
            <p className="text-xs text-neutral-500">
              {pick(snapshot.township_mm, snapshot.township_en)} ·{" "}
              {paymentMethod
                ? pick(paymentMethod.mm, paymentMethod.en)
                : snapshot.payment_method}
            </p>
          </dl>

          <div className="rounded-lg bg-neutral-50 p-4 text-sm">
            <p className="font-medium">{pick("ဤလင့်ကို သိမ်းထားပါ", "Save this link")}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {pick(
                "အော်ဒါ အခြေအနေ ပြန်ကြည့်ရန် လင့်ကို ကော်ပီ လုပ်ပြီး သိမ်းထားပါ။",
                "Copy the tracking link so you can check this order later.",
              )}
            </p>
            <button
              type="button"
              onClick={copyTrackingLink}
              className="mt-3 inline-flex min-h-11 items-center rounded-md border border-neutral-900 px-4 text-sm font-semibold"
            >
              {copied
                ? pick("ကော်ပီ ပြီးပါပြီ", "Copied")
                : pick("လင့် ကော်ပီ လုပ်ရန်", "Copy tracking link")}
            </button>
          </div>

          <Link
            href={snapshot.tracking_path}
            className="flex min-h-12 items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
          >
            {pick("အော်ဒါ အခြေအနေ ကြည့်ရန်", "Track this order")}
          </Link>
        </>
      ) : (
        <p className="text-center text-sm text-neutral-500">
          {pick(
            "အခြေအနေ ကြည့်ရန် သင့်ထံ ပေးပို့ထားသော tracking လင့်ကို အသုံးပြုပါ။",
            "Use the tracking link we sent you to follow this order.",
          )}
        </p>
      )}

      <Link href="/" className="block text-center text-sm underline">
        {pick("ဆက်လက် ဝယ်ယူရန်", "Continue shopping")}
      </Link>
    </div>
  );
}
