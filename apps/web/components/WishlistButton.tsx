"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeartIcon } from "@/components/HeartIcon";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";

function loginPath(): string {
  const next = `${window.location.pathname}${window.location.search}`;

  return `/account/login?next=${encodeURIComponent(next)}`;
}

export function WishlistButton({
  productId,
  className = "",
}: {
  productId: number;
  className?: string;
}) {
  const { pick } = useI18n();
  const router = useRouter();
  const { status, isSaved, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = isSaved(productId);

  const onClick = async () => {
    setError(null);

    if (status === "guest") {
      router.push(loginPath());
      return;
    }

    if (status === "loading" || busy) {
      return;
    }

    setBusy(true);
    const result = await toggle(productId);
    setBusy(false);

    if (result.unauthorized) {
      router.push(loginPath());
      return;
    }

    if (!result.ok) {
      setError(pick("သိမ်း၍ မရပါ။ ထပ်စမ်းပါ။", "Could not save. Please try again."));
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={status === "loading" || busy}
        aria-pressed={saved}
        aria-label={
          saved
            ? pick("ဝှစ်ရှ်လစ်မှ ဖယ်ရန်", "Remove from wishlist")
            : pick("ဝှစ်ရှ်လစ်သို့ သိမ်းရန်", "Save to wishlist")
        }
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-0 shadow-sm transition-colors disabled:opacity-60 ${
          saved ? "text-accent-500" : "text-neutral-900"
        }`}
      >
        <HeartIcon filled={saved} />
      </button>

      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
