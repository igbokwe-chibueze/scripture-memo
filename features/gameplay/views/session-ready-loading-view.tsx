import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/** Loading state for the temporary authenticated gameplay destination. */
export function SessionReadyLoadingView(): React.ReactNode {
  return (
    <main className="grid min-h-svh place-items-center py-8">
      <ResponsiveContainer size="sm">
        <Skeleton className="mx-auto h-96 max-w-xl rounded-[2rem]" />
      </ResponsiveContainer>
    </main>
  );
}
