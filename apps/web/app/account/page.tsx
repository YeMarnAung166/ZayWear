import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/AccountDashboard";
import { getAccount, getAccountOrders } from "@/lib/account";
import { getTownships } from "@/lib/api";

export const metadata = {
  title: "ကျွန်ုပ်၏ အကောင့် — ZayWear",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const account = await getAccount();

  if (!account) {
    redirect("/account/login");
  }

  const [orders, townships] = await Promise.all([getAccountOrders(), getTownships()]);

  return <AccountDashboard account={account} orders={orders} townships={townships} />;
}
