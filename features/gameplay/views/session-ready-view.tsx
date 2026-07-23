import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ConstructionIcon, SparklesIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { requireServerSession } from "@/lib/auth/session";
import { gameplayRepository } from "@/features/gameplay/repositories/gameplay.repository";

/** Private session state is excluded from indexing and public discovery. */
export const metadata: Metadata = {
  title: "Challenge ready | Scripture Memo",
  description: "Your private Scripture challenge session is ready.",
  robots: { index: false, follow: false },
};

/**
 * Temporary safe destination proving Phase 12 session creation end to end.
 * Phase 13 replaces this composition with the shared gameplay shell while
 * retaining the authenticated session lookup and ownership boundary.
 */
export async function SessionReadyView({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const { sessionId } = await params;
  const gameSession = await gameplayRepository.getSessionReadyData(
    session.user.id,
    sessionId,
  );
  if (!gameSession?.waypointId || !gameSession.dayLevel || !gameSession.waypoint) {
    notFound();
  }

  return (
    <main className="grid min-h-svh place-items-center bg-linear-to-b from-violet-100/70 via-background to-amber-100/50 py-8 dark:from-violet-950/30 dark:to-amber-950/20">
      <ResponsiveContainer size="sm">
        <section className="mx-auto max-w-xl rounded-[2rem] border bg-card/90 p-6 text-center shadow-2xl shadow-foreground/10 sm:p-9">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20">
            <ConstructionIcon className="size-8" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-black tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">
            {gameSession.dayLevel} · Waypoint {gameSession.waypoint.number}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-black">Challenge ready</h1>
          <div className="mt-3 flex justify-center">
            <JourneyStageBadge stage={gameSession.waypoint.journeyStage} />
          </div>
          <p className="mt-5 text-lg font-bold">{gameSession.verse.reference}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your server-authorized session has been created. The five gameplay
            modes arrive in Phase 13; this temporary screen safely confirms the
            complete Day Selection start flow.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <SparklesIcon className="size-4" aria-hidden="true" />
            Session progress is preserved
          </div>
          <Link
            href={`/game/waypoints/${gameSession.waypointId}`}
            className={buttonVariants({
              variant: "outline",
              className: "mt-7 min-h-11 rounded-xl px-5",
            })}
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Back to challenge days
          </Link>
        </section>
      </ResponsiveContainer>
    </main>
  );
}
