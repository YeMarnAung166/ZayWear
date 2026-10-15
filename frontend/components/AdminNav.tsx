"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/slips", label: "Slip Verification", icon: "receipt_long" },
  {
    href: "/admin/orders",
    label: "Orders & Fulfillment",
    icon: "local_shipping",
  },
  { href: "/admin/exchanges", label: "Exchanges", icon: "swap_horiz" },
  { href: "/admin/townships", label: "Township Rates", icon: "map" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded px-3 py-2.5 text-body-sm transition-colors ${
              active
                ? "bg-primary-container font-medium text-surface"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
