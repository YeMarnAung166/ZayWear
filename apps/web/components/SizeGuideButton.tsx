"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { SizeChart } from "@/lib/types";

export function SizeGuideButton({ chart }: { chart: SizeChart | null }) {
  const { t, pick } = useI18n();
  const [open, setOpen] = useState(false);

  if (!chart) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-telegram-700 underline underline-offset-2"
      >
        {t("common.size_guide")}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={pick(chart.title_mm, chart.title_en)}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-t-lg bg-neutral-0 p-4 sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{pick(chart.title_mm, chart.title_en)}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 px-2 text-sm text-neutral-500"
              >
                {t("common.close")}
              </button>
            </div>

            <p className="mt-1 text-xs text-neutral-500">
              {pick("တိုင်းတာမှု — စင်တီမီတာ / လက်မ", "Measurements — cm / in")}
            </p>

            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="py-2 pr-2 font-semibold">{t("common.size")}</th>
                  <th className="py-2 pr-2 font-semibold">Chest</th>
                  <th className="py-2 pr-2 font-semibold">Waist</th>
                  <th className="py-2 font-semibold">Length</th>
                </tr>
              </thead>
              <tbody className="price">
                {chart.rows.map((row) => (
                  <tr key={String(row.size)} className="border-b border-neutral-200 last:border-0">
                    <td className="py-2 pr-2 font-semibold">{row.size}</td>
                    <td className="py-2 pr-2">
                      {row.chest_cm} / {row.chest_in}
                    </td>
                    <td className="py-2 pr-2">
                      {row.waist_cm} / {row.waist_in}
                    </td>
                    <td className="py-2">
                      {row.length_cm} / {row.length_in}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
