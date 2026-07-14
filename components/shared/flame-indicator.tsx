import { FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Displays the Three-Day Challenge as zero to three labelled flame icons.
 * The value is clamped defensively so malformed presentation data cannot
 * overflow. One accessible numeric label communicates state without color,
 * while the decorative icons are hidden to prevent repetitive announcements.
 */
export function FlameIndicator({
  count,
  className,
  compact = false,
}: {
  count: number;
  className?: string;
  /**
   * Uses smaller mobile icons while restoring the standard size at `sm`.
   * Map A opts into this because its controls sit over narrow artwork; cards
   * elsewhere keep the original fixed size by omitting the property.
   */
  compact?: boolean;
}): React.ReactNode {
  // Three is the fixed Glimmer/Glow/Radiance product invariant. Clamping here is
  // visual protection only; the server remains the completion authority.
  const safeCount = Math.max(0, Math.min(3, count));

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
      aria-label={`${safeCount} of 3 challenge days complete`}
    >
      {/* Fixed slots prevent surrounding card layouts from shifting as days
          become complete. */}
      {[0, 1, 2].map((index) => (
        <FlameIcon
          key={index}
          aria-hidden="true"
          className={cn(
            "transition-colors",
            compact ? "size-3 sm:size-4" : "size-4",
            index < safeCount
              ? "fill-amber-400 text-amber-500"
              : "fill-transparent text-muted-foreground/35",
          )}
        />
      ))}
    </span>
  );
}
