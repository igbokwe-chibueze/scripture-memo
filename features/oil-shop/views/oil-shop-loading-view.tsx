/** Immediate game-styled skeleton for private Oil Shop navigation. */
export function OilShopLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-11 w-36 rounded-xl bg-muted" />
        {/* Balances now live inside the header; reserve one combined surface. */}
        <div className="my-6 h-64 rounded-[2rem] bg-muted sm:h-58" />
        <div className="space-y-3">
          <div className="h-12 rounded-control bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-52 rounded-card bg-muted" />
            <div className="h-52 rounded-card bg-muted" />
            <div className="h-52 rounded-card bg-muted" />
            <div className="h-52 rounded-card bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
