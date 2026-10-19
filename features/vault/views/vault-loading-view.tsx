/** Immediate game-styled skeleton for the private Vault route. */
export function VaultLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="mt-5 h-14 rounded-2xl bg-muted" />
        <div className="mt-4 h-14 rounded-2xl bg-muted" />
        <div className="mt-4 h-11 rounded-2xl bg-muted" />
        <div className="mt-4 grid gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-40 rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}
