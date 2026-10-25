import { redirect } from "next/navigation";
import { AccountLogin } from "@/components/AccountLogin";
import { getAccount } from "@/lib/account";

export const metadata = {
  title: "အကောင့်ဝင်ရန် — ZayWear",
  robots: { index: false, follow: false },
};

export default async function AccountLoginPage() {
  if (await getAccount()) {
    redirect("/account");
  }

  return <AccountLogin />;
}
