import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/** Route-level map skeleton that mirrors the final ten-node composition. */
export function GameMapSkeleton(): React.ReactNode {
  return (
    <main
      className="min-h-svh bg-linear-to-b from-amber-100/60 via-background to-primary/8 py-6 dark:from-amber-950/25 sm:py-10"
      aria-busy="true"
      aria-label="Loading your game map"
    >
      <ResponsiveContainer size="xl" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
        <div className="space-y-5">
          <div className="flex gap-2">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-11 flex-1 rounded-full" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton key={index} className="min-h-48 rounded-3xl" />
            ))}
          </div>
        </div>
      </ResponsiveContainer>
    </main>
  );
}
