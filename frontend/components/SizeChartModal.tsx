"use client";

import { useState } from "react";

interface SizeChartModalProps {
  rows?: { size: string; chest: string; length: string }[];
}

const DEFAULT_ROWS = [
  { size: "S", chest: "88 cm", length: "68 cm" },
  { size: "M", chest: "94 cm", length: "70 cm" },
  { size: "L", chest: "100 cm", length: "72 cm" },
  { size: "XL", chest: "106 cm", length: "74 cm" },
];

export default function SizeChartModal({ rows = DEFAULT_ROWS }: SizeChartModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm underline underline-offset-4"
      >
        View size chart
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-soot/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-canvas p-6 shadow-[0_8px_30px_rgba(31,31,31,0.08)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Size Chart</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm">
                Close
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-taupe">
                  <th className="py-2 font-semibold uppercase tracking-[0.08em]">Size</th>
                  <th className="py-2 font-semibold uppercase tracking-[0.08em]">Chest</th>
                  <th className="py-2 font-semibold uppercase tracking-[0.08em]">Length</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.size} className="border-b border-hairline last:border-0">
                    <td className="py-2">{row.size}</td>
                    <td className="py-2">{row.chest}</td>
                    <td className="py-2">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
