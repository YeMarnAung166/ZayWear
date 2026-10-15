"use client";

import { useState } from "react";

interface SizeRow {
  size: string;
  chest: string;
  length: string;
  shoulder: string;
}

interface SizeChartModalProps {
  rows?: SizeRow[];
}

const DEFAULT_ROWS: SizeRow[] = [
  { size: "S", chest: '42" / 106 cm', length: '28" / 71 cm', shoulder: '19" / 48 cm' },
  { size: "M", chest: '45" / 114 cm', length: '29" / 73 cm', shoulder: '20" / 51 cm' },
  { size: "L", chest: '48" / 122 cm', length: '30" / 76 cm', shoulder: '21" / 53 cm' },
  { size: "XL", chest: '51" / 129 cm', length: '31" / 79 cm', shoulder: '22" / 56 cm' },
];

export default function SizeChartModal({ rows = DEFAULT_ROWS }: SizeChartModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-label-md font-label-md text-primary underline decoration-outline-variant underline-offset-4 transition-colors hover:text-secondary"
      >
        <span className="material-symbols-outlined text-[16px]">straighten</span>
        View size chart
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Size chart"
        >
          <div
            className="fixed inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="flex w-screen max-w-lg flex-col overflow-y-auto border-l border-surface-container-highest bg-surface p-space-lg shadow-2xl">
              <div className="flex items-center justify-between border-b border-surface-container-highest pb-space-md">
                <div>
                  <span className="text-label-sm font-label-sm font-semibold uppercase tracking-widest text-secondary">
                    Atelier Fitting Guide
                  </span>
                  <h3 className="mt-1 font-headline-md text-headline-md text-primary">
                    Sizing Chart
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="p-2 text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[24px]">
                    close
                  </span>
                </button>
              </div>

              <div className="mt-space-md">
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  All garments are laid flat and measured in inches with
                  centimetre conversions. Because each piece is cut from natural
                  fibre, a slight variance (+/- 0.5&quot;) honours the artisanal
                  process.
                </p>

                <div className="mt-space-md overflow-x-auto border border-surface-container-highest">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead className="border-b border-surface-container-highest bg-surface-container-low text-label-md font-label-md uppercase tracking-wider text-primary">
                      <tr>
                        <th className="px-3 py-2.5">Size</th>
                        <th className="px-3 py-2.5">Chest</th>
                        <th className="px-3 py-2.5">Length</th>
                        <th className="px-3 py-2.5">Shoulder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-highest">
                      {rows.map((row) => (
                        <tr
                          key={row.size}
                          className="transition-colors hover:bg-surface-container-low"
                        >
                          <td className="px-3 py-2.5 font-medium text-primary">
                            {row.size}
                          </td>
                          <td className="px-3 py-2.5">{row.chest}</td>
                          <td className="px-3 py-2.5">{row.length}</td>
                          <td className="px-3 py-2.5">{row.shoulder}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-space-lg rounded-lg border border-surface-container-highest bg-surface-container-low p-space-md">
                  <h4 className="text-label-md font-label-md font-semibold uppercase tracking-wider text-primary">
                    How to choose for Myanmar weather
                  </h4>
                  <p className="mt-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                    In Yangon and Mandalay heat, a generous oversized fit
                    encourages natural air circulation. Choose your true chest
                    size for an authentic editorial drape, or size down for a
                    more structured look.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
