import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookHeartIcon, BookOpenTextIcon } from "lucide-react";
import { ContextPanelCard } from "@/components/shared/context-panel-card";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { NavigationButton } from "@/components/shared/navigation-button";
import { requireServerSession } from "@/lib/auth/session";
import { SanctuarySpace } from "@/features/sanctuary/components/sanctuary-space";
import { SanctuaryLocked } from "@/features/sanctuary/components/sanctuary-locked";
import {
  SanctuaryContentsNavigation,
  SanctuaryStudyContent,
} from "@/features/sanctuary/components/sanctuary-study-content";
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
  const [result, t] = await Promise.all([
    sanctuaryRepository.getSanctuary(session.user.id, verseId),
    getTranslations("Sanctuary"),
  ]);
  if (!result) notFound();
  if (result.status === "locked") {
    const waypointId = await sanctuaryRepository.getActiveWaypointId(
      session.user.id,
      verseId,
    );
    return (
      <GamePageColumns
        contextPanel={
          <ContextPanelCard
            icon={<BookHeartIcon aria-hidden="true" />}
            eyebrow={t("eyebrow")}
            title={result.reference}
            description={t("lockedBody")}
          />
        }
      >
        <SanctuaryLocked reference={result.reference} waypointId={waypointId} />
      </GamePageColumns>
    );
  }
  return (
    <GamePageColumns
      contextPanel={
        <ContextPanelCard
          icon={<BookHeartIcon aria-hidden="true" />}
          eyebrow={t("eyebrow")}
          title={result.data.reference}
          description={result.data.verseText}
          detail={
            <div className="space-y-2 text-muted-foreground">
              <p>{result.data.translation}</p>
              {result.data.tags.length > 0 ? (
                <p className="line-clamp-2">
                  {result.data.tags.join(" · ")}
                </p>
              ) : null}
              <p>{t("contextSectionCount", { count: result.data.studySections.length })}</p>
            </div>
          }
          action={
            <NavigationButton
              href="/vault"
              pendingLabel={t("openingVault")}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <BookOpenTextIcon data-icon="inline-start" aria-hidden="true" />
              {t("backToVault")}
            </NavigationButton>
          }
        />
      }
    >
      <SanctuarySpace
        data={result.data}
        studyContent={<SanctuaryStudyContent data={result.data} />}
        contentsNavigation={<SanctuaryContentsNavigation data={result.data} />}
      />
    </GamePageColumns>
  );
}
