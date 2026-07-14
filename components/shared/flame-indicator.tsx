import { FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Displays zero to three explicitly labelled challenge-day flames. */
export function FlameIndicator({
  count,
  className,
}: {
  count: number;
  className?: string;
}): React.ReactNode {
  const safeCount = Math.max(0, Math.min(3, count));

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
      aria-label={`${safeCount} of 3 challenge days complete`}
    >
      {[0, 1, 2].map((index) => (
        <FlameIcon
          key={index}
          aria-hidden="true"
          className={cn(
            "size-4 transition-colors",
            index < safeCount
              ? "fill-amber-400 text-amber-500"
              : "fill-transparent text-muted-foreground/35",
          )}
        />
      ))}
    </span>
  );
}
