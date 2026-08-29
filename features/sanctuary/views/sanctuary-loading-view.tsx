/** Calm route skeleton that mirrors the mobile-first Sanctuary reader. */
export function SanctuaryLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex justify-between">
          <div className="size-11 rounded-xl bg-muted sm:w-36" />
          <div className="size-11 rounded-xl bg-muted sm:w-32" />
        </div>
        <div className="mt-4 h-72 rounded-[2rem] border bg-muted/60" />
        <div className="mt-4 h-12 rounded-2xl bg-muted lg:hidden" />
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:gap-7">
          <div className="space-y-4">
            <div className="h-48 rounded-3xl bg-muted" />
            <div className="h-72 rounded-3xl bg-muted/70" />
            <div className="h-64 rounded-3xl bg-muted/70" />
          </div>
          <div className="hidden space-y-4 lg:block">
            <div className="h-64 rounded-3xl bg-muted" />
            <div className="h-80 rounded-3xl bg-muted/70" />
          </div>
        </div>
      </div>
    </main>
  );
}
