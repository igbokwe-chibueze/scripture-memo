/** Private social hub; tab totals are global while each displayed list is filtered and paginated. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { friendRepository } from "../repositories/friend.repository";
import { friendsPageSchema } from "../schemas/friend.schema";
import { PlayerSearchForm } from "../components/player-search-form";
import { AddFriendsDialog } from "../components/add-friends-dialog";
import { FriendPlayerCard } from "../components/friend-player-card";
import { FriendsShareCard } from "../components/friends-share-card";

export const metadata: Metadata = {
  title: "Friends | Scripture Memo",
  description: "Connect with fellow Scripture Memo learners.",
  robots: { index: false, follow: false },
};

/** Legacy discovery URLs open the dialog; private data is always read for the server actor. */
export async function FriendsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactNode> {
  const requested = friendsPageSchema.parse(await searchParams);
  const input =
    requested.tab === "search"
      ? { ...requested, tab: "friends" as const, q: "", page: 1 }
      : requested;
  const session = await requireServerSession();
  const [data, t, locale] = await Promise.all([
    friendRepository.getPage(session.user.id, input),
    getTranslations("PlayerSocial"),
    getLocale(),
  ]);
  if (!data) notFound();
  const pageLink = (page: number): string =>
    `/friends?${new URLSearchParams({ tab: input.tab, q: input.q, page: String(page) })}`;
  return (
    <GamePageColumns
      contextPanel={<FriendsShareCard publicId={data.ownPublicId} />}
    >
      <main className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
        <header className="space-y-3">
          <NavigationButton
            href={`/profiles/${data.ownPublicId}`}
            pendingLabel={t("opening")}
            variant="secondary"
            className="min-h-11"
            prefetch={false}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToProfile")}
          </NavigationButton>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-heading text-4xl font-bold sm:text-5xl">
              {t("friendsTitle")}
            </h1>
            <AddFriendsDialog
              initiallyOpen={requested.tab === "search"}
              initialQuery={requested.tab === "search" ? requested.q : ""}
            />
          </div>
          <p className="text-muted-foreground">{t("friendsSubtitle")}</p>
        </header>
        <nav
          aria-label={t("friendsTitle")}
          className="flex flex-wrap gap-1 rounded-card border border-border bg-muted p-1"
        >
          {(["friends", "requests", "sent", "blocked"] as const).map((tab) => (
            <NavigationButton
              key={tab}
              href={`/friends?tab=${tab}`}
              pendingLabel={t("opening")}
              variant={input.tab === tab ? "default" : "ghost"}
              aria-current={input.tab === tab ? "page" : undefined}
              aria-label={data.counts[tab] > 0
                ? `${t(`tabs.${tab}`)}: ${data.counts[tab].toLocaleString(locale)}`
                : t(`tabs.${tab}`)}
              className="h-auto min-h-12 min-w-fit flex-1 flex-row gap-1 whitespace-nowrap px-1 py-2 text-xs sm:gap-2 sm:text-sm"
              prefetch={false}
            >
              <span>{t(`tabs.${tab}`)}</span>
              {data.counts[tab] > 0 && (
                <span
                  className={`inline-flex shrink-0 items-center justify-center rounded-full py-0.5 text-xs tabular-nums ${tab === "requests" && data.counts.requests > 0 ? "min-w-6 bg-error px-1.5 text-error-foreground" : ""}`}
                >
                  {data.counts[tab].toLocaleString(locale)}
                </span>
              )}
            </NavigationButton>
          ))}
        </nav>
        <PlayerSearchForm
          key={`${input.tab}:${input.q}`}
          initialQuery={input.q}
          tab={input.tab === "search" ? "friends" : input.tab}
        />
        {data.players.length === 0 ? (
          <EmptyState
            icon={<UsersRoundIcon aria-hidden="true" />}
            title={t(input.q ? "noListMatches" : `empty.${input.tab}`)}
            description={t(
              input.q ? "tryAnotherName" : `emptyHelp.${input.tab}`,
            )}
          />
        ) : (
          <ul className="space-y-3">
            {data.players.map((player) => (
              <li key={player.publicId}>
                <FriendPlayerCard player={player} />
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
        <div className="xl:hidden">
          <FriendsShareCard publicId={data.ownPublicId} />
        </div>
      </main>
    </GamePageColumns>
  );
}
