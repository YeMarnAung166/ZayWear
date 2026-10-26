import { saveStoreSettingsAction } from "@/lib/admin/actions";
import type { AdminStoreSettings } from "@/lib/admin/types";

export function StoreSettingsForm({ settings }: { settings: AdminStoreSettings }) {
  return (
    <form action={saveStoreSettingsAction} className="space-y-5">
      <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <h2 className="text-base font-bold">Delivery</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Orders at or above this subtotal ship free. Set 0 to make delivery free for every
          order.
        </p>

        <div className="mt-4 max-w-sm">
          <label htmlFor="free_delivery_threshold_mmk" className="text-sm font-semibold">
            Free delivery threshold (MMK)
          </label>
          <input
            id="free_delivery_threshold_mmk"
            name="free_delivery_threshold_mmk"
            type="number"
            min={0}
            max={10000000}
            step={1000}
            required
            defaultValue={settings.free_delivery_threshold_mmk}
            className="price mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Shown at checkout, in the cart, and on product pages.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <h2 className="text-base font-bold">Returns</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Shown on product pages and on the returns policy.
        </p>

        <div className="mt-4 max-w-sm">
          <label htmlFor="return_window_days" className="text-sm font-semibold">
            Return window (days)
          </label>
          <input
            id="return_window_days"
            name="return_window_days"
            type="number"
            min={1}
            max={30}
            step={1}
            required
            defaultValue={settings.return_window_days}
            className="price mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Customers can request an exchange within this many days of delivery.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <h2 className="text-base font-bold">Support</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Telegram username shown on the contact page and in the bot&apos;s help message.
          Leave blank to hide it.
        </p>

        <div className="mt-4 max-w-sm">
          <label htmlFor="support_telegram" className="text-sm font-semibold">
            Telegram username
          </label>
          <input
            id="support_telegram"
            name="support_telegram"
            maxLength={64}
            defaultValue={settings.support_telegram}
            placeholder="@zaywear"
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Accepts @handle, handle, or a t.me link. Stored without the @.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
        >
          Save store settings
        </button>
        <p className="text-xs text-neutral-500">
          Changes take effect immediately on the storefront.
        </p>
      </div>
    </form>
  );
}
