"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export function TelegramFab({ bot }: { bot: string }) {
  const { t } = useI18n();
  const pathname = usePathname();

  // Keep the floating button off transactional screens so it never covers a CTA.
  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/order/")
  ) {
    return null;
  }

  return (
    <a
      href={`https://t.me/${bot}`}
      target="_blank"
      rel="noreferrer"
      aria-label={t("common.order_telegram")}
      className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-telegram-500 shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.2 12.1 2.7 10.7c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.4 1.8Z" />
      </svg>
    </a>
  );
}
