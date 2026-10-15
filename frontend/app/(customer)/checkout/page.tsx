"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";

interface Township {
  id: number;
  name: string;
  shipping_fee: string;
  supports_cod: boolean;
}

type PaymentMethod = "kbzpay" | "wavepay" | "cod";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  kbzpay: "KBZPay",
  wavepay: "WavePay",
  cod: "Cash on delivery",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [townships, setTownships] = useState<Township[]>([]);
  const [townshipId, setTownshipId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kbzpay");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cart, setCart] = useState<{ variantId: number; quantity: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("zaywear.cart");
    if (raw) setCart(JSON.parse(raw));
    api
      .get<Township[]>("/townships")
      .then(setTownships)
      .catch(() => setTownships([]));
  }, []);

  const township = townships.find((t) => t.id === townshipId) ?? null;

  async function submitOrder() {
    if (!townshipId) {
      setError("Please select a township.");
      return;
    }
    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<{ id: number }>("/orders", {
        township_id: townshipId,
        payment_method: paymentMethod,
        shipping_address: address,
        phone,
        items: cart.map((line) => ({
          variant_id: line.variantId,
          quantity: line.quantity,
        })),
      });
      window.localStorage.removeItem("zaywear.cart");
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-8 text-2xl font-normal">Checkout</h1>

      <div className="space-y-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded border border-hairline bg-raised p-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Phone
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="09xxxxxxxxx"
            className="w-full rounded border border-hairline bg-raised p-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Township
          </label>
          <select
            value={townshipId ?? ""}
            onChange={(event) => setTownshipId(Number(event.target.value))}
            className="w-full rounded border border-hairline bg-raised p-3 text-sm"
          >
            <option value="" disabled>
              Select township
            </option>
            {townships.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Shipping address
          </label>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={3}
            className="w-full rounded border border-hairline bg-raised p-3 text-sm"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
            Payment method
          </p>
          <div className="space-y-2 text-sm">
            {(["kbzpay", "wavepay", "cod"] as PaymentMethod[]).map((method) => {
              const disabled = method === "cod" && !township?.supports_cod;
              return (
                <label
                  key={method}
                  className={`flex items-center gap-2 ${
                    disabled ? "opacity-40" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    disabled={disabled}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  {PAYMENT_LABELS[method]}
                </label>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={submitOrder}
          disabled={submitting}
          className="w-full rounded bg-soot py-3 text-sm uppercase tracking-[0.08em] text-canvas disabled:opacity-40"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </div>
    </div>
  );
}
