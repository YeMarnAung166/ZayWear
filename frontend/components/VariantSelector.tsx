"use client";

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
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onChange,
}: VariantSelectorProps) {
  const sizes = Array.from(new Set(variants.map((v) => v.size)));
  const colors = Array.from(new Set(variants.map((v) => v.color)));
  const selected = variants.find((v) => v.id === selectedVariantId) ?? null;

  const findVariant = (size: string, color: string) =>
    variants.find((v) => v.size === size && v.color === color);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-taupe">
          Size
        </p>
        <div className="flex flex-wrap gap-2">
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
                className={`rounded border px-4 py-2 text-sm transition ${
                  active
                    ? "border-soot bg-soot text-canvas"
                    : "border-hairline disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-taupe">
          Color
        </p>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => {
            const active = selected?.color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => {
                  const next = findVariant(selected?.size ?? sizes[0], color);
                  if (next) onChange(next);
                }}
                className={`rounded-full border px-4 py-1 text-sm ${
                  active ? "border-soot" : "border-hairline"
                }`}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
