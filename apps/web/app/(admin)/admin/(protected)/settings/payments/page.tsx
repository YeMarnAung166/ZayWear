import type { Metadata } from "next";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { savePaymentSettingsAction } from "@/lib/admin/actions";
import { adminFetch } from "@/lib/admin/api";
import type { AdminPaymentSettings } from "@/lib/admin/types";

export const metadata: Metadata = {
  title: "Payments",
};

export default async function AdminPaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const body = await adminFetch<{ data: AdminPaymentSettings }>("/admin/settings/payments");
  const settings = body.data;
  const { updated, error } = await searchParams;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Choose how customers can pay and enter the wallet that receives prepayments.
          </p>
        </div>
        <RefreshButton />
      </div>

      {updated ? (
        <p
          role="status"
          className="rounded-md border border-success-500/30 bg-success-500/10 px-3 py-2 text-sm font-medium text-success-500"
        >
          Payment settings saved.
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

      <form action={savePaymentSettingsAction} className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
          <h2 className="text-base font-bold">Methods</h2>
          <p className="mt-1 text-sm text-neutral-500">
            At least one method must stay enabled. A prepaid method also needs an account name
            and a valid 09 phone number before customers can choose it.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-3">
              <input
                type="checkbox"
                name="cod_enabled"
                defaultChecked={settings.cod_enabled}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">Cash on delivery</span>
                <span className="block text-sm text-neutral-500">
                  The courier collects cash when the parcel arrives.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-3">
              <input
                type="checkbox"
                name="kbzpay_enabled"
                defaultChecked={settings.kbzpay_enabled}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">KBZPay</span>
                <span className="block text-sm text-neutral-500">
                  Customers transfer first and upload a receipt for manual verification.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-3">
              <input
                type="checkbox"
                name="wave_enabled"
                defaultChecked={settings.wave_enabled}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">Wave Money</span>
                <span className="block text-sm text-neutral-500">
                  Customers transfer first and upload a receipt for manual verification.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">KBZPay receiving account</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="kbzpay_account_name" className="text-sm font-semibold">
                  Account name
                </label>
                <input
                  id="kbzpay_account_name"
                  name="kbzpay_account_name"
                  maxLength={120}
                  defaultValue={settings.kbzpay_account_name}
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="kbzpay_phone" className="text-sm font-semibold">
                  Phone
                </label>
                <input
                  id="kbzpay_phone"
                  name="kbzpay_phone"
                  inputMode="numeric"
                  maxLength={30}
                  defaultValue={settings.kbzpay_phone}
                  placeholder="09xxxxxxxxx"
                  className="price mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Shown to customers at checkout and on their order page.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <h2 className="text-base font-bold">Wave Money receiving account</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="wave_account_name" className="text-sm font-semibold">
                  Account name
                </label>
                <input
                  id="wave_account_name"
                  name="wave_account_name"
                  maxLength={120}
                  defaultValue={settings.wave_account_name}
                  className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="wave_phone" className="text-sm font-semibold">
                  Phone
                </label>
                <input
                  id="wave_phone"
                  name="wave_phone"
                  inputMode="numeric"
                  maxLength={30}
                  defaultValue={settings.wave_phone}
                  placeholder="09xxxxxxxxx"
                  className="price mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Shown to customers at checkout and on their order page.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
          >
            Save payment settings
          </button>
          <p className="text-xs text-neutral-500">
            Changes take effect immediately on the storefront and Telegram bot.
          </p>
        </div>
      </form>
    </div>
  );
}
