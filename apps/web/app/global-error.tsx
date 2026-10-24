"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="my">
      <body className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">တစ်ခုခု မှားယွင်းသွားပါသည်</h1>
        <p className="mt-2 text-sm text-neutral-500">
          ထပ်မံကြိုးစားပါ။ / Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
        >
          ထပ်စမ်းမည် / Try again
        </button>
      </body>
    </html>
  );
}
