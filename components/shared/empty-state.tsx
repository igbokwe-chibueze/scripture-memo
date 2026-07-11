import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
}: EmptyStateProps): React.ReactNode {
  return (
    <Card
      className={cn(
        "border border-dashed border-primary/25 bg-card/80 py-10 text-center shadow-sm",
        className,
      )}
    >
      <CardContent className="mx-auto flex max-w-md flex-col items-center gap-4">
        {icon && (
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-8">
            {icon}
          </div>
        )}
        <div className="space-y-1.5">
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
