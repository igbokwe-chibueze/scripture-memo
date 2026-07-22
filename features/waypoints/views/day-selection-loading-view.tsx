import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/** Route-level skeleton preserves the mobile Day Selection layout while data loads. */
export function DaySelectionLoadingView(): React.ReactNode {
  return (
    <main className="min-h-svh py-5 sm:py-8">
      <ResponsiveContainer size="lg" className="space-y-5">
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-72 rounded-[2rem]" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      </ResponsiveContainer>
    </main>
  );
}
