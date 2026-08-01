import { Card, CardContent } from "@/components/ui/card";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "default" | "compact" | "mascot";

export type EmptyStateProps = {
  /** Decorative or meaningful icon representing the absent content. */
  icon?: React.ReactNode;
  /** Concise explanation of what is currently empty. */
  title: string;
  /** Helpful next-step guidance rather than a dead-end message. */
  description: string;
  /** Optional call to action, commonly a Button or Link-wrapped Button. */
  action?: React.ReactNode;
  /** Allows feature-specific placement while retaining shared visual treatment. */
  className?: string;
  /** Selects the standard, filter-scale, or Luna-led visual hierarchy. */
  variant?: EmptyStateVariant;
};

/**
 * Turns an empty collection or unavailable state into an intentional next step.
 *
 * A softly elevated game-card treatment keeps the state visually engaging while
 * the action slot lets each owning feature decide the safest available recovery.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps): React.ReactNode {
  const compact = variant === "compact";
  const mascot = variant === "mascot";

  return (
    <Card
      className={cn(
        "border border-dashed border-primary/25 bg-card/80 py-10 text-center shadow-sm",
        compact && "py-5 text-left",
        mascot && "overflow-hidden py-7",
        className,
      )}
    >
      <CardContent
        className={cn(
          "mx-auto flex max-w-md flex-col items-center gap-4",
          compact && "max-w-none flex-row text-left",
        )}
      >
        {mascot && (
          <div className="h-44 w-40 shrink-0 sm:h-48 sm:w-44">
            <LunaMascot
              pose="guide"
              decorative
              sizes="(max-width: 640px) 160px, 176px"
              className="h-full w-full"
            />
          </div>
        )}
        {icon && !mascot && (
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-8">
            {icon}
          </div>
        )}
        <div className={cn("space-y-1.5", compact && "min-w-0 flex-1")}>
          <h2 className={cn("font-heading text-xl font-semibold", compact && "text-base")}>
            {title}
          </h2>
          <p className={cn("text-sm leading-6 text-muted-foreground", compact && "leading-5")}>
            {description}
          </p>
          {compact && action && <div className="pt-2">{action}</div>}
        </div>
        {!compact && action && <div className="pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
