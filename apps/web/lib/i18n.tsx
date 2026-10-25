"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "./types";

const dictionary = {
  my: {
    "nav.home": "ပင်မ",
    "nav.men": "အမျိုးသား",
    "nav.women": "အမျိုးသမီး",
    "nav.cart": "ဈေးတောင်း",
    "nav.search": "ရှာဖွေ",
    "nav.account": "အကောင့်",
    "nav.categories": "အမျိုးအစား",
    "common.order_telegram": "Telegram ဖြင့် မှာယူရန်",
    "common.add_to_cart": "ဈေးတောင်းထဲ ထည့်ရန်",
    "common.size_guide": "အရွယ်အစား လမ်းညွှန်",
    "common.size": "အရွယ်အစား",
    "common.color": "အရောင်",
    "common.quantity": "အရေအတွက်",
    "common.cod": "ပစ္စည်းရောက်မှ ငွေချေ",
    "common.in_stock": "လက်ကျန်ရှိ",
    "common.out_of_stock": "ပြတ်နေသည်",
    "common.low_stock": "လက်ကျန်နည်း",
    "common.loading": "ခဏစောင့်ပါ…",
    "common.continue": "ဆက်လုပ်ရန်",
    "common.back": "နောက်သို့",
    "common.checkout": "မှာယူရန်",
    "common.subtotal": "ကုန်ပစ္စည်း စုစုပေါင်း",
    "common.delivery": "ပို့ဆောင်ခ",
    "common.total": "စုစုပေါင်း",
    "common.close": "ပိတ်",
    "footer.returns": "ပြန်အမ်းမူဝါဒ",
    "footer.terms": "စည်းကမ်းချက်များ",
    "footer.privacy": "ကိုယ်ရေးအချက်အလက်",
    "footer.contact": "ဆက်သွယ်ရန်",
    "footer.payment": "ငွေပေးချေမှု",
    "footer.comingSoon": "မကြာမီ",
    "cart.empty": "ဈေးတောင်းထဲ ဘာမှမရှိပါ။",
    "cart.empty_cta": "ပစ္စည်းများ ကြည့်ရန်",
    "offline": "အင်တာနက် မချိတ်ဆက်ထားပါ။ ချိတ်ဆက်ပြီးမှ ထပ်စမ်းပါ။",
  },
  en: {
    "nav.home": "Home",
    "nav.men": "Men",
    "nav.women": "Women",
    "nav.cart": "Cart",
    "nav.search": "Search",
    "nav.account": "Account",
    "nav.categories": "Categories",
    "common.order_telegram": "Order via Telegram",
    "common.add_to_cart": "Add to cart",
    "common.size_guide": "Size guide",
    "common.size": "Size",
    "common.color": "Colour",
    "common.quantity": "Quantity",
    "common.cod": "Cash on delivery",
    "common.in_stock": "In stock",
    "common.out_of_stock": "Out of stock",
    "common.low_stock": "Low stock",
    "common.loading": "One moment…",
    "common.continue": "Continue",
    "common.back": "Back",
    "common.checkout": "Place order",
    "common.subtotal": "Subtotal",
    "common.delivery": "Delivery",
    "common.total": "Total",
    "common.close": "Close",
    "footer.returns": "Returns",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.contact": "Contact",
    "footer.payment": "Payment",
    "footer.comingSoon": "coming soon",
    "cart.empty": "Your cart is empty.",
    "cart.empty_cta": "Browse products",
    "offline": "You are offline. Reconnect and try again.",
  },
} as const;

type TranslationKey = keyof typeof dictionary.en;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  pick: (mm: string, en: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("my");

  useEffect(() => {
    const stored = window.localStorage.getItem("zw_locale");
    if (stored === "my" || stored === "en") {
      // Reading persisted UI state after mount keeps SSR and client markup in sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
      document.documentElement.lang = stored === "my" ? "my" : "en";
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("zw_locale", next);
    document.documentElement.lang = next === "my" ? "my" : "en";
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => dictionary[locale][key],
      pick: (mm, en) => (locale === "my" ? mm : en),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }
  return context;
}
