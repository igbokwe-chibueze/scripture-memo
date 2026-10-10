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
  info: "border-info-border bg-info-subtle text-info-text",
  success: "border-success-border bg-success-subtle text-success-text",
  warning: "border-warning-border bg-warning-subtle text-warning-text",
  danger: "border-error-border bg-error-subtle text-error-text",
  spiritual: "border-selection-border bg-selection-subtle text-selection-text",
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
      className={cn("h-7 gap-1.5 px-2.5 font-bold", toneClasses[tone], className)}
    >
      {icon}
      <span>{status}</span>
    </Badge>
  );
}
