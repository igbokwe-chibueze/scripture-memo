/** Route fallback mirrors Bible Home without loading account data or controls. */
import { GameArtwork } from "@/components/shared/game-artwork";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

/** Reuse the same card proportions for books, plans and discovery placeholders. */
function CardRowSkeleton(): React.ReactNode {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40 motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((key) => (
          <Skeleton
            key={key}
            className="aspect-[1.125] rounded-card motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}

/** A stable mobile-first shell avoids the old unrelated stack of four list rows.
 * Personal information stays placeholder-only until the authenticated view resolves.
 * Hidden geometry is decorative; one status announces loading without repeated labels.
 */
export async function BibleLoading(): Promise<React.ReactNode> {
  const t = await getTranslations("Bible");
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6" aria-hidden="true">
        <header className="mb-5 flex items-center justify-between gap-3 border-b border-border py-4">
          <div className="flex items-center gap-2">
            <GameArtwork name="bibleOpen" className="size-12" sizes="48px" />
            <span className="font-heading text-3xl">{t("title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-control motion-reduce:animate-none" />
            <Skeleton className="size-14 rounded-full motion-reduce:animate-none" />
          </div>
        </header>
        <Skeleton className="mb-4 h-11 w-36 motion-reduce:animate-none" />
        <main className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
          <div className="relative grid grid-cols-[1.1fr_0.9fr] items-center sm:min-h-56">
            <div className="space-y-2 py-4">
              <Skeleton className="h-9 w-4/5 sm:h-14 motion-reduce:animate-none" />
              <Skeleton className="h-9 w-full sm:h-14 motion-reduce:animate-none" />
              <Skeleton className="h-5 w-5/6 sm:h-7 motion-reduce:animate-none" />
            </div>
            <Skeleton className="-ml-5 aspect-square rounded-card sm:-ml-8 sm:aspect-auto sm:h-60 motion-reduce:animate-none" />
          </div>
          <CardRowSkeleton />
          <div className="space-y-2 rounded-card border border-border bg-card px-4 py-4 sm:px-5">
            <Skeleton className="h-7 w-40 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
          </div>
          <CardRowSkeleton />
          <CardRowSkeleton />
        </main>
      </div>
      {/* Match the dock footprint without offering nonfunctional navigation. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 mx-auto grid max-w-2xl grid-cols-3 gap-1 border-t border-border bg-card px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5"
      >
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="flex h-16 flex-col items-center justify-center gap-1"
          >
            <Skeleton className="size-9 rounded-control motion-reduce:animate-none" />
            <Skeleton className="h-3 w-10 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
