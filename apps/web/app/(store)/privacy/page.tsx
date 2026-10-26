import { PolicyView, type PolicySection } from "@/components/PolicyView";

const sections: PolicySection[] = [
  {
    heading_mm: "စုဆောင်းသော အချက်အလက်များ",
    heading_en: "What we collect",
    body_mm:
      "အမည်၊ ဖုန်းနံပါတ်၊ လိပ်စာ၊ မြို့နယ်နှင့် မှာယူထားသော ပစ္စည်းများ။ ငွေပေးချေမှု ကတ်အချက်အလက်များကို ကျွန်ုပ်တို့ သိမ်းဆည်းခြင်း မရှိပါ။",
    body_en:
      "Name, phone number, address, township, and the items you order. We never store card or wallet credentials.",
  },
  {
    heading_mm: "အသုံးပြုပုံ",
    heading_en: "How we use it",
    body_mm:
      "အော်ဒါ ပို့ဆောင်ရန်၊ အတည်ပြုရန် ဆက်သွယ်ရန်၊ လဲလှယ်မှု ကိုင်တွယ်ရန်နှင့် အော်ဒါ အခြေအနေ အသိပေးရန် အတွက်သာ အသုံးပြုပါသည်။ ကြော်ငြာအတွက် မရောင်းချပါ။",
    body_en:
      "Only to deliver and confirm your order, handle exchanges, and update you on status. We do not sell your data.",
  },
  {
    heading_mm: "မျှဝေခြင်း",
    heading_en: "Who we share with",
    body_mm:
      "ပို့ဆောင်ရေး လုပ်ငန်းနှင့် Telegram (အော်ဒါ အသိပေးချက် ပို့ရန်) တို့နှင့်သာ လိုအပ်သလောက် မျှဝေပါသည်။",
    body_en:
      "Only with our delivery partner, and with Telegram to send order updates.",
  },
  {
    heading_mm: "သိမ်းဆည်းကာလ",
    heading_en: "Retention",
    body_mm:
      "အော်ဒါ မှတ်တမ်းများကို ၂ နှစ် သိမ်းဆည်းပြီး ပြီးနောက် ဖျက်ပစ်ပါသည်။",
    body_en: "Order records are kept for 2 years, then deleted.",
  },
  {
    heading_mm: "သင့်အခွင့်အရေး",
    heading_en: "Your rights",
    body_mm:
      "သင့် အချက်အလက်ကို ကြည့်ရှုရန်၊ ပြင်ဆင်ရန် သို့မဟုတ် ဖျက်ပစ်ရန် Telegram မှတစ်ဆင့် တောင်းဆိုနိုင်ပါသည်။",
    body_en:
      "You can ask to see, correct, or delete your data by messaging us on Telegram.",
  },
  {
    heading_mm: "Cookie နှင့် တိုင်းတာမှု",
    heading_en: "Cookies and analytics",
    body_mm:
      "ဈေးတောင်း အခြေအနေ သိမ်းရန် browser သိုလှောင်မှုကို သုံးပါသည်။ ကြော်ငြာ cookie များ မသုံးပါ။ ဝဘ်ဆိုက် အသုံးပြုမှုကို ကိုယ်ရေးမဖော်ထုတ်သော Plausible ဖြင့် တိုင်းတာပါသည်။",
    body_en:
      "We use browser storage to keep your cart. No advertising cookies. Traffic is measured with privacy-friendly Plausible analytics.",
  },
];

export default function PrivacyPage() {
  return (
    <PolicyView
      titleMm="ကိုယ်ရေးအချက်အလက် မူဝါဒ"
      titleEn="Privacy policy"
      introMm="သင့် အချက်အလက်ကို အော်ဒါ ပို့ဆောင်ရန် အတွက်သာ အသုံးပြုပါသည်။"
      introEn="We use your details to deliver your order, and nothing else."
      sections={sections}
    />
  );
}
