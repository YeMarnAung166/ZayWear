"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";

interface OrderItem {
  id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
}
interface Order {
  id: number;
  status: string;
  items: OrderItem[];
}

export default function NewExchangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  const [order, setOrder] = useState<Order | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [requestedSize, setRequestedSize] = useState("M");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api
      .get<Order>(`/orders/${orderId}`)
      .then((data) => {
        setOrder(data);
        setItemId(data.items[0]?.id ?? null);
      })
      .catch(() => setOrder(null));
  }, [orderId]);

  async function submit() {
    if (!itemId) {
      setError("Select an item to exchange.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/exchanges", {
        order_item_id: itemId,
        requested_size: requestedSize,
        reason,
      });
      router.push("/my-orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open exchange");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-2xl font-normal">Request a size exchange</h1>
      <p className="mb-6 text-sm text-taupe">
        Exchanges are available within 3 days of delivery.
      </p>

      {!order ? (
        <p className="text-taupe">Loading order…</p>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              Item
            </label>
            <select
              value={itemId ?? ""}
              onChange={(event) => setItemId(Number(event.target.value))}
              className="w-full rounded border border-hairline bg-raised p-3 text-sm"
            >
              {order.items.map((item) => (
                <option key={item.id} value={item.id}>
                  Item #{item.id} (variant {item.variant_id}) × {item.quantity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              Requested size
            </label>
            <select
              value={requestedSize}
              onChange={(event) => setRequestedSize(event.target.value)}
              className="w-full rounded border border-hairline bg-raised p-3 text-sm"
            >
              {["S", "M", "L", "XL"].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-taupe">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="w-full rounded border border-hairline bg-raised p-3 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full rounded bg-soot py-3 text-sm uppercase tracking-[0.08em] text-canvas disabled:opacity-40"
          >
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}
    </div>
  );
}
