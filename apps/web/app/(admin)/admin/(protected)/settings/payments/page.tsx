import { redirect } from "next/navigation";

export default async function LegacyPaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { updated, error } = await searchParams;
  const query = new URLSearchParams({ tab: "payments" });

  if (updated) {
    query.set("updated", updated);
  }

  if (error) {
    query.set("error", error);
  }

  redirect(`/admin/settings?${query.toString()}`);
}
