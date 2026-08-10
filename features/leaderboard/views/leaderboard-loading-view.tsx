import { Skeleton } from "@/components/ui/skeleton";

/** Preserves the mobile Great Beacon hierarchy while fresh rankings load. */
export function LeaderboardLoadingView(): React.ReactNode {
  return (
    <main className="min-h-dvh px-4 py-7 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-56 rounded-[2rem]" />
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-11 w-28 shrink-0 rounded-xl" />
          <Skeleton className="h-11 w-28 shrink-0 rounded-xl" />
          <Skeleton className="h-11 w-36 shrink-0 rounded-xl" />
        </div>
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </main>
  );
}
