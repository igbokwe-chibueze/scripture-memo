import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavigationButton } from "@/components/shared/navigation-button";
import { VaultIcon } from "lucide-react";
import Image from "next/image";
import { requireServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { ContextPanelCard } from "@/components/shared/context-panel-card";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import styles from "@/features/vault/components/vault.module.css";
import { VaultLibrary } from "@/features/vault/components/vault-library";
import { VaultAdminTestingMenu } from "@/features/vault/components/vault-admin-testing-menu";
import { vaultRepository } from "@/features/vault/repositories/vault.repository";

export const metadata: Metadata = {
  title: "Vault | Scripture Memo",
  description: "Review your private Scripture mastery library and progress archive.",
  robots: { index: false, follow: false },
};

/** Loads the authenticated learner's complete private progress archive. */
export async function VaultView(): Promise<React.ReactNode> {
  const t = await getTranslations("Vault");
  const session = await requireServerSession();
  const data = await vaultRepository.getLibrary(session.user.id);
  const administrator = isAdmin(
    session.user.role as UserRole | null | undefined,
  );
  const replayFixtureVerse = data.completedVerses[0] ?? null;
  const contextualVerse =
    data.masteredVerses[0] ??
    data.completedVerses[0] ??
    data.favoriteVerses[0] ??
    null;

  return (
    <GamePageColumns
      contextPanel={
        contextualVerse ? (
          <ContextPanelCard
            icon={<VaultIcon aria-hidden="true" />}
            eyebrow={t("permanentCollection")}
            title={contextualVerse.reference}
            description={contextualVerse.text ?? t("studyLocked")}
            detail={`${t("completedStages")}: ${contextualVerse.completedStages.length}`}
            action={
              contextualVerse.studyAccess === "AVAILABLE" ? (
                <NavigationButton
                  href={`/sanctuary/${contextualVerse.verseId}`}
                  pendingLabel={t("opening")}
                  size="sm"
                  className="w-full"
                >
                  {t("study")}
                </NavigationButton>
              ) : undefined
            }
          />
        ) : (
          <ContextPanelCard
            icon={<VaultIcon aria-hidden="true" />}
            eyebrow={t("permanentCollection")}
            title={t("noActiveWaypoint")}
            description={t("emptyCompleted")}
          />
        )
      }
    >
      <main className={styles.page}>
        <header className={styles.header}>
          <Image src="/images/game-ui/vault.png" alt="" width={76} height={76} priority />
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">{t("vaultHeading")}</h1>
          <NavigationButton href="/vault/badges" pendingLabel={t("opening")} variant="secondary" className="ml-auto min-h-11 px-3">
            <Image src="/images/game-ui/badges.png" alt="" width={25} height={25} />
            {t("badgesButton")}
          </NavigationButton>
          <p className={styles.subtitle}>{t("collectionSubtitle")}</p>
        </header>
        {administrator && (
          <div className="mb-5 flex justify-end">
            <VaultAdminTestingMenu verse={replayFixtureVerse} />
          </div>
        )}
        <VaultLibrary data={data} />
      </main>
    </GamePageColumns>
  );
}
