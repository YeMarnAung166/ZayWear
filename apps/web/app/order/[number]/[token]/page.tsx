import Link from "next/link";
import { OrderTracking } from "@/components/OrderTracking";
import { getOrder } from "@/lib/api";

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
        <h1 className="text-lg font-semibold">Tracking unavailable</h1>
        <p className="mt-2 text-sm text-neutral-500">{result.error}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <OrderTracking order={result.data} />
    </div>
  );
}
