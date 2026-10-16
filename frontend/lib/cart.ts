export interface CartSnapshot {
  productId: number;
  name: string;
  size: string;
  color: string;
  unitPrice: number;
  imageUrl: string | null;
}

export interface CartLine {
  variantId: number;
  quantity: number;
  snapshot?: CartSnapshot;
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

export function writeCart(lines: CartLine[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    window.dispatchEvent(new Event(CART_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CART_EVENT));
  } catch {
    return;
  }
}

export function addToCart(
  variantId: number,
  quantity = 1,
  snapshot?: CartSnapshot,
): boolean {
  const cart = readCart();
  const existing = cart.find((line) => line.variantId === variantId);
  if (existing) {
    existing.quantity += quantity;
    if (snapshot) existing.snapshot = snapshot;
  } else {
    cart.push({ variantId, quantity, snapshot });
  }
  return writeCart(cart);
}

export function cartCount(lines?: CartLine[]): number {
  const cart = lines ?? readCart();
  return cart.reduce((total, line) => total + Math.max(0, line.quantity), 0);
}
