export const ORDER_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"] as const;

export type OrderStep = (typeof ORDER_STEPS)[number];

export const ORDER_STATUS_LABELS: Record<string, { mm: string; en: string }> = {
  pending: { mm: "မှာယူပြီး", en: "Placed" },
  confirmed: { mm: "အတည်ပြုပြီး", en: "Confirmed" },
  packed: { mm: "ထုပ်ပိုးပြီး", en: "Packed" },
  shipped: { mm: "ပို့ဆောင်နေသည်", en: "Shipped" },
  delivered: { mm: "ရောက်ရှိပြီး", en: "Delivered" },
  cancelled: { mm: "ပယ်ဖျက်ပြီး", en: "Cancelled" },
  refused: { mm: "လက်မခံခဲ့ပါ", en: "Refused" },
  returned: { mm: "ပြန်အမ်းပြီး", en: "Returned" },
};

export const ORDER_STATUS_TONES: Record<string, string> = {
  pending: "bg-warning-500/10 text-warning-500",
  packed: "bg-warning-500/10 text-warning-500",
  shipped: "bg-warning-500/10 text-warning-500",
  delivered: "bg-success-500/10 text-success-500",
  cancelled: "bg-error-500/10 text-error-500",
  refused: "bg-error-500/10 text-error-500",
  returned: "bg-neutral-50 text-neutral-500",
};

export const REFUSAL_REASON_LABELS: Record<string, { mm: string; en: string }> = {
  wrong_size: { mm: "အရွယ်အစား မကိုက်ညီ", en: "Wrong size" },
  too_expensive: { mm: "ဈေးနှုန်း မတန်ဟု ထင်ခဲ့", en: "Too expensive" },
  did_not_order: { mm: "မှာယူခဲ့ခြင်း မရှိ", en: "Did not order" },
  unreachable: { mm: "ဆက်သွယ်၍ မရ", en: "Could not reach" },
  changed_mind: { mm: "စိတ်ပြောင်းသွား", en: "Changed mind" },
  other: { mm: "အခြား", en: "Other" },
};

export const PAYMENT_METHOD_LABELS: Record<string, { mm: string; en: string }> = {
  cod: { mm: "ပစ္စည်းရောက်မှ ငွေချေ", en: "Cash on delivery" },
  kbzpay: { mm: "KBZPay", en: "KBZPay" },
  wave: { mm: "Wave Money", en: "Wave Money" },
};

export const PAYMENT_STATUS_LABELS: Record<string, { mm: string; en: string }> = {
  unpaid: { mm: "မပေးရသေးပါ", en: "Unpaid" },
  paid: { mm: "ပေးချေပြီး", en: "Paid" },
  refunded: { mm: "ပြန်အမ်းပြီး", en: "Refunded" },
};
