import { ClientErrorReporter } from "@/components/ClientErrorReporter";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Providers } from "@/components/Providers";
import { TelegramFab } from "@/components/TelegramFab";
import { getConfig } from "@/lib/api";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();

  return (
    <Providers>
      <ClientErrorReporter />
      <OfflineBanner />
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer telegramBot={config.telegram_bot} />
      <TelegramFab bot={config.telegram_bot} />
    </Providers>
  );
}
