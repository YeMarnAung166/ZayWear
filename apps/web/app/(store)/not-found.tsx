import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">404</h1>
      <p className="mt-2 text-sm text-neutral-500">
        ဤစာမျက်နှာ မရှိပါ။ / This page does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-5 text-sm font-semibold text-neutral-0"
      >
        ပင်မစာမျက်နှာ / Home
      </Link>
    </div>
  );
}
