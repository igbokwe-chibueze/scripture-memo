/** Provides an immediate private-route skeleton while badge progress loads. */
export function BadgeCollectionLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-11 w-36 rounded-xl bg-muted" />
        <div className="mt-6 h-20 rounded-2xl bg-muted" />
        <div className="mt-5 h-28 rounded-2xl bg-muted" />
        <div className="mt-5 h-11 rounded-xl bg-muted" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}
