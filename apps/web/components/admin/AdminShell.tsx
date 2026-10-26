import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/admin/actions";
import { AdminNav } from "./AdminNav";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/admin/orders"
            prefetch={false}
            className="text-lg font-bold text-primary-500"
          >
            ZayWear <span className="text-neutral-500">Admin</span>
          </Link>

          <AdminNav />

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
            >
              View store
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 px-3 text-sm font-semibold text-neutral-900 hover:border-neutral-500"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
