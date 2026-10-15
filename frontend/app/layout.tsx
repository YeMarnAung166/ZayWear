import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZayWear — Modern Myanmar Atelier",
  description:
    "ZayWear — modern apparel with nationwide township shipping, Cash on Delivery, and slip verification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">
        <StoreHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <StoreFooter />
      </body>
    </html>
  );
}
