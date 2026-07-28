import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, AwardIcon } from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";
import { BadgeCollection } from "@/features/badges/components/badge-collection";

export const metadata: Metadata = {
  title: "Badge Collection | Scripture Memo",
  description: "Review your private Scripture Memo achievement collection.",
  robots: { index: false, follow: false },
};

/** Loads only the authenticated learner's private badge progress. */
export async function BadgeCollectionView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const badges = await badgeRepository.getUserBadgeProgress(session.user.id);
  const unlockedCount = badges.filter(({ status }) => status === "COMPLETED").length;

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/game"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to game
        </Link>
        <header className="mt-6 rounded-[2rem] bg-linear-to-br from-violet-600 via-indigo-700 to-slate-950 p-6 text-white shadow-xl sm:p-9">
          <AwardIcon className="size-10 text-amber-300" aria-hidden="true" />
          <p className="mt-5 text-xs font-black tracking-[0.2em] text-violet-200 uppercase">
            Your achievements
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black sm:text-5xl">
            Badge Collection
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">
            Every badge marks a real milestone in your Scripture journey.
          </p>
          <p className="mt-5 font-black text-amber-300">
            {unlockedCount} of {badges.length} unlocked
          </p>
        </header>
        <section className="mt-7 space-y-5">
          <BadgeCollection badges={badges} />
        </section>
      </div>
    </main>
  );
}
