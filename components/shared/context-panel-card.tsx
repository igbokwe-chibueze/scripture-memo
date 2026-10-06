import { Card, CardContent } from "@/components/ui/card";

/** Shared content frame for concise, route-specific desktop rail information. */
export type ContextPanelCardProps = {
  /** Optional icon that identifies the information without adding another title. */
  icon?: React.ReactNode;
  /** Short route-specific category label. */
  eyebrow: string;
  /** The selected journey item, verse, or achievement. */
  title: string;
  /** One compact line or short paragraph of useful context. */
  description?: React.ReactNode;
  /** Small supporting values such as tags or progress. */
  detail?: React.ReactNode;
  /** Optional route action, normally a NavigationButton. */
  action?: React.ReactNode;
};

/**
 * Keeps contextual rail cards visually consistent and prevents local panels
 * from introducing a second scroll container inside the persistent shell.
 */
export function ContextPanelCard({
  icon,
  eyebrow,
  title,
  description,
  detail,
  action,
}: ContextPanelCardProps): React.ReactNode {
  return (
    <div className="h-full p-3">
      <Card className="max-h-full overflow-hidden border-primary/15 bg-card/90 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-3">
          {icon ? (
            <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-5">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold tracking-[0.14em] text-primary uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-1 line-clamp-2 font-heading text-lg leading-tight font-bold">
              {title}
            </h2>
          </div>
          {description ? (
            <p className="line-clamp-4 text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {detail ? <div className="text-sm">{detail}</div> : null}
          {action ? <div className="pt-1">{action}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
