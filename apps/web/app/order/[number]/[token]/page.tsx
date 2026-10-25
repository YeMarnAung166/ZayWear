import Link from "next/link";
import { OrderTracker } from "@/components/OrderTracker";
import { getOrder } from "@/lib/api";

export const metadata = {
  title: "အော်ဒါ လမ်းကြောင်း — ZayWear",
  robots: { index: false, follow: false },
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ number: string; token: string }>;
}) {
  const { number, token } = await params;
  const result = await getOrder(decodeURIComponent(number), decodeURIComponent(token));

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold">အော်ဒါ အချက်အလက် မရနိုင်ပါ</h1>
        <p className="mt-2 text-sm text-neutral-500">
          လင့်ခ် မမှန်ကန်ခြင်း သို့မဟုတ် သက်တမ်း ကုန်ဆုံးသွားခြင်း ဖြစ်နိုင်ပါသည်။
        </p>
        <p className="mt-1 text-xs text-neutral-400">{result.error}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0">
          ပင်မစာမျက်နှာသို့ / Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <OrderTracker order={result.data} />
    </div>
  );
}
