import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports uncaught server errors (RSC renders, route handlers, server actions)
// to Sentry without changing how Next renders the error page.
export const onRequestError = Sentry.captureRequestError;
