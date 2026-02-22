/**
 * Premium skeleton shown while tenant is loading (e.g. Home → use case selected).
 * Mirrors the tenant booking page layout: hero + panel placeholder for a polished feel.
 */
export function TenantPageSkeleton() {
  return (
    <div className="page-transition-enter relative min-h-screen overflow-hidden bg-hero font-body">
      {/* Hero skeleton: same gradient overlay as real page */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
      <div className="absolute inset-0">
        <div className="h-full w-full animate-pulse bg-muted" />
      </div>

      {/* Top bar placeholder */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-white/20 sm:h-10 sm:w-28" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-full bg-white/15" />
          <div className="h-9 w-20 animate-pulse rounded-full bg-white/15" />
        </div>
      </header>

      {/* Main content: left copy area + right panel placeholder */}
      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-col justify-end px-6 pb-8 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-12">
        <div className="max-w-xl space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-white/20" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 animate-pulse rounded-full bg-white/25" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-white/15" />
          </div>
        </div>

        {/* Panel placeholder (matches booking dialog position) */}
        <div className="mt-8 flex w-full max-w-[calc(28rem-60px)] shrink-0 flex-col overflow-hidden rounded-l-xl border-0 border-l border-white/10 bg-card shadow-2xl sm:max-w-[calc(32rem-60px)]">
          <div className="shrink-0 p-4 sm:p-5">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="min-h-[320px] flex-1 space-y-3 p-4 sm:p-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between gap-2">
                <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 max-w-[60%] animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="flex justify-center border-t border-border py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </main>
    </div>
  );
}
