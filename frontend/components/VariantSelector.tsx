"use client";

import type { ReactNode } from "react";

export interface Variant {
  id: number;
  size: string;
  color: string;
  stock_quantity: number;
  price_delta: string;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId: number | null;
  onChange: (variant: Variant) => void;
  sizeChart?: ReactNode;
}

const COLOR_HEX: Record<string, string> = {
  ivory: "#FAF9F6",
  cream: "#F1E9DA",
  beige: "#E4D8C4",
  sand: "#D6C4AD",
  stone: "#C7C1B6",
  taupe: "#8C7A6B",
  brown: "#6F5A48",
  charcoal: "#2E2E2E",
  black: "#141414",
  navy: "#2B3A55",
  olive: "#555D42",
  moss: "#555D42",
  green: "#3F5A46",
  blue: "#3A5A80",
  grey: "#9AA0A0",
  gray: "#9AA0A0",
  terracotta: "#B85D43",
  rust: "#99452D",
};

function colorToHex(name: string): string {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  for (const [token, hex] of Object.entries(COLOR_HEX)) {
    if (key.includes(token)) return hex;
  }
  return "#D8CFC0";
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onChange,
  sizeChart,
}: VariantSelectorProps) {
  const sizes = Array.from(new Set(variants.map((v) => v.size)));
  const colors = Array.from(new Set(variants.map((v) => v.color)));
  const selected = variants.find((v) => v.id === selectedVariantId) ?? null;

  const findVariant = (size: string, color: string) =>
    variants.find((v) => v.size === size && v.color === color);

  return (
    <div>
      <div className="mt-space-lg">
        <span className="text-label-md font-label-md uppercase tracking-wider text-primary">
          Color:{" "}
          <span className="font-normal normal-case text-on-surface-variant">
            {selected?.color ?? "—"}
          </span>
        </span>
        <div className="mt-3 flex items-center gap-3">
          {colors.map((color) => {
            const active = selected?.color === color;
            return (
              <button
                key={color}
                type="button"
                aria-label={color}
                title={color}
                onClick={() => {
                  const next = findVariant(selected?.size ?? sizes[0], color);
                  if (next) onChange(next);
                }}
                style={{ backgroundColor: colorToHex(color) }}
                className={`h-8 w-8 rounded-full border border-outline transition-all ${
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : "hover:ring-2 hover:ring-outline hover:ring-offset-2 hover:ring-offset-surface"
                }`}
              >
                <span className="sr-only">{color}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-space-lg">
        <div className="flex items-center justify-between">
          <span className="text-label-md font-label-md uppercase tracking-wider text-primary">
            Size:{" "}
            <span className="font-normal normal-case text-on-surface-variant">
              {selected?.size ?? "—"}
            </span>
          </span>
          {sizeChart}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {sizes.map((size) => {
            const candidate = findVariant(size, selected?.color ?? colors[0]);
            const soldOut = !candidate || candidate.stock_quantity <= 0;
            const active = selected?.size === size;
            return (
              <button
                key={size}
                type="button"
                disabled={soldOut}
                onClick={() => candidate && onChange(candidate)}
                className={`flex h-12 flex-col items-center justify-center rounded-lg border transition-all ${
                  active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-surface-container-highest text-primary hover:border-primary"
                } ${soldOut ? "cursor-not-allowed opacity-40" : ""}`}
              >
                <span className="text-body-md font-body-md font-medium">
                  {size}
                </span>
                {soldOut && <span className="text-[9px]">Sold out</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
