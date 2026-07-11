import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "spiritual";

export type StatusBadgeProps = {
  /** Human-readable state shown inside the pill. */
  status: string;
  /** Semantic color family selected by the owning feature. */
  tone?: StatusBadgeTone;
  /** Optional leading icon reinforcing the status without replacing its label. */
  icon?: React.ReactNode;
  /** Extends the badge for feature-specific sizing or placement. */
  className?: string;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  spiritual: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

/**
 * Displays compact game and workflow state with text-first accessibility.
 *
 * Tones are semantic rather than tied to domain enums so features can map their
 * own states explicitly and avoid silently assigning misleading colors.
 */
export function StatusBadge({
  status,
  tone = "neutral",
  icon,
  className,
}: StatusBadgeProps): React.ReactNode {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 gap-1.5 px-2.5 font-semibold", toneClasses[tone], className)}
    >
      {icon}
      <span>{status}</span>
    </Badge>
  );
}
