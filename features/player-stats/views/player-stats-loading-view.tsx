/** Stable private-page loading composition using existing semantic skeletons. */
import { Skeleton } from "@/components/ui/skeleton";

/** Match the mobile hierarchy while owner-only aggregates load. */
export function PlayerStatsLoadingView(): React.ReactNode {
  return (
    <main
      className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="h-12 w-36" />
      <Skeleton className="h-36 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96 w-full rounded-card" />
    </main>
  );
}
