import { PolicyView, type PolicySection } from "@/components/PolicyView";

const sections: PolicySection[] = [
  {
    heading_mm: "လဲလှယ်နိုင်သည့် အခြေအနေများ",
    heading_en: "What we accept",
    body_mm:
      "ပစ္စည်းရောက်ရှိပြီး ၇ ရက်အတွင်း အရွယ်အစား မကိုက်ညီခြင်း၊ ချုပ်ရိုး ပျက်စီးခြင်း၊ ပုံနှင့် မကိုက်ညီခြင်းတို့အတွက် လဲလှယ်နိုင်ပါသည်။ ပစ္စည်းသည် မဝတ်ဆင်ရသေးဘဲ တံဆိပ် (tag) မဖြတ်ရပါ။",
    body_en:
      "Within 7 days of delivery we exchange for wrong size, faulty stitching, or an item that does not match the photo. The item must be unworn with the tag still attached.",
  },
  {
    heading_mm: "မလဲလှယ်နိုင်သည့် အခြေအနေများ",
    heading_en: "What we cannot accept",
    body_mm:
      "အဝတ်လျှော်ပြီး၊ ဝတ်ဆင်ပြီး၊ ရေစိုနံ့ သို့မဟုတ် မိတ်ကပ်စွန်းထင်းနေသော ပစ္စည်းများ၊ အထူးလျှော့စျေးဖြင့် ရောင်းချထားသော ပစ္စည်းများကို လဲလှယ်၍ မရပါ။",
    body_en:
      "We cannot exchange washed, worn, damp, or makeup-stained items, or items bought at a final-sale discount.",
  },
  {
    heading_mm: "လဲလှယ်နည်း",
    heading_en: "How to exchange",
    body_mm:
      "သင့် အော်ဒါနံပါတ်နှင့် ဓာတ်ပုံကို Telegram မှတစ်ဆင့် ပေးပို့ပါ။ ၂၄ နာရီအတွင်း ပြန်လည် ဖြေကြားပါမည်။ လဲလှယ်မှု ပို့ဆောင်ခကို ဆိုင်မှ ခံယူပါသည်။",
    body_en:
      "Send your order number and a photo on Telegram. We reply within 24 hours. We cover delivery for exchanges caused by our mistake.",
  },
  {
    heading_mm: "ငွေပြန်အမ်း",
    heading_en: "Refunds",
    body_mm:
      "COD ဖြင့် မှာယူပြီး ပစ္စည်း မရောက်ရှိပါက ငွေ မကောက်ခံပါ။ ကြိုတင်ငွေချေထားသော အော်ဒါများကို မူလငွေပေးချေသည့် နည်းလမ်းဖြင့် ၇ ရက်အတွင်း ပြန်အမ်းပါသည်။",
    body_en:
      "If a COD order never arrives, you pay nothing. Prepaid orders are refunded to the original payment method within 7 days.",
  },
  {
    heading_mm: "လက်မခံခြင်း (Refusal)",
    heading_en: "Refusing a delivery",
    body_mm:
      "ပစ္စည်းကို လက်မခံလိုပါက ပို့ဆောင်သူအား ပြန်ပို့နိုင်ပါသည်။ ထပ်ခါတလဲလဲ လက်မခံပါက နောင်အော်ဒါများအတွက် ကြိုတင်ငွေချေရန် တောင်းဆိုနိုင်ပါသည်။",
    body_en:
      "You may refuse a delivery at the door. Repeated refusals may mean we ask for prepayment on future orders.",
  },
];

export default function ReturnsPage() {
  return (
    <PolicyView
      titleMm="ပြန်အမ်းနှင့် လဲလှယ်မူဝါဒ"
      titleEn="Returns & exchanges"
      introMm="ပစ္စည်း မှားယွင်းပါက ကျွန်ုပ်တို့ တာဝန်ယူပါသည်။ အောက်ပါ အခြေအနေများတွင် ၇ ရက်အတွင်း လဲလှယ်နိုင်ပါသည်။"
      introEn="If we got it wrong, we fix it. Exchanges are accepted within 7 days under the conditions below."
      sections={sections}
    />
  );
}
