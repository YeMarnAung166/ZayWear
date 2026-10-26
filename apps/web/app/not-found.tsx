import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-neutral-500">ZayWear</p>
      <h1 className="mt-3 text-xl font-semibold">404</h1>
      <p className="mt-2 text-sm text-neutral-500">
        ဤစာမျက်နှာ မရှိပါ။ / This page does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
      >
        ပင်မစာမျက်နှာ / Home
      </Link>
    </main>
  );
}
