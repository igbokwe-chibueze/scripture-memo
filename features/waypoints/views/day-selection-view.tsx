import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { requireServerSession } from "@/lib/auth/session";
import { DaySelection } from "@/features/waypoints/components/day-selection";
import { buildDayCards } from "@/features/waypoints/lib/day-selection";
import { daySelectionRepository } from "@/features/waypoints/repositories/day-selection.repository";

/** Personalized gameplay preparation pages must never appear in search results. */
export const metadata: Metadata = {
  title: "Choose a challenge day | Scripture Memo",
  description: "Choose the next private challenge in your Scripture journey.",
  robots: { index: false, follow: false },
};

/** Server composition for an authenticated waypoint's Day Selection screen. */
export async function DaySelectionView({
  params,
}: {
  params: Promise<{ waypointId: string }>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const { waypointId } = await params;
  const data = await daySelectionRepository.getDaySelectionData(session.user.id, waypointId);

  // Returning one indistinguishable 404 prevents direct URLs from revealing
  // whether a waypoint is unpublished, archived, missing, or merely locked for
  // this learner.
  if (!data) notFound();
  const cards = buildDayCards(data.dayProgress, new Date());

  return (
    <main className="min-h-svh bg-linear-to-b from-sky-100/70 via-background to-amber-100/40 py-5 dark:from-sky-950/30 dark:to-amber-950/20 sm:py-8">
      <ResponsiveContainer size="lg" className="space-y-5">
        <Link
          href="/game/map"
          className={buttonVariants({
            variant: "ghost",
            className: "min-h-11 rounded-xl px-3",
          })}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to map
        </Link>
        <DaySelection data={data} cards={cards} />
      </ResponsiveContainer>
    </main>
  );
}
