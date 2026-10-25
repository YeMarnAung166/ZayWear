import { CheckoutForm } from "@/components/CheckoutForm";
import { getAccount } from "@/lib/account";
import { getConfig, getTownships } from "@/lib/api";

export default async function CheckoutPage() {
  const [townships, config, account] = await Promise.all([
    getTownships(),
    getConfig(),
    getAccount(),
  ]);

  return <CheckoutForm townships={townships} config={config} account={account} />;
}
