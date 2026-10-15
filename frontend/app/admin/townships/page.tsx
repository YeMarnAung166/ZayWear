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
    await api.patch(`/townships/${township.id}`, {
      ...township,
      shipping_fee: shippingFee,
    });
    load();
  }

  async function toggleCod(township: Township) {
    await api.patch(`/townships/${township.id}`, {
      ...township,
      supports_cod: !township.supports_cod,
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Shipping Rates</h1>

      {loading ? (
        <p className="text-gray-500">Loading townships…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2">Township</th>
              <th className="py-2">Region</th>
              <th className="py-2">Shipping fee</th>
              <th className="py-2">COD</th>
            </tr>
          </thead>
          <tbody>
            {townships.map((township) => (
              <tr key={township.id} className="border-b border-gray-100">
                <td className="py-3">{township.name}</td>
                <td className="py-3">{township.region}</td>
                <td className="py-3">
                  <input
                    type="number"
                    defaultValue={township.shipping_fee}
                    onBlur={(e) =>
                      updateFee(township, Number(e.target.value))
                    }
                    className="w-24 rounded border border-gray-300 p-1 text-xs"
                  />
                </td>
                <td className="py-3">
                  <input
                    type="checkbox"
                    checked={township.supports_cod}
                    onChange={() => toggleCod(township)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
