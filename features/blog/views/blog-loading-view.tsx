import { Skeleton } from "@/components/ui/skeleton";
import styles from "../components/blog.module.css";

/** Shared loading boundary provides immediate structure for list/detail/editor. */
export function BlogLoadingView(): React.ReactNode {
  return (
    <div className={styles.container} aria-busy="true" aria-label="Loading articles">
      <Skeleton className="my-6 h-12 w-48 rounded-xl" />
      <Skeleton className="h-44 rounded-3xl" />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}
