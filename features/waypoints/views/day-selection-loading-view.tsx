import { Skeleton } from "@/components/ui/skeleton";
import styles from "../components/day-selection.module.css";

/** Route-level skeleton preserves the mobile Day Selection layout while data loads. */
export function DaySelectionLoadingView(): React.ReactNode {
  return (
    <main className={styles.page} aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-11 w-32 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl lg:h-56" />
        <Skeleton className="h-14 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44 rounded-2xl lg:h-80" />
          ))}
        </div>
      </div>
    </main>
  );
}
