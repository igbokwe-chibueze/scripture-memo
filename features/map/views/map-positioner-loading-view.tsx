import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/**
 * Preserves the editor's two-column geometry during route transitions. Although
 * the tool performs no remote data fetch, a route-level skeleton satisfies the
 * shared loading contract and avoids a blank frame while its client code loads.
 */
export function MapPositionerLoadingView(): React.ReactNode {
  return (
    <main aria-busy="true" aria-label="Loading map positioner" className="min-h-screen py-10">
      <ResponsiveContainer className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="mx-auto aspect-[360/1340] w-full max-w-[45rem] rounded-[2rem]" />
          <div className="space-y-5">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </ResponsiveContainer>
    </main>
  );
}
