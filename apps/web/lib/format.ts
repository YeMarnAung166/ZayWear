export const MMK = (value: number): string =>
  `${new Intl.NumberFormat("en-US").format(Math.round(value))} MMK`;

export const imageUrl = (path: string): string => {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE ?? "/mock";
  return `${base}/${path}`;
};

export const telegramLink = (bot: string, productId?: number): string =>
  productId
    ? `https://t.me/${bot}?start=product_${productId}`
    : `https://t.me/${bot}`;

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
