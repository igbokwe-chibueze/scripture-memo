import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  /** Short description of the measured value. */
  label: string;
  /** Primary value; accepts formatted text or richer visual content. */
  value: React.ReactNode;
  /** Optional icon that visually identifies the statistic. */
  icon?: React.ReactNode;
  /** Optional context such as a change, rank, or progress qualifier. */
  supportingText?: React.ReactNode;
  /** Extends the card for layout-specific grid behavior. */
  className?: string;
};

/**
 * Gives progression statistics the weight expected in a mobile game interface.
 *
 * The value is placed before supporting detail in reading order, while the icon
 * receives a distinct token-like treatment suitable for points and streaks.
 */
export function StatCard({
  label,
  value,
  icon,
  supportingText,
  className,
}: StatCardProps): React.ReactNode {
  return (
    <Card className={cn("bg-card/90 shadow-sm", className)}>
      <CardContent className="flex items-center gap-3">
        {icon && (
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="font-heading text-2xl font-bold tabular-nums">{value}</div>
          {supportingText && (
            <div className="text-xs text-muted-foreground">{supportingText}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
