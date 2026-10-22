/** Shared bounded skeleton for profile and friend route transitions. */
import { Skeleton } from "@/components/ui/skeleton";

/** Mirror the mobile identity, controls and list hierarchy while data loads. */
export function SocialLoadingView(): React.ReactNode {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-12 w-36" />
      <Skeleton className="h-48 w-full rounded-card" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-28 w-full" />
    </main>
  );
}
