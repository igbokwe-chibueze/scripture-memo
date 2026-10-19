import { Skeleton } from "@/components/ui/skeleton";
import styles from "../components/session-introduction.module.css";

/** Loading state shaped like the shared authenticated gameplay shell. */
export function SessionReadyLoadingView(): React.ReactNode {
  return (
    <main className={styles.introPage} aria-busy="true" aria-label="Loading challenge">
      <div className={`${styles.introFrame} mx-auto space-y-4 rounded-[2rem] border border-border p-4 lg:space-y-0 lg:gap-4`}>
        <div className="space-y-4">
          <Skeleton className="ml-auto size-11 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-8 rounded-xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </main>
  );
}
