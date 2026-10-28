"use client";

/** Guided reading is independent of game rewards and synced bookmarks. The
 * owner's schedule is static; completion is explicit and stays in this browser.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BibleIllustratedCard } from "./bible-illustrated-card";
import { useReadingPlanProgress } from "../hooks/use-reading-plan-progress";
import { BibleReadingPlanDetails } from "./bible-reading-plan-details";
import type { PlanChapter } from "../data/new-testament-reading-plan";
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";

/** Discovery card opens the overview without creating progress or fetching text. */
export function BibleReadingPlanCard({
  onOpen,
}: {
  onOpen: (planId: ReadingPlanId) => void;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const bible = useTranslations("Bible");
  const newProgress = useReadingPlanProgress("new-testament");
  const oldProgress = useReadingPlanProgress("old-testament");
  const [showAll, setShowAll] = useState(false);
  // Both schedules are static; each card reads only its own local progress.
  const plans = Object.values(READING_PLANS).map((plan) => {
    const progress = plan.id === "new-testament" ? newProgress : oldProgress;
    const percentage =
      Math.round(
        ((progress?.completedDays.length ?? 0) / plan.days.length) * 1000,
      ) / 10;
    return {
      ...plan,
      title: t(plan.titleKey),
      subtitle: t("planDuration", {
        days: plan.days.length,
        books: plan.bookCount,
      }),
      badge: t("percentage", { value: percentage }),
    };
  });
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold">{t("heading")}</h2>
        <Button
          variant="ghost"
          className="min-h-11"
          aria-expanded={showAll}
          aria-controls="bible-reading-plan-cards"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? bible("showLess") : t("viewMore")}
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
      <div
        id="bible-reading-plan-cards"
        aria-label={t("heading")}
        className={
          showAll
            ? "grid grid-cols-2 gap-3 pb-2"
            : "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3"
        }
      >
        {plans.map((plan) => (
          <BibleIllustratedCard
            key={plan.id}
            title={plan.title}
            subtitle={plan.subtitle}
            src={plan.cover}
            onClick={() => onOpen(plan.id)}
            compactTitle
            presentation="plan"
            badge={plan.badge}
            className={
              showAll
                ? "aspect-[1.125]"
                : "aspect-[1.125] basis-[calc(50%-0.375rem)] snap-start"
            }
          />
        ))}
      </div>
    </section>
  );
}

/** Keep the existing plan entry API while the overview owns phase/day UI. */
export function BibleReadingPlan(props: {
  planId?: ReadingPlanId;
  initialDay: number | null;
  onRead: (chapter: PlanChapter, day: number) => void;
}): React.ReactNode {
  return <BibleReadingPlanDetails {...props} />;
}
