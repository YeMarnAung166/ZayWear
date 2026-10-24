"use client";

type SentryModule = typeof import("@sentry/nextjs");

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sentry: Promise<SentryModule> | null = null;

// The browser SDK is ~80 KB gzipped. Loading it on every page pushed LCP past
// the 2.5 s budget, so it is fetched only after the first uncaught error. The
// server and edge SDKs still initialise eagerly in instrumentation.ts.
function loadSentry(): Promise<SentryModule> {
  sentry ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      tracesSampleRate: 0,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
    });

    return Sentry;
  });

  return sentry;
}

function report(error: unknown): void {
  void loadSentry()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      // Never let error reporting break the page.
    });
}

function onError(event: ErrorEvent): void {
  report(event.error ?? new Error(event.message));
}

function onUnhandledRejection(event: PromiseRejectionEvent): void {
  report(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
}

if (typeof window !== "undefined" && dsn) {
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
}

export function ClientErrorReporter() {
  // Listeners are registered when this module first evaluates, before
  // hydration, so early errors are not missed.
  return null;
}
