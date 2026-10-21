"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function Footer({ telegramBot }: { telegramBot: string }) {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold">ZayWear</p>
          <p className="mt-1 text-neutral-500">
            Yangon, Myanmar ·{" "}
            <a href={`https://t.me/${telegramBot}`} className="text-telegram-700 underline">
              Telegram
            </a>
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            eComReg: <span className="font-medium">pending registration</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/returns" className="hover:underline">
            {t("footer.returns")}
          </Link>
          <Link href="/terms" className="hover:underline">
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t("footer.privacy")}
          </Link>
          <Link href="/contact" className="hover:underline">
            {t("footer.contact")}
          </Link>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Payment</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-sm bg-success-500 px-2 py-1 text-neutral-0">COD</span>
            <span className="rounded-sm bg-neutral-200 px-2 py-1">KBZPay</span>
            <span className="rounded-sm bg-neutral-200 px-2 py-1">Wave</span>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {new Date().getFullYear()} © ZayWear
          </p>
        </div>
      </div>
    </footer>
  );
}
