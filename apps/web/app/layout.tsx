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
  // A single weight keeps the file at ~46 KB instead of the 150 KB variable
  // font. Headings are synthesised bold by the browser.
  weight: ["400"],
  variable: "--font-noto-myanmar",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Prices only: let the critical Burmese font and the app bundle have the
  // bandwidth first, then swap the numerals in.
  preload: false,
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
