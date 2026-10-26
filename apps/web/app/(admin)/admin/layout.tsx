import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "ZayWear Admin",
    template: "%s · ZayWear Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="min-h-screen bg-neutral-50 font-price text-neutral-900">
      {children}
    </div>
  );
}
