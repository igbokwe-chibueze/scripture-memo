/** Provides an immediate private-route skeleton while badge progress loads. */
export function BadgeCollectionLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-11 w-36 rounded-xl bg-muted" />
        <div className="mt-6 h-64 rounded-[2rem] bg-muted" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}
