import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  /** The single primary heading describing the current screen. */
  title: string;
  /** Optional supporting copy that clarifies the screen's purpose. */
  description?: string;
  /** Optional game status, action, or control aligned opposite the title. */
  action?: React.ReactNode;
  /** Optional eyebrow content such as a Journey Stage or waypoint label. */
  eyebrow?: React.ReactNode;
  /** Extends layout styling without changing the shared content hierarchy. */
  className?: string;
};

/**
 * Establishes a consistent, mobile-first heading hierarchy across full views.
 *
 * The title remains the semantic page heading while eyebrow and action slots
 * allow game context and controls without forcing each feature to rebuild the
 * same responsive composition.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: PageHeaderProps): React.ReactNode {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="text-balance font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
