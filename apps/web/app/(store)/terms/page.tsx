import { PolicyView, type PolicySection } from "@/components/PolicyView";

const sections: PolicySection[] = [
  {
    heading_mm: "အော်ဒါ အတည်ပြုခြင်း",
    heading_en: "Order confirmation",
    body_mm:
      "အော်ဒါ တင်သွင်းပြီးနောက် ၂၄ နာရီအတွင်း ဖုန်းဖြင့် အတည်ပြုပါမည်။ ဆက်သွယ်၍ မရပါက အော်ဒါကို ပယ်ဖျက်နိုင်ပါသည်။",
    body_en:
      "We call to confirm every order within 24 hours. If we cannot reach you, the order may be cancelled.",
  },
  {
    heading_mm: "ဈေးနှုန်းနှင့် ပို့ဆောင်ခ",
    heading_en: "Prices and delivery",
    body_mm:
      "ဈေးနှုန်းများကို ကျပ် (MMK) ဖြင့် ဖော်ပြထားပါသည်။ ပို့ဆောင်ခကို မြို့နယ်အလိုက် တွက်ချက်ပြီး ငွေချေသည့်အဆင့်တွင် ပြသပါသည်။ ပစ္စည်း စုစုပေါင်း ၈၀,၀၀၀ ကျပ် အထက်တွင် ပို့ဆောင်ခ အခမဲ့ ဖြစ်ပါသည်။",
    body_en:
      "Prices are in Myanmar Kyat (MMK). Delivery is calculated by township and shown at checkout. Delivery is free on subtotals over 80,000 MMK.",
  },
  {
    heading_mm: "ငွေချေခြင်း",
    heading_en: "Payment",
    body_mm:
      "ပစ္စည်းရောက်မှ ငွေချေ (COD)၊ KBZPay သို့မဟုတ် Wave Money ဖြင့် ငွေချေနိုင်ပါသည်။ KBZPay/Wave ဖြင့် မှာယူပါက အော်ဒါစာမျက်နှာတွင် ပြထားသော အကောင့်သို့ ကြိုတင်ငွေလွှဲပြီး ပြေစာကို တင်ပေးရပါမည်။ ငွေပေးချေမှုကို စစ်ဆေးအတည်ပြုပြီးမှ ပစ္စည်း ပို့ဆောင်ပါမည်။",
    body_en:
      "You can pay cash on delivery, or prepay by KBZPay or Wave Money. For prepaid orders, transfer to the account shown on the order page and upload the receipt. We dispatch only after the payment is verified.",
  },
  {
    heading_mm: "ပယ်ဖျက်ခြင်း",
    heading_en: "Cancellation",
    body_mm:
      "ပစ္စည်း မပို့မီ အချိန်တွင် အော်ဒါကို ပယ်ဖျက်နိုင်ပါသည်။ ပို့ပြီးနောက် ပယ်ဖျက်လိုပါက လက်မခံဘဲ ပြန်ပို့နိုင်ပါသည်။",
    body_en:
      "You can cancel before dispatch. After dispatch, you can refuse the parcel at the door.",
  },
  {
    heading_mm: "ကုန်သွယ်မှု မှတ်ပုံတင်",
    heading_en: "Business registration",
    body_mm:
      "eComReg မှတ်ပုံတင်ခြင်းကို ဆောင်ရွက်လျက်ရှိပါသည်။ မှတ်ပုံတင်ပြီးပါက ဤစာမျက်နှာတွင် ဖော်ပြပါမည်။",
    body_en:
      "eComReg registration is in progress. The registration number will be published here once approved.",
  },
];

export default function TermsPage() {
  return (
    <PolicyView
      titleMm="စည်းကမ်းချက်များ"
      titleEn="Terms of service"
      introMm="ZayWear မှ မှာယူခြင်းဖြင့် အောက်ပါ စည်းကမ်းချက်များကို သဘောတူသည်ဟု မှတ်ယူပါသည်။"
      introEn="By ordering from ZayWear you agree to the terms below."
      sections={sections}
    />
  );
}
