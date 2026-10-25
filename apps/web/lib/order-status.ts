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
