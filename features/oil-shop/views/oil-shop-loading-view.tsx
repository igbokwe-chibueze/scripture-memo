/** Immediate game-styled skeleton for private Oil Shop navigation. */
export function OilShopLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-11 w-36 rounded-xl bg-muted" />
        <div className="my-6 h-52 rounded-[2rem] bg-muted" />
        <div className="grid grid-cols-2 gap-3"><div className="h-32 rounded-3xl bg-muted" /><div className="h-32 rounded-3xl bg-muted" /></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-56 rounded-[2rem] bg-muted" /><div className="h-56 rounded-[2rem] bg-muted" /><div className="h-56 rounded-[2rem] bg-muted" /></div>
      </div>
    </main>
  );
}
