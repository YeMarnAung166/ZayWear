"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { createOrder } from "@/lib/orders";
import { digitsOnly, MMK } from "@/lib/format";
import type { CustomerAccount, ShopConfig, Township } from "@/lib/types";

export function CheckoutForm({
  townships,
  config,
  account,
}: {
  townships: Township[];
  config: ShopConfig;
  account: CustomerAccount | null;
}) {
  const { t, pick } = useI18n();
  const { lines, subtotal, clear, hydrated } = useCart();
  const router = useRouter();

  const defaultAddress =
    account?.addresses.find((item) => item.is_default) ?? account?.addresses[0] ?? null;

  const [name, setName] = useState(account?.name ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "09");
  const [townshipId, setTownshipId] = useState(
    defaultAddress?.township ? String(defaultAddress.township.id) : "",
  );
  const [address, setAddress] = useState(defaultAddress?.address_line ?? "");
  const [landmark, setLandmark] = useState(defaultAddress?.landmark ?? "");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("cod");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  const township = useMemo(
    () => townships.find((item) => String(item.id) === townshipId) ?? null,
    [townships, townshipId],
  );

  const deliveryFee = township
    ? subtotal >= config.free_delivery_threshold_mmk
      ? 0
      : township.delivery_fee_mmk
    : null;

  const total = subtotal + (deliveryFee ?? 0);

  const grouped = useMemo(() => {
    const map = new Map<string, Township[]>();
    for (const item of townships) {
      map.set(item.region, [...(map.get(item.region) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [townships]);

  if (!hydrated) {
    return <p className="py-16 text-center text-sm text-neutral-500">{t("common.loading")}</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-medium">{t("cart.empty")}</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0">
          {t("cart.empty_cta")}
        </Link>
      </div>
    );
  }

  const validate = (): string | null => {
    if (name.trim().length < 2) {
      return pick("အမည် ထည့်ပါ။", "Please enter your name.");
    }
    if (!/^09[0-9]{7,9}$/.test(phone)) {
      return pick(
        "ဖုန်းနံပါတ်ကို 09 ဖြင့် စတင်၍ ၉ လုံးမှ ၁၁ လုံး ထည့်ပါ။",
        "Phone must start with 09 and contain 9–11 digits.",
      );
    }
    if (!township) {
      return pick("မြို့နယ် ရွေးပါ။", "Please choose your township.");
    }
    if (address.trim().length < 5) {
      return pick("လိပ်စာ ထည့်ပါ။", "Please enter your address.");
    }
    if (landmark.trim().length < 5) {
      return pick(
        "ကုန်းကြောင်းအမှတ်အသား ထည့်ပါ (အနည်းဆုံး ၅ လုံး)။",
        "Please add a landmark (at least 5 characters).",
      );
    }
    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);

    const result = await createOrder(
      {
        customer: { name: name.trim(), phone },
        township_id: township!.id,
        address_line: address.trim(),
        landmark: landmark.trim(),
        note: note.trim() || undefined,
        payment_method: payment,
        items: lines.map((line) => ({ variant_id: line.variantId, qty: line.qty })),
      },
      idempotencyKey.current,
    );

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    window.sessionStorage.setItem(
      "zw_last_order",
      JSON.stringify({
        order_number: result.order.order_number,
        subtotal_mmk: result.order.subtotal_mmk,
        delivery_fee_mmk: result.order.delivery_fee_mmk,
        total_mmk: result.order.total_mmk,
        township_mm: township?.name_mm ?? "",
        township_en: township?.name_en ?? "",
        payment_method: result.order.payment_method,
        tracking_path: result.trackingPath,
        items: lines.map((line) => ({
          name_mm: line.name_mm,
          name_en: line.name_en,
          size: line.size,
          color: line.color,
          qty: line.qty,
          line_total_mmk: line.unitPrice * line.qty,
        })),
      }),
    );

    clear();
    router.push(`/order/${result.order.order_number}/success`);
  };

  return (
    <form onSubmit={submit} className="grid gap-8 md:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            {pick("အမည်", "Full name")}
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            {pick("ဖုန်းနံပါတ်", "Phone")}
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(digitsOnly(event.target.value).slice(0, 11))}
            inputMode="numeric"
            autoComplete="tel-national"
            aria-describedby="phone-help"
            className="price mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          <p id="phone-help" className="mt-1 text-xs text-neutral-500">
            {pick("ဥပမာ — 09 771 234 567", "Example — 09771234567")}
          </p>
        </div>

        <div>
          <label htmlFor="township" className="text-sm font-medium">
            {pick("မြို့နယ်", "Township")}
          </label>
          <select
            id="township"
            value={townshipId}
            onChange={(event) => setTownshipId(event.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="">{pick("— ရွေးပါ —", "— select —")}</option>
            {grouped.map(([region, items]) => (
              <optgroup key={region} label={region}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {pick(item.name_mm, item.name_en)} — {MMK(item.delivery_fee_mmk)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium">
            {pick("လိပ်စာ", "Address")}
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-200 p-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <div>
          <label htmlFor="landmark" className="text-sm font-medium">
            {pick("ကုန်းကြောင်း အမှတ်အသား", "Landmark")} *
          </label>
          <input
            id="landmark"
            value={landmark}
            onChange={(event) => setLandmark(event.target.value)}
            aria-describedby="landmark-help"
            className="mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
          <p id="landmark-help" className="mt-1 text-xs text-neutral-500">
            {pick(
              "ဘုန်းကြီးကျောင်း၊ ဆေးရုံ၊ ဈေး စသည့် အနီးအနား အမှတ်အသား ထည့်ပါ။",
              "Nearest pagoda, hospital, market — anything the courier can find.",
            )}
          </p>
        </div>

        <div>
          <label htmlFor="note" className="text-sm font-medium">
            {pick("မှတ်ချက် (မလိုအပ်)", "Note (optional)")}
          </label>
          <input
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">{pick("ငွေချေမည့်နည်းလမ်း", "Payment method")}</legend>
          <div className="mt-2 space-y-2">
            <label className="flex min-h-12 items-center gap-3 rounded-md border border-neutral-900 px-3 text-sm">
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={payment === "cod"}
                onChange={() => setPayment("cod")}
              />
              <span className="font-medium">{t("common.cod")}</span>
            </label>

            <label
              className={`flex min-h-12 items-center gap-3 rounded-md border border-neutral-200 px-3 text-sm ${
                config.kbzpay_enabled ? "" : "text-neutral-500"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="kbzpay"
                disabled={!config.kbzpay_enabled}
                checked={payment === "kbzpay"}
                onChange={() => setPayment("kbzpay")}
              />
              KBZPay {config.kbzpay_enabled ? "" : pick("(မရသေးပါ)", "(not yet available)")}
            </label>

            <label
              className={`flex min-h-12 items-center gap-3 rounded-md border border-neutral-200 px-3 text-sm ${
                config.wave_enabled ? "" : "text-neutral-500"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="wave"
                disabled={!config.wave_enabled}
                checked={payment === "wave"}
                onChange={() => setPayment("wave")}
              />
              Wave Money {config.wave_enabled ? "" : pick("(မရသေးပါ)", "(not yet available)")}
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-lg border border-neutral-200 bg-neutral-50 p-4 md:sticky md:top-20">
        <h2 className="text-sm font-semibold">{pick("အော်ဒါ အကျဉ်းချုပ်", "Order summary")}</h2>

        <ul className="mt-3 space-y-2 text-xs">
          {lines.map((line) => (
            <li key={line.variantId} className="flex justify-between gap-2">
              <span>
                {pick(line.name_mm, line.name_en)} · {line.size} × {line.qty}
              </span>
              <span className="price whitespace-nowrap">{MMK(line.unitPrice * line.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{t("common.subtotal")}</dt>
            <dd className="price">{MMK(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("common.delivery")}</dt>
            <dd className="price">
              {deliveryFee === null
                ? pick("မြို့နယ် ရွေးပါ", "choose township")
                : deliveryFee === 0
                  ? pick("အခမဲ့", "Free")
                  : MMK(deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
            <dt>{t("common.total")}</dt>
            <dd className="price">{deliveryFee === null ? "—" : MMK(total)}</dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-3 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-500" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 min-h-12 w-full rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
        >
          {submitting ? t("common.loading") : t("common.checkout")}
        </button>

        <p className="mt-2 text-center text-[11px] text-neutral-500">
          {pick(
            "မှာယူပြီးနောက် ၂၄ နာရီအတွင်း ဖုန်းဆက်အတည်ပြုပါမည်။",
            "We will call you within 24 hours to confirm.",
          )}
        </p>
      </aside>
    </form>
  );
}
