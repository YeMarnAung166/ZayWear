"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-sm font-semibold text-neutral-900 disabled:cursor-wait disabled:text-neutral-500"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
