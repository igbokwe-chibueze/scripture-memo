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

  // WHY: Keep the shell mounted when a Server Action streams refreshed session
  // props. The shell owns the deliberate Continue transition and resets mode
  // state itself; keying by current mode would dismiss its completion dialog.
  return (
    <GameShell
      key={gameSession.id}
      gameSession={gameSession}
      isAdmin={isAdmin(session.user.role as UserRole | null | undefined)}
    />
  );
}
