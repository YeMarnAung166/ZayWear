"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

const STATUSES = [
  "pending",
  "slip_uploaded",
  "pending_cod",
  "paid",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

interface Order {
  id: number;
  status: string;
  payment_method: string;
  total: number;
  phone: string | null;
  created_at: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.get<Order[]>("/admin/orders"));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId: number, status: string) {
    await api.patch(`/admin/orders/${orderId}/status`, { status });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Orders & Fulfillment</h1>

      {loading ? (
        <p className="text-gray-500">Loading orders…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2">Order</th>
              <th className="py-2">Payment</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Total</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-100">
                <td className="py-3">#{order.id}</td>
                <td className="py-3">{order.payment_method}</td>
                <td className="py-3">{order.phone}</td>
                <td className="py-3">{order.total}</td>
                <td className="py-3">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="rounded border border-gray-300 p-1 text-xs"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
