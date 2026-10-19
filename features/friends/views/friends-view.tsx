/** Owner-only social hub. No list of another player's friends is ever queried. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UsersRoundIcon } from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { PlayerAvatar } from "@/features/profile";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { friendRepository } from "../repositories/friend.repository";
import { friendsPageSchema } from "../schemas/friend.schema";
import { FriendControls } from "../components/friend-controls";
import { PlayerSearchForm } from "../components/player-search-form";

export const metadata: Metadata = {
  title: "Friends | Scripture Memo",
  description: "Connect with fellow Scripture Memo learners.",
  robots: { index: false, follow: false },
};

/** Validate bounded filters before any player-directory read. */
export async function FriendsView({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactNode> {
  const input = friendsPageSchema.parse(await searchParams);
  const session = await requireServerSession();
  const [data, t] = await Promise.all([
    friendRepository.getPage(session.user.id, input),
    getTranslations("PlayerSocial"),
  ]);
  if (!data) notFound();
  const pageLink = (page: number): string => `/friends?${new URLSearchParams({
    tab: input.tab, q: input.q, page: String(page),
  })}`;

  return (
    <GamePageColumns contextPanel={(
      <aside className="space-y-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-xl">{t("connectTitle")}</h2>
        <p className="text-muted-foreground">{t("connectDescription")}</p>
        <NavigationButton
          href={`/profiles/${data.ownPublicId}`}
          pendingLabel={t("opening")}
          variant="secondary"
          className="min-h-11"
          prefetch={false}
        >
          {t("myProfile")}
        </NavigationButton>
      </aside>
    )}>
      <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <header className="space-y-3">
          <NavigationButton
            href="/game"
            pendingLabel={t("opening")}
            variant="secondary"
            className="min-h-11"
            prefetch={false}
          >
            {t("journeyHome")}
          </NavigationButton>
          <h1 className="font-heading text-3xl sm:text-4xl">{t("friendsTitle")}</h1>
          <NavigationButton
            href={`/profiles/${data.ownPublicId}`}
            pendingLabel={t("opening")}
            variant="outline"
            className="min-h-11"
            prefetch={false}
          >
            {t("myProfile")}
          </NavigationButton>
        </header>
        <nav
          className="flex flex-wrap gap-3"
          aria-label={t("friendsTitle")}
        >
          {(["friends", "requests", "sent", "search", "blocked"] as const).map((tab) => (
            <NavigationButton
              key={tab}
              href={`/friends?tab=${tab}`}
              pendingLabel={t("opening")}
              variant={input.tab === tab ? "default" : "secondary"}
              aria-current={input.tab === tab ? "page" : undefined}
              className="min-h-11"
              prefetch={false}
            >
              {t(`tabs.${tab}`)}
            </NavigationButton>
          ))}
        </nav>
        {input.tab === "search" && (
          <section className="space-y-2">
            <PlayerSearchForm key={input.q} initialQuery={input.q} />
            <p className="text-sm text-muted-foreground">{t("searchHelp")}</p>
          </section>
        )}
        {data.players.length === 0 ? (
          <EmptyState
            icon={<UsersRoundIcon aria-hidden="true" />}
            title={t(`empty.${input.tab}`)}
            description={t(`emptyHelp.${input.tab}`)}
          />
        ) : (
          <ul className="space-y-4">
            {data.players.map((player) => (
              <li
                key={player.publicId}
                className="space-y-4 rounded-card border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <PlayerAvatar
                    avatarKey={player.avatarKey}
                    frameKey={player.avatarFrameKey}
                    displayName={player.displayName}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-heading text-xl">{player.displayName}</h2>
                    <p className="break-all text-sm text-muted-foreground">
                      {player.username ? `@${player.username}` : t("noUsername")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {input.tab !== "blocked" && (
                    <NavigationButton
                      href={`/profiles/${player.publicId}`}
                      pendingLabel={t("opening")}
                      variant="outline"
                      className="min-h-11"
                      prefetch={false}
                    >
                      {t("viewProfile")}
                    </NavigationButton>
                  )}
                  <FriendControls
                    publicId={player.publicId}
                    relationship={player.relationship}
                    displayName={player.displayName}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <nav
          className="flex flex-wrap justify-between gap-3"
          aria-label={t("pages")}
        >
          {input.page > 1 && (
            <NavigationButton
              href={pageLink(input.page - 1)}
              pendingLabel={t("opening")}
              variant="secondary"
              className="min-h-11"
              prefetch={false}
            >
              {t("previous")}
            </NavigationButton>
          )}
          {data.hasNext && (
            <NavigationButton
              href={pageLink(input.page + 1)}
              pendingLabel={t("opening")}
              variant="secondary"
              className="min-h-11"
              prefetch={false}
            >
              {t("next")}
            </NavigationButton>
          )}
        </nav>
      </main>
    </GamePageColumns>
  );
}
