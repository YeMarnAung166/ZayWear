import type { Metadata } from "next";
import { Inter, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Providers } from "@/components/Providers";
import { TelegramFab } from "@/components/TelegramFab";
import { getConfig } from "@/lib/api";

const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-myanmar",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZayWear — Myanmar apparel",
  description:
    "Mobile-first apparel store for Myanmar. Cash on delivery, township delivery, order via Telegram.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();

  return (
    <html lang="my" className={`${notoSansMyanmar.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <OfflineBanner />
          <Header />
          <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6">{children}</main>
          <Footer telegramBot={config.telegram_bot} />
          <TelegramFab bot={config.telegram_bot} />
        </Providers>
      </body>
    </html>
  );
}
