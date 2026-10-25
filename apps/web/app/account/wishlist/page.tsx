import { redirect } from "next/navigation";
import { WishlistView } from "@/components/WishlistView";
import { getAccount, getWishlist } from "@/lib/account";

export const metadata = {
  title: "ဝှစ်ရှ်လစ် — ZayWear",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  if (!(await getAccount())) {
    redirect("/account/login?next=%2Faccount%2Fwishlist");
  }

  const products = await getWishlist();

  return <WishlistView products={products} />;
}
