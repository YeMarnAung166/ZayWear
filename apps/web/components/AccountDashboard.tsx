"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReorderButton } from "@/components/ReorderButton";
import { MMK } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { CustomerAccount, Order, Township } from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  // Pinned to Yangon so the server and the browser render the same day; an
  // unpinned locale flips the date near midnight and breaks hydration.
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Yangon",
  });
}

const STATUS_TONES: Record<string, string> = {
  pending: "bg-warning-500/10 text-warning-500",
  packed: "bg-warning-500/10 text-warning-500",
  shipped: "bg-warning-500/10 text-warning-500",
  delivered: "bg-success-500/10 text-success-500",
  cancelled: "bg-error-500/10 text-error-500",
  refused: "bg-error-500/10 text-error-500",
  returned: "bg-neutral-50 text-neutral-500",
};

export function AccountDashboard({
  account,
  orders,
  page,
  lastPage,
  total,
  townships,
}: {
  account: CustomerAccount;
  orders: Order[];
  page: number;
  lastPage: number;
  total: number;
  townships: Township[];
}) {
  const { pick } = useI18n();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(account.addresses.length === 0);
  const [label, setLabel] = useState("Home");
  const [townshipId, setTownshipId] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isDefault, setIsDefault] = useState(account.addresses.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  };

  const addAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!townshipId) {
      setError(pick("မြို့နယ် ရွေးပါ။", "Please choose your township."));
      return;
    }

    if (addressLine.trim().length < 5) {
      setError(pick("လိပ်စာ ထည့်ပါ။", "Please enter your address."));
      return;
    }

    if (landmark.trim().length < 5) {
      setError(pick("ကုန်းကြောင်းအမှတ်အသား ထည့်ပါ။", "Please add a landmark."));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || "Home",
          township_id: Number(townshipId),
          address_line: addressLine.trim(),
          landmark: landmark.trim(),
          is_default: isDefault,
        }),
      });

      if (response.status === 401) {
        router.push("/account/login");
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(body?.message ?? pick("လိပ်စာ သိမ်း၍ မရပါ။", "Could not save the address."));
        return;
      }

      setLabel("Home");
      setTownshipId("");
      setAddressLine("");
      setLandmark("");
      setIsDefault(false);
      setShowAddressForm(false);
      router.refresh();
    } catch {
      setError(pick("အင်တာနက် ချိတ်ဆက်မှု မရပါ။", "Could not reach the server."));
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id: number) => {
    if (
      !window.confirm(
        pick("ဤလိပ်စာကို ဖျက်မလား?", "Remove this address?"),
      )
    ) {
      return;
    }

    const response = await fetch(`/api/me/addresses/${id}`, { method: "DELETE" }).catch(
      () => null,
    );

    if (response?.status === 401) {
      router.push("/account/login");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{pick("ကျွန်ုပ်၏ အကောင့်", "My account")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {account.name} · <span className="price">{account.phone}</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {account.telegram_linked
              ? pick("Telegram ချိတ်ဆက်ပြီး", "Telegram linked")
              : pick("Telegram မချိတ်ဆက်ရသေးပါ", "Telegram not linked")}
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="min-h-11 rounded-md border border-neutral-200 px-4 text-sm font-medium disabled:opacity-60"
        >
          {pick("ထွက်ရန်", "Log out")}
        </button>
      </section>

      <section id="orders">
        <h2 className="text-base font-semibold">
          {pick("အော်ဒါမှတ်တမ်း", "Order history")}
          {total > 0 ? (
            <span className="ml-2 text-xs font-normal text-neutral-500">
              {total} {pick("ခု", "orders")}
            </span>
          ) : null}
        </h2>

        {orders.length === 0 ? (
          <div className="mt-3 rounded-lg border border-neutral-200 p-6 text-center">
            <p className="text-sm text-neutral-500">
              {pick("အော်ဒါ မရှိသေးပါ။", "No orders yet.")}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
            >
              {pick("ပစ္စည်းများ ကြည့်ရန်", "Browse products")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-3 space-y-3">
              {orders.map((order) => {
                const status = ORDER_STATUS_LABELS[order.status];

                return (
                  <li
                    key={order.order_number}
                    className="relative rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/account/orders/${order.order_number}`}
                          aria-label={pick(
                            `အော်ဒါ ${order.order_number} ကို ကြည့်ရန်`,
                            `View order ${order.order_number}`,
                          )}
                          className="price text-sm font-bold underline after:absolute after:inset-0 after:content-['']"
                        >
                          {order.order_number}
                        </Link>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span>{formatDate(order.created_at)}</span>
                          <span
                            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                              STATUS_TONES[order.status] ?? "bg-neutral-50 text-neutral-500"
                            }`}
                          >
                            {status ? pick(status.mm, status.en) : order.status}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {pick("ပစ္စည်း", "Items")} {order.items.length} ·{" "}
                          <span className="price">{MMK(order.total_mmk)}</span>
                        </p>
                      </div>

                      <div className="relative z-10">
                        <ReorderButton orderNumber={order.order_number} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {lastPage > 1 ? (
              <nav
                aria-label={pick("အော်ဒါမှတ်တမ်း စာမျက်နှာ", "Order history pages")}
                className="mt-4 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-xs text-neutral-500">
                  {pick(
                    `စာမျက်နှာ ${page} / ${lastPage}`,
                    `Page ${page} of ${lastPage}`,
                  )}
                </p>

                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={`/account?page=${page - 1}#orders`}
                      className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 px-4 text-sm font-medium"
                    >
                      {pick("ယခင်", "Previous")}
                    </Link>
                  ) : null}
                  {page < lastPage ? (
                    <Link
                      href={`/account?page=${page + 1}#orders`}
                      className="inline-flex min-h-11 items-center rounded-md border border-neutral-200 px-4 text-sm font-medium"
                    >
                      {pick("နောက်", "Next")}
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{pick("လိပ်စာများ", "Saved addresses")}</h2>
          {!showAddressForm ? (
            <button
              type="button"
              onClick={() => setShowAddressForm(true)}
              className="min-h-11 rounded-md border border-neutral-900 px-4 text-sm font-semibold"
            >
              {pick("လိပ်စာ ထည့်ရန်", "Add address")}
            </button>
          ) : null}
        </div>

        {account.addresses.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            {pick("လိပ်စာ မသိမ်းရသေးပါ။", "No saved addresses yet.")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {account.addresses.map((address) => (
              <li key={address.id} className="rounded-lg border border-neutral-200 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {address.label}
                      {address.is_default ? (
                        <span className="ml-2 rounded-sm bg-success-500 px-2 py-0.5 text-xs font-medium text-neutral-0">
                          {pick("မူလ", "Default")}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-neutral-500">
                      {address.township
                        ? pick(address.township.name_mm, address.township.name_en)
                        : ""}
                    </p>
                    <p className="mt-1">{address.address_line}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {pick("အမှတ်အသား", "Landmark")} — {address.landmark}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAddress(address.id)}
                    className="min-h-11 rounded-md border border-neutral-200 px-4 text-sm font-medium"
                  >
                    {pick("ဖျက်ရန်", "Remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showAddressForm ? (
          <form onSubmit={addAddress} className="mt-4 space-y-4 rounded-lg border border-neutral-200 p-4">
            <div>
              <label htmlFor="address-label" className="text-sm font-medium">
                {pick("အမည်", "Label")}
              </label>
              <input
                id="address-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={40}
                className="mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="address-township" className="text-sm font-medium">
                {pick("မြို့နယ်", "Township")}
              </label>
              <select
                id="address-township"
                value={townshipId}
                onChange={(event) => setTownshipId(event.target.value)}
                className="mt-1 h-12 w-full rounded-md border border-neutral-200 bg-neutral-0 px-2 text-sm outline-none focus:border-neutral-900"
              >
                <option value="">{pick("— ရွေးပါ —", "— select —")}</option>
                {townships.map((township) => (
                  <option key={township.id} value={township.id}>
                    {pick(township.name_mm, township.name_en)} — {MMK(township.delivery_fee_mmk)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="address-line" className="text-sm font-medium">
                {pick("လိပ်စာ", "Address")}
              </label>
              <textarea
                id="address-line"
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-neutral-200 p-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="address-landmark" className="text-sm font-medium">
                {pick("ကုန်းကြောင်း အမှတ်အသား", "Landmark")}
              </label>
              <input
                id="address-landmark"
                value={landmark}
                onChange={(event) => setLandmark(event.target.value)}
                className="mt-1 h-12 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
              {pick("မူလလိပ်စာ ဖြစ်စေရန်", "Make this my default address")}
            </label>

            {error ? (
              <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-500" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0 disabled:opacity-60"
              >
                {saving ? pick("သိမ်းနေသည်…", "Saving…") : pick("သိမ်းရန်", "Save address")}
              </button>
              {account.addresses.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="min-h-12 rounded-md border border-neutral-200 px-5 text-sm font-medium"
                >
                  {pick("မလုပ်တော့ပါ", "Cancel")}
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
