import type { Metadata } from "next";
import { Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";

const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  // A single weight keeps the file at ~46 KB instead of the 150 KB variable
  // font. Headings are synthesised bold by the browser.
  weight: ["400"],
  variable: "--font-noto-myanmar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZayWear — Myanmar apparel",
  description:
    "Mobile-first apparel store for Myanmar. Cash on delivery, township delivery, order via Telegram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="my" className={notoSansMyanmar.variable}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
