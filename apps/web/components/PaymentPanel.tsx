"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { MMK } from "@/lib/format";
import { getOrderPayment, uploadPaymentProof } from "@/lib/orders";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-status";
import type { OrderPayment } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const PROOF_STATUS_LABELS: Record<string, { mm: string; en: string }> = {
  pending: { mm: "စစ်ဆေးနေသည်", en: "Under review" },
  approved: { mm: "အတည်ပြုပြီး", en: "Approved" },
  rejected: { mm: "ပယ်ချပြီး", en: "Rejected" },
};

/**
 * Prepaid transfer instructions and receipt upload, shared by the success page
 * and the tracking page. The signed tracking token authorises both the read and
 * the upload, so the panel never needs an account session.
 */
export function PaymentPanel({
  orderNumber,
  token,
}: {
  orderNumber: string;
  token: string;
}) {
  const { pick } = useI18n();
  const [payment, setPayment] = useState<OrderPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const result = await getOrderPayment(orderNumber, token);
    setPayment(result);
    setLoading(false);
  }, [orderNumber, token]);

  useEffect(() => {
    let active = true;

    getOrderPayment(orderNumber, token).then((result) => {
      if (!active) {
        return;
      }

      setPayment(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [orderNumber, token]);

  if (loading || !payment || !payment.is_prepaid) {
    return null;
  }

  const paid = payment.status === "paid";
  const refunded = payment.status === "refunded";
  const method = PAYMENT_METHOD_LABELS[payment.method];
  const instructions = payment.instructions;

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setNotice(null);

    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      event.target.value = "";
      setError(pick("JPG, PNG သို့မဟုတ် PDF ဖိုင် ရွေးပါ။", "Choose a JPG, PNG, or PDF file."));
      return;
    }

    if (selected.size > MAX_BYTES) {
      setFile(null);
      event.target.value = "";
      setError(pick("ဖိုင် အရွယ်အစား ၅ MB ထက် မကြီးရပါ။", "The file must be 5 MB or smaller."));
      return;
    }

    setFile(selected);
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!file) {
      setError(pick("ပြေစာ ဖိုင် ရွေးပါ။", "Choose a receipt file first."));
      return;
    }

    setUploading(true);
    const result = await uploadPaymentProof(orderNumber, token, file);
    setUploading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setNotice(
      pick(
        "ပြေစာ ရောက်ပါပြီ။ စစ်ဆေးပြီးပါက အတည်ပြုပါမည်။",
        "Receipt received. We will verify it and confirm your order.",
      ),
    );

    await refresh();
  };

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {pick("ကြိုတင်ငွေချေခြင်း", "Prepayment")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {method ? pick(method.mm, method.en) : payment.method} ·{" "}
            <span className="price">{MMK(payment.total_mmk)}</span>
          </p>
        </div>
        <span
          className={`rounded-sm px-2 py-1 text-xs font-semibold ${
            paid
              ? "bg-success-500/10 text-success-500"
              : refunded
                ? "bg-neutral-100 text-neutral-500"
                : "bg-warning-500/10 text-warning-500"
          }`}
        >
          {PAYMENT_STATUS_LABELS[payment.status]
            ? pick(PAYMENT_STATUS_LABELS[payment.status].mm, PAYMENT_STATUS_LABELS[payment.status].en)
            : payment.status}
        </span>
      </div>

      {paid ? (
        <p className="rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-500">
          {pick(
            "ငွေပေးချေမှုကို ရရှိပြီး အတည်ပြုထားပါသည်။",
            "Your payment has been received and verified.",
          )}
        </p>
      ) : refunded ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {pick(
            "ဤအော်ဒါ၏ ငွေကို ပြန်အမ်းပြီးဖြစ်ပါသည်။",
            "This payment has been refunded.",
          )}
        </p>
      ) : (
        <>
          {instructions ? (
            <div className="rounded-md bg-neutral-50 p-3 text-sm">
              <p className="font-medium">
                {pick("ငွေလွှဲရန် အကောင့်", "Transfer to")}
              </p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{pick("အကောင့်နာမည်", "Account name")}</dt>
                  <dd className="text-right font-medium">{instructions.account_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{pick("ဖုန်းနံပါတ်", "Phone")}</dt>
                  <dd className="price text-right font-medium">
                    <a href={`tel:${instructions.phone}`} className="underline">
                      {instructions.phone}
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{pick("မှတ်ချက်", "Reference")}</dt>
                  <dd className="price text-right font-medium">{instructions.reference}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-neutral-500">
                {pick(
                  "ငွေလွှဲသည့်အခါ အော်ဒါနံပါတ်ကို မှတ်ချက်အဖြစ် ရေးပါ။",
                  "Add the order number as the transfer note.",
                )}
              </p>
            </div>
          ) : (
            <p className="rounded-md bg-warning-500/10 px-3 py-2 text-sm text-warning-500">
              {pick(
                "ငွေလွှဲရန် အကောင့် အချက်အလက် မရနိုင်သေးပါ။ ဆက်သွယ်ပါ။",
                "The receiving account is not available yet. Please contact us.",
              )}
            </p>
          )}

          {payment.rejection_reason ? (
            <p className="rounded-md bg-error-500/10 px-3 py-2 text-sm text-error-500">
              {pick("ပြေစာ ပယ်ချခံရသည် — ", "Receipt rejected — ")}
              {payment.rejection_reason}
            </p>
          ) : null}

          {payment.can_upload ? (
            <form onSubmit={upload} className="space-y-2">
              <label htmlFor={`receipt-${payment.method}`} className="text-sm font-medium">
                {pick("ပြေစာ တင်ရန်", "Upload receipt")}
              </label>
              <input
                ref={inputRef}
                id={`receipt-${payment.method}`}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={chooseFile}
                className="block w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
              />
              <p className="text-xs text-neutral-500">
                {pick(
                  "JPG, PNG သို့မဟုတ် PDF · အများဆုံး ၅ MB",
                  "JPG, PNG, or PDF · up to 5 MB",
                )}
              </p>
              <button
                type="submit"
                disabled={uploading || !file}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0 disabled:opacity-60"
              >
                {uploading
                  ? pick("တင်နေသည်…", "Uploading…")
                  : pick("ပြေစာ တင်ရန်", "Upload receipt")}
              </button>
            </form>
          ) : (
            <p className="text-sm text-neutral-500">
              {pick(
                "ဤအော်ဒါအတွက် ပြေစာ တင်၍ မရတော့ပါ။ အကူအညီ လိုပါက ဆက်သွယ်ပါ။",
                "This order can no longer accept a receipt. Contact us if you need help.",
              )}
            </p>
          )}

          {payment.telegram_url ? (
            <a
              href={payment.telegram_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-900 px-4 text-sm font-semibold"
            >
              {pick("Telegram ဖြင့် ပြေစာ ပို့ရန်", "Send the receipt on Telegram")}
            </a>
          ) : null}
        </>
      )}

      {payment.proofs.length > 0 ? (
        <div className="border-t border-neutral-200 pt-3">
          <p className="text-sm font-medium">{pick("တင်ထားသော ပြေစာများ", "Submitted receipts")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {payment.proofs.map((proof) => {
              const label = PROOF_STATUS_LABELS[proof.status];

              return (
                <li key={proof.id} className="flex justify-between gap-3">
                  <span className="text-neutral-500">
                    {proof.source === "telegram" ? "Telegram" : pick("ဝဘ်ဆိုက်", "Website")}
                  </span>
                  <span
                    className={
                      proof.status === "approved"
                        ? "font-medium text-success-500"
                        : proof.status === "rejected"
                          ? "font-medium text-error-500"
                          : "font-medium text-warning-500"
                    }
                  >
                    {label ? pick(label.mm, label.en) : proof.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-md bg-error-500/10 px-3 py-2 text-sm text-error-500">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-500">
          {notice}
        </p>
      ) : null}

      {!paid && !refunded ? (
        <p className="text-xs text-neutral-500">
          {pick(
            "ငွေပေးချေမှု အတည်ပြုပြီးမှ ပစ္စည်း ပို့ဆောင်ပါမည်။",
            "We ship only after the payment is verified.",
          )}{" "}
          <Link href="/contact" className="underline">
            {pick("အကူအညီ", "Need help?")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
