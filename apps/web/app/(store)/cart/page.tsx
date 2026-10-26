import { CartView } from "@/components/CartView";
import { getConfig } from "@/lib/api";

export default async function CartPage() {
  const config = await getConfig();

  return <CartView config={config} />;
}
