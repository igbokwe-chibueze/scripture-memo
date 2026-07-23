import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireServerSession } from "@/lib/auth/session";
import { GameShell } from "@/features/gameplay/components/game-shell";
import { gameplayRepository } from "@/features/gameplay/repositories/gameplay.repository";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

/** Private session state is excluded from indexing and public discovery. */
export const metadata: Metadata = {
  title: "Scripture challenge | Scripture Memo",
  description: "Your private Scripture challenge session.",
  robots: { index: false, follow: false },
};

/** Renders only a session owned by the authenticated learner. */
export async function SessionReadyView({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const { sessionId } = await params;
  const gameSession = await gameplayRepository.getSessionProgress(
    session.user.id,
    sessionId,
  );
  if (!gameSession?.waypointId || !gameSession.dayLevel || !gameSession.waypoint) {
    notFound();
  }

  // WHY: A completed mode refreshes this route with a new current mode. The key
  // forces interaction state from the prior mode to unmount instead of leaking
  // a completed attempt or timer into the next mode's shell.
  return (
    <GameShell
      key={`${gameSession.id}:${gameSession.currentMode ?? "complete"}`}
      gameSession={gameSession}
      isAdmin={isAdmin(session.user.role as UserRole | null | undefined)}
    />
  );
}
