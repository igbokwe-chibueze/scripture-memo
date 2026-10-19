/** Calm route skeleton that mirrors the mobile-first Sanctuary reader. */
export function SanctuaryLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex justify-between">
          <div className="size-11 rounded-xl bg-muted sm:w-36" />
          <div className="size-11 rounded-xl bg-muted sm:w-32" />
        </div>
        <div className="mt-6 h-11 rounded-xl bg-muted" />
        <div className="mt-4 h-44 rounded-2xl border bg-muted/60" />
        <div className="mt-4 h-12 rounded-2xl bg-muted" />
        <div className="mt-4 grid gap-5">
          <div className="space-y-4">
            <div className="h-12 rounded-2xl bg-muted" />
            <div className="h-16 rounded-2xl bg-muted/70" />
            <div className="h-40 rounded-2xl bg-muted/70" />
          </div>
        </div>
      </div>
    </main>
  );
}
