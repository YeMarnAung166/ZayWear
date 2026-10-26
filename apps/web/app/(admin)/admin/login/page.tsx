import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/admin/actions";
import {
  adminSessionConfigured,
  getAdminSession,
} from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Sign in",
};

const errorMessages: Record<string, string> = {
  missing: "Enter the admin password.",
  invalid: "That password is not correct.",
  rate: "Too many attempts. Wait a minute and try again.",
  unreachable: "The shop API could not be reached. Try again.",
  config: "Admin sessions are not configured on this deployment.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin/orders");
  }

  const { error } = await searchParams;
  const message = error ? errorMessages[error] : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
        <p className="text-sm font-semibold text-neutral-500">ZayWear</p>
        <h1 className="mt-1 text-2xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Use the shared operations password. The session lasts 12 hours.
        </p>

        {message ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-md border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm font-medium text-error-500"
          >
            {message}
          </p>
        ) : null}

        {!adminSessionConfigured() ? (
          <p className="mt-4 rounded-md border border-warning-500/30 bg-warning-500/10 px-3 py-2 text-sm font-medium text-warning-500">
            ADMIN_SESSION_SECRET is missing or shorter than 32 characters.
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900 outline-none focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
          >
            Sign in
          </button>
        </form>

        <Link
          href="/"
          prefetch={false}
          className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900"
        >
          Back to the store
        </Link>
      </div>
    </main>
  );
}
