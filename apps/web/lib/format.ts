export const MMK = (value: number): string =>
  `${new Intl.NumberFormat("en-US").format(Math.round(value))} MMK`;

export const imageUrl = (path: string): string => {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE ?? "/mock";
  return `${base}/${path}`;
};

export const telegramLink = (
  bot: string,
  productId?: number,
  size?: string | null,
): string => {
  if (!productId) {
    return `https://t.me/${bot}`;
  }

  const payload = size
    ? `product_${productId}_size_${size}`
    : `product_${productId}`;

  return `https://t.me/${bot}?start=${payload}`;
};

export const errorMessage = (errors: unknown): string => {
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") {
      return first[0];
    }
  }
  return "";
};

export const digitsOnly = (value: string): string =>
  value.replace(/[^0-9]/g, "");
