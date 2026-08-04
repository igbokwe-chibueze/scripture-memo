import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state that preserves the Fellowship page composition. */
export function FellowshipLoadingView(): React.ReactNode {
  return <main className="min-h-dvh px-4 py-8"><div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-10 w-56" /><Skeleton className="h-28 rounded-[2rem]" /><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56 rounded-[2rem]" /><Skeleton className="h-56 rounded-[2rem]" /></div></div></main>;
}
