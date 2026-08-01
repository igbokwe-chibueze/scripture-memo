/** Immediate game-styled skeleton for the private Vault route. */
export function VaultLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh animate-pulse bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="h-72 rounded-[2rem] bg-muted" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-9 h-28 rounded-2xl bg-muted" />
        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-64 rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    </main>
  );
}
