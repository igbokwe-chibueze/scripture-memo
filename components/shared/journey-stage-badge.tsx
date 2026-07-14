import type { JourneyStage } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Keeps canonical stage labels and theme-safe semantic colors in one place. */
const stagePresentation: Record<JourneyStage, { label: string; className: string }> = {
  LEARN: {
    label: "Learn",
    className: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  RECALL: {
    label: "Recall",
    className: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  STRENGTHEN: {
    label: "Strengthen",
    className: "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
  MASTER: {
    label: "Master",
    className: "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
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
      className={cn("h-6 px-2.5 font-semibold tracking-wide", presentation.className, className)}
    >
      {presentation.label}
    </Badge>
  );
}
