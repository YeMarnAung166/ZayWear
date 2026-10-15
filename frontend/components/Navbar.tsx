import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-hairline bg-canvas">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-lg font-semibold uppercase tracking-[0.08em]"
        >
          ZayWear
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/">Home</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/my-orders">My Orders</Link>
          <Link href="/login">Login</Link>
          <Link href="/admin/slips">Admin</Link>
        </div>
      </nav>
    </header>
  );
}
