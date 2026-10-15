"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

interface Township {
  id: number;
  name: string;
  region: string | null;
  shipping_fee: number;
  supports_cod: boolean;
}

export default function TownshipsConfigPage() {
  const [townships, setTownships] = useState<Township[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setTownships(await api.get<Township[]>("/townships"));
    } catch {
      setTownships([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateFee(township: Township, shippingFee: number) {
    setBusyId(township.id);
    try {
      await api.patch(`/townships/${township.id}`, {
        ...township,
        shipping_fee: shippingFee,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCod(township: Township) {
    setBusyId(township.id);
    try {
      await api.patch(`/townships/${township.id}`, {
        ...township,
        supports_cod: !township.supports_cod,
      });
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
            Township Rates
          </h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {loading
              ? "Loading…"
              : `${townships.length} townships · edit fees inline`}
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
        <div className="space-y-3">
          {[0, 1, 2, 3].map((key) => (
            <div
              key={key}
              className="h-12 animate-pulse rounded border border-surface-container-highest bg-surface-container-low"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-surface-container-highest">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="border-b border-surface-container-highest">
                <th className="py-3 pl-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Township
                </th>
                <th className="py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Region
                </th>
                <th className="py-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Shipping fee (MMK)
                </th>
                <th className="py-3 pr-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Cash on Delivery
                </th>
              </tr>
            </thead>
            <tbody>
              {townships.map((township) => (
                <tr
                  key={township.id}
                  className="border-b border-surface-container-highest bg-surface-container-low last:border-0 hover:bg-surface-container/60"
                >
                  <td className="py-3 pl-4 font-body-sm font-medium text-primary">
                    {township.name}
                  </td>
                  <td className="py-3 font-body-sm text-on-surface-variant">
                    {township.region ?? "—"}
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      defaultValue={township.shipping_fee}
                      disabled={busyId === township.id}
                      onBlur={(event) => {
                        const next = Number(event.target.value);
                        if (next !== township.shipping_fee) {
                          updateFee(township, next);
                        }
                      }}
                      className="w-32 rounded border border-outline-variant bg-surface px-3 py-1.5 text-body-sm text-primary transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      disabled={busyId === township.id}
                      onClick={() => toggleCod(township)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label-sm font-label-sm uppercase tracking-wider transition-colors disabled:opacity-50 ${
                        township.supports_cod
                          ? "border-[#1b6b34]/30 bg-[#8fd6a3]/30 text-[#0d4d21]"
                          : "border-outline-variant/60 bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {township.supports_cod ? "check_circle" : "cancel"}
                      </span>
                      {township.supports_cod ? "Available" : "Disabled"}
                    </button>
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
