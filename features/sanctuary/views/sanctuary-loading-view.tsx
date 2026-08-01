/** Calm route skeleton that preserves the Sanctuary composition while loading. */
export function SanctuaryLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-5 sm:px-6 sm:py-9">
      <div className="mx-auto max-w-4xl">
        <div className="h-11 w-40 rounded-xl bg-muted" />
        <div className="mt-5 overflow-hidden rounded-[2rem] border bg-card">
          <div className="h-72 bg-muted/70" />
          <div className="grid gap-4 border-t p-4 sm:p-6 lg:grid-cols-2">
            <div className="h-52 rounded-3xl bg-muted" />
            <div className="h-52 rounded-3xl bg-muted" />
          </div>
          <div className="h-64 border-t bg-muted/50" />
        </div>
      </div>
    </main>
  );
}
