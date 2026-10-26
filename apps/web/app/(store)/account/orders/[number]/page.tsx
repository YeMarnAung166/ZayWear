import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderReceipt } from "@/components/OrderReceipt";
import { ReorderButton } from "@/components/ReorderButton";
import { getAccount, getAccountOrder } from "@/lib/account";

export const metadata = {
  title: "အော်ဒါ အသေးစိတ် — ZayWear",
  robots: { index: false, follow: false },
};

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  if (!(await getAccount())) {
    redirect("/account/login");
  }

  const { number } = await params;
  const result = await getAccountOrder(number);

  if (!result) {
    notFound();
  }

  const { order, trackingPath } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/account" className="text-sm font-medium underline">
        ← အကောင့်သို့ / Back to account
      </Link>

      <OrderReceipt order={order} trackingPath={trackingPath} />

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4">
        <ReorderButton orderNumber={order.order_number} />
        {order.status === "delivered" ? (
          <Link
            href="/returns"
            className="inline-flex min-h-11 items-center rounded-md border border-neutral-900 px-4 text-sm font-semibold"
          >
            ပြန်အမ်း / လဲလှယ်ရန် / Return or exchange
          </Link>
        ) : null}
      </div>
    </div>
  );
}
