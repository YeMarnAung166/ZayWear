"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

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
  const [busyId, setBusyId] = useState<number | null>(null);

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
    setBusyId(ticketId);
    try {
      await api.patch(`/exchanges/${ticketId}`, { status });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-space-md flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Exchange Requests
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {loading
              ? "Loading…"
              : `${tickets.length} ${tickets.length === 1 ? "request" : "requests"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded border border-primary px-4 py-2 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[16px]">
            refresh
          </span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-20 animate-pulse rounded border border-surface-container-highest bg-surface-container-low"
            />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <section className="flex flex-col items-center rounded border border-surface-container-highest bg-surface-container-low py-space-xl text-center">
          <div className="mb-space-sm flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[28px]">
              swap_horiz
            </span>
          </div>
          <p className="font-body-lg text-body-lg text-primary">
            No exchange requests
          </p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded border border-surface-container-highest bg-surface-container-low">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-surface-container-highest">
                <th className="py-3 pl-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Ticket
                </th>
                <th className="py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Order
                </th>
                <th className="py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Requested size
                </th>
                <th className="py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Reason
                </th>
                <th className="py-3 pr-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-surface-container-highest last:border-0 hover:bg-surface-container/60"
                >
                  <td className="py-3 pl-4 font-body-sm font-medium text-primary">
                    #{String(ticket.id).padStart(4, "0")}
                  </td>
                  <td className="py-3 font-body-sm text-on-surface-variant">
                    #{ticket.order_id}
                  </td>
                  <td className="py-3 font-body-sm text-on-surface-variant">
                    {ticket.requested_size ?? "—"}
                  </td>
                  <td className="max-w-[220px] py-3 font-body-sm text-on-surface-variant">
                    {ticket.reason ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {ticket.status === "requested" ? (
                      <div className="relative inline-block">
                        <select
                          defaultValue=""
                          disabled={busyId === ticket.id}
                          onChange={(event) =>
                            resolve(ticket.id, event.target.value)
                          }
                          className="appearance-none rounded border border-outline-variant bg-surface px-3 py-1.5 pr-8 text-label-sm font-label-sm uppercase tracking-wider text-primary transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
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
                        <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1.5 text-[16px] text-on-surface-variant">
                          expand_more
                        </span>
                      </div>
                    ) : (
                      <StatusBadge status={ticket.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
