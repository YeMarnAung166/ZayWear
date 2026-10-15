export interface CartLine {
  variantId: number;
  quantity: number;
}

const STORAGE_KEY = "zaywear.cart";
export const CART_EVENT = "zaywear:cart";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(variantId: number, quantity = 1): void {
  const cart = readCart();
  const existing = cart.find((line) => line.variantId === variantId);
  if (existing) existing.quantity += quantity;
  else cart.push({ variantId, quantity });
  writeCart(cart);
}

export function cartCount(lines?: CartLine[]): number {
  const cart = lines ?? readCart();
  return cart.reduce((total, line) => total + Math.max(0, line.quantity), 0);
}
