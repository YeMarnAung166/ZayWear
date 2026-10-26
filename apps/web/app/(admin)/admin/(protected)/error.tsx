"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-6">
      <h1 className="text-lg font-bold text-error-500">Could not load this page</h1>
      <p className="mt-2 text-sm text-neutral-900">
        {error.message || "The admin API did not respond."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary-500 px-4 text-sm font-semibold text-neutral-0"
      >
        Try again
      </button>
    </div>
  );
}
