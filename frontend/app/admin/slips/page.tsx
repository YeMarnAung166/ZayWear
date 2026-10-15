"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

interface Order {
  id: number;
  total: number;
  slip_url: string | null;
  created_at: string;
}

export default function SlipVerificationPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.get<Order[]>("/admin/slips"));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(orderId: number, approve: boolean) {
    await api.post(`/admin/orders/${orderId}/verify`, { approve });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Bank Slip Verification</h1>

      {loading ? (
        <p className="text-gray-500">Loading queue…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">No slips awaiting verification.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <p className="text-sm font-medium">Order #{order.id}</p>
                <p className="text-xs text-gray-500">{order.created_at}</p>
                <a
                  href={order.slip_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  View slip
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(order.id, true)}
                  className="rounded-full bg-green-600 px-4 py-1 text-sm text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide(order.id, false)}
                  className="rounded-full bg-red-600 px-4 py-1 text-sm text-white"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
