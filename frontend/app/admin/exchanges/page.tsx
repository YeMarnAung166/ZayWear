"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

const RESOLUTIONS = ["approved", "rejected", "completed"] as const;

interface Exchange {
  id: number;
  order_id: number;
  order_item_id: number;
  requested_size: string | null;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function AdminExchangesPage() {
  const [tickets, setTickets] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setTickets(await api.get<Exchange[]>("/admin/exchanges"));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(ticketId: number, status: string) {
    await api.patch(`/exchanges/${ticketId}`, { status });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-normal">Exchange Requests</h1>

      {loading ? (
        <p className="text-taupe">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="text-taupe">No exchange requests.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-taupe">
              <th className="py-2">Ticket</th>
              <th className="py-2">Order</th>
              <th className="py-2">New size</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-hairline">
                <td className="py-3">#{ticket.id}</td>
                <td className="py-3">#{ticket.order_id}</td>
                <td className="py-3">{ticket.requested_size}</td>
                <td className="py-3">{ticket.reason}</td>
                <td className="py-3">
                  {ticket.status === "requested" ? (
                    <select
                      defaultValue=""
                      onChange={(event) => resolve(ticket.id, event.target.value)}
                      className="rounded border border-hairline bg-canvas p-1 text-xs"
                    >
                      <option value="" disabled>
                        Resolve…
                      </option>
                      {RESOLUTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    ticket.status
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
