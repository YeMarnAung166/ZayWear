import type { Metadata } from "next";
import Link from "next/link";
import { PaymentSettingsForm } from "@/components/admin/PaymentSettingsForm";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { adminFetch } from "@/lib/admin/api";
import type { AdminPaymentSettings, AdminStoreSettings } from "@/lib/admin/types";

export const metadata: Metadata = {
  title: "Settings",
};

const TABS = [
  { id: "payments", label: "Payments" },
  { id: "store", label: "Store" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; updated?: string; error?: string }>;
}) {
  const { tab, updated, error } = await searchParams;
  const activeTab: TabId = tab === "store" ? "store" : "payments";

  const [paymentsBody, storeBody] = await Promise.all([
    adminFetch<{ data: AdminPaymentSettings }>("/admin/settings/payments"),
    adminFetch<{ data: AdminStoreSettings }>("/admin/settings/store"),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Store and payment configuration. Changes take effect immediately.
          </p>
        </div>
        <RefreshButton />
      </div>

      {updated ? (
        <p
          role="status"
          className="rounded-md border border-success-500/30 bg-success-500/10 px-3 py-2 text-sm font-medium text-success-500"
        >
          {activeTab === "store" ? "Store settings saved." : "Payment settings saved."}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm font-medium text-error-500"
        >
          {error}
        </p>
      ) : null}

      <nav aria-label="Settings sections" className="flex gap-1 border-b border-neutral-200">
        {TABS.map((item) => {
          const active = item.id === activeTab;

          return (
            <Link
              key={item.id}
              href={`/admin/settings?tab=${item.id}`}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${
                active
                  ? "border-primary-500 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "payments" ? (
        <PaymentSettingsForm settings={paymentsBody.data} />
      ) : (
        <StoreSettingsForm settings={storeBody.data} />
      )}
    </div>
  );
}
