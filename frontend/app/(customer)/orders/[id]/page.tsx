"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { api, uploadSlip } from "@/lib/api";

interface Order {
  id: number;
  status: string;
  payment_method: string;
  subtotal: string;
  shipping_fee: string;
  total: string;
  slip_url: string | null;
  shipping_address: string | null;
  delivered_at: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  kbzpay: "KBZPay",
  wavepay: "WavePay",
  cod: "Cash on delivery",
};

export default function OrderReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Order>(`/orders/${params.id}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [params.id]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadSlip<Order>(order.id, file);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <p className="text-taupe">Loading order…</p>;

  const needsSlip =
    order.payment_method !== "cod" &&
    order.status === "pending" &&
    !order.slip_url;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-normal">Order #{order.id}</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-terracotta">
          {order.status.replace(/_/g, " ")}
        </p>
      </div>

      <dl className="space-y-2 rounded-lg bg-raised p-6 text-sm">
        <div className="flex justify-between">
          <dt className="text-taupe">Payment</dt>
          <dd>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-taupe">Subtotal</dt>
          <dd>{order.subtotal} MMK</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-taupe">Shipping</dt>
          <dd>{order.shipping_fee} MMK</dd>
        </div>
        <div className="flex justify-between border-t border-hairline pt-2 font-medium">
          <dt>Total</dt>
          <dd>{order.total} MMK</dd>
        </div>
      </dl>

      {order.payment_method !== "cod" && (
        <div className="space-y-3 rounded-lg border border-hairline p-6">
          <p className="text-sm font-medium">Payment slip</p>
          {order.slip_url ? (
            <p className="text-xs text-taupe">
              Slip uploaded. Awaiting verification.
            </p>
          ) : (
            <p className="text-xs text-taupe">
              Upload a screenshot of your {PAYMENT_LABELS[order.payment_method]} transfer.
            </p>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFile}
            disabled={busy || !needsSlip}
            className="block w-full text-sm"
          />
          {busy && <p className="text-xs text-taupe">Uploading…</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {order.status === "delivered" && (
        <a
          href={`/exchanges/new?order=${order.id}`}
          className="inline-block rounded border border-soot px-5 py-2 text-sm"
        >
          Request a size exchange
        </a>
      )}
    </div>
  );
}
