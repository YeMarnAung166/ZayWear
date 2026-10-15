import AdminNav from "@/components/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-grow px-space-lg py-space-xl md:px-margin">
      <header className="mb-space-lg border-b border-surface-container-highest pb-space-md">
        <span className="text-label-sm font-label-sm uppercase tracking-widest text-secondary">
          Atelier Console
        </span>
        <h1 className="mt-1 font-headline-lg text-headline-lg tracking-tight text-primary">
          Operations
        </h1>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Fulfil slips, dispatch orders, resolve exchanges, and tune township
          delivery rates.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded border border-surface-container-highest bg-surface-container-low p-2 lg:sticky lg:top-28">
            <AdminNav />
          </div>
        </aside>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
