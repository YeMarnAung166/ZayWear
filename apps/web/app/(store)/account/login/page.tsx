import { redirect } from "next/navigation";
import { AccountLogin } from "@/components/AccountLogin";
import { getAccount } from "@/lib/account";

export const metadata = {
  title: "အကောင့်ဝင်ရန် — ZayWear",
  robots: { index: false, follow: false },
};

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/account";
  }

  return value;
}

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  if (await getAccount()) {
    redirect(destination);
  }

  return <AccountLogin next={destination} />;
}
