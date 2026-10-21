import { CheckoutForm } from "@/components/CheckoutForm";
import { getConfig, getTownships } from "@/lib/api";

export default async function CheckoutPage() {
  const [townships, config] = await Promise.all([getTownships(), getConfig()]);

  return <CheckoutForm townships={townships} config={config} />;
}
