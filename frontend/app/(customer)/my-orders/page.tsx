"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";

interface Order {
  id: number;
  status: string;
  total: number;
  created_at: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/orders")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return <p className="text-gray-500">You have no orders yet.</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">My Orders</h1>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">Order #{order.id}</p>
                <p className="text-xs text-gray-500">{order.created_at}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{order.total}</p>
                <p className="text-xs uppercase text-gray-500">{order.status}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
