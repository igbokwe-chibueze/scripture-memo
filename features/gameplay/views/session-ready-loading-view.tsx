import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

/** Loading state shaped like the shared authenticated gameplay shell. */
export function SessionReadyLoadingView(): React.ReactNode {
  return (
    <main className="grid min-h-svh place-items-center py-8">
      <ResponsiveContainer size="md">
        <Skeleton className="mx-auto h-[calc(100svh-4rem)] max-w-3xl rounded-[2rem]" />
      </ResponsiveContainer>
    </main>
  );
}
