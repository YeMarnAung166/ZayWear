import { ContactView } from "@/components/ContactView";
import { getConfig } from "@/lib/api";

export const metadata = {
  title: "ဆက်သွယ်ရန် · Contact",
};

export default async function ContactPage() {
  const config = await getConfig();

  return (
    <ContactView
      telegramBot={config.telegram_bot}
      supportTelegram={config.support_telegram}
    />
  );
}
