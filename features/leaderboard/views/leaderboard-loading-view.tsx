import { Skeleton } from "@/components/ui/skeleton";

/** Preserves the mobile Great Beacon hierarchy while fresh rankings load. */
export function LeaderboardLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh px-4 py-7 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-11 w-60 rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((scope) => (
            <Skeleton key={scope} className="h-11 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid grid-cols-3 items-end gap-2">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-36 rounded-3xl" />
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </main>
  );
}
