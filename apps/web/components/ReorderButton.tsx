"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import type { CartLine } from "@/lib/cart";
import type { ReorderResult } from "@/lib/types";

export function ReorderButton({
  orderNumber,
  className = "",
}: {
  orderNumber: string;
  className?: string;
}) {
  const { pick } = useI18n();
  const { lines, replaceLines } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorder = async () => {
    if (
      lines.length > 0 &&
      !window.confirm(
        pick(
          "ဈေးတောင်းထဲတွင် ပစ္စည်းများ ရှိနေပါသည်။ ဤအော်ဒါဖြင့် အစားထိုးမလား?",
          "Your cart already has items. Replace it with this order?",
        ),
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/me/orders/${encodeURIComponent(orderNumber)}/reorder`,
        { method: "POST" },
      );

      if (response.status === 401) {
        router.push("/account/login");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { data?: ReorderResult }
        | null;

      if (!response.ok || !body?.data) {
        setError(pick("ထပ်မံမှာယူ၍ မရပါ။", "Could not reorder right now."));
        return;
      }

      const { lines: nextLines, unavailable } = body.data;

      if (nextLines.length === 0) {
        setError(
          pick(
            "ဤအော်ဒါရှိ ပစ္စည်းများ မရနိုင်တော့ပါ။",
            "The items in this order are no longer available.",
          ),
        );
        return;
      }

      replaceLines(nextLines as CartLine[]);

      if (unavailable.length > 0) {
        window.alert(
          pick(
            `ပစ္စည်း ${unavailable.length} မျိုး မရနိုင်တော့ပါ။ ကျန်ပစ္စည်းများကို ဈေးတောင်းထဲ ထည့်ပြီးပါပြီ။`,
            `${unavailable.length} item(s) are no longer available. The rest were added to your cart.`,
          ),
        );
      }

      router.push("/cart");
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={reorder}
        disabled={busy}
        className="min-h-11 rounded-md border border-neutral-900 px-4 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? pick("ခဏစောင့်ပါ…", "One moment…") : pick("ထပ်မံမှာယူရန်", "Order again")}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-error-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
