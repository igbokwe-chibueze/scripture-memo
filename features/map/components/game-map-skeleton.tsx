import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/**
 * Horizontal percentages mirror Map A's alternating trail rhythm. The values
 * are static placeholders only and never attempt to predict learner progress.
 */
const SKELETON_NODE_POSITIONS = [50, 25, 60, 76, 43, 23, 48, 76, 56, 28] as const;

/**
 * Route-level loading composition for the game map.
 *
 * Ten placeholders match the product's group size and preserve layout stability
 * while authentication and the batched repository query resolve. `aria-busy`
 * and the accessible label announce loading without exposing decorative nodes
 * individually to assistive technology.
 */
export function GameMapSkeleton(): React.ReactNode {
  return (
    <main
      className="min-h-svh bg-linear-to-b from-sky-100/70 via-background to-emerald-100/40 py-5 dark:from-sky-950/30 dark:to-emerald-950/20"
      aria-busy="true"
      aria-label="Loading your game map"
    >
      <ResponsiveContainer size="lg" className="space-y-6">
        <div className="mx-auto flex max-w-md flex-col items-center space-y-3 text-center">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full" />
        </div>

        <div className="sticky top-3 z-20 mx-auto flex max-w-xl items-center gap-3 rounded-3xl border bg-background/90 p-3 shadow-xl">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-44" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>

        <div className="relative mx-auto h-[84rem] w-full max-w-[30rem] overflow-hidden rounded-[2.5rem] border bg-muted/35">
          <Skeleton className="absolute inset-0 rounded-[2.5rem] opacity-35" />
          {/* Use the same 120px vertical cadence as the live trail so the page
              does not jump dramatically when real waypoint nodes replace it. */}
          {SKELETON_NODE_POSITIONS.map((left, index) => (
            <div
              key={`${left}-${index}`}
              className="absolute -translate-x-1/2"
              style={{ left: `${left}%`, top: 60 + index * 120 }}
            >
              <Skeleton className="size-20 rounded-full" />
              <Skeleton className="mx-auto mt-4 h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </ResponsiveContainer>
    </main>
  );
}
