"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart";
import { LanguageProvider } from "@/lib/i18n";
import { WishlistProvider } from "@/lib/wishlist";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
