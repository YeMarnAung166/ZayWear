import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin/slips", label: "Slip Verification" },
  { href: "/admin/orders", label: "Orders & Fulfillment" },
  { href: "/admin/exchanges", label: "Exchanges" },
  { href: "/admin/townships", label: "Township Rates" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-8">
      <aside className="w-56 shrink-0">
        <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">
          Admin
        </h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
