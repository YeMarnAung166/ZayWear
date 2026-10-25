import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/AccountDashboard";
import { getAccount, getAccountOrders } from "@/lib/account";
import { getTownships } from "@/lib/api";

export const metadata = {
  title: "ကျွန်ုပ်၏ အကောင့် — ZayWear",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const account = await getAccount();

  if (!account) {
    redirect("/account/login");
  }

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const [history, townships] = await Promise.all([getAccountOrders(page), getTownships()]);

  return (
    <AccountDashboard
      account={account}
      orders={history.orders}
      page={history.page}
      lastPage={history.lastPage}
      total={history.total}
      townships={townships}
    />
  );
}
