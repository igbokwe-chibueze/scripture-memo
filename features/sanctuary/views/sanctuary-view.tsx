import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireServerSession } from "@/lib/auth/session";
import { SanctuarySpace } from "@/features/sanctuary/components/sanctuary-space";
import { SanctuaryLocked } from "@/features/sanctuary/components/sanctuary-locked";
import { sanctuaryRepository } from "@/features/sanctuary/repositories/sanctuary.repository";

export const metadata: Metadata = {
  title: "Sanctuary | Scripture Memo",
  description: "Your private Scripture reflection and notes space.",
  robots: { index: false, follow: false },
};

/** Renders a completed verse only for the authenticated learner who owns it. */
export async function SanctuaryView({
  params,
}: {
  params: Promise<{ verseId: string }>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const { verseId } = await params;
  const result = await sanctuaryRepository.getSanctuary(session.user.id, verseId);
  if (!result) notFound();
  if (result.status === "locked") {
    const waypointId = await sanctuaryRepository.getActiveWaypointId(
      session.user.id,
      verseId,
    );
    return <SanctuaryLocked reference={result.reference} waypointId={waypointId} />;
  }
  return <SanctuarySpace data={result.data} />;
}
