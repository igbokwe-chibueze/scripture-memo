import type { JourneyStage } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Keeps canonical stage labels and theme-safe semantic colors in one place. */
const stagePresentation: Record<JourneyStage, { label: string; className: string }> = {
  LEARN: {
    label: "Learn",
    className: "border-border bg-muted text-muted-foreground",
  },
  RECALL: {
    label: "Recall",
    className: "border-border bg-muted text-muted-foreground",
  },
  STRENGTHEN: {
    label: "Strengthen",
    className: "border-border bg-muted text-muted-foreground",
  },
  MASTER: {
    label: "Master",
    className: "border-border bg-muted text-muted-foreground",
  },
};

/**
 * Renders the server-assigned Journey Stage as a compact semantic badge.
 * Callers may adjust responsive sizing, but labels/colors remain centralized.
 * Visible text ensures stage identity never depends on color alone.
 */
export function JourneyStageBadge({
  stage,
  className,
}: {
  stage: JourneyStage;
  className?: string;
}): React.ReactNode {
  const presentation = stagePresentation[stage];

  return (
    <Badge
      variant="outline"
      className={cn("h-6 px-2.5 font-bold tracking-wide", presentation.className, className)}
    >
      {presentation.label}
    </Badge>
  );
}
