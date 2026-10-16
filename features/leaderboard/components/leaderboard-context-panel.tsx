"use client";

import { useTranslations } from "next-intl";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlayerAvatar } from "@/features/profile";
import type { LeaderboardPageData } from "@/features/leaderboard/types/leaderboard.types";
import { BeaconScore } from "./leaderboard-podium";
import styles from "./leaderboard.module.css";

/** Uses authorized page data without changing the shell-owned Partner card. */
export function LeaderboardContextPanel({
  data,
}: {
  data: LeaderboardPageData;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const player = data.currentUser;
  if (!player) return null;
  const rank = player.rank ?? 1;
  const zone = data.scope !== "league"
    ? null
    : rank <= data.promotionCount
      ? "promotion"
      : data.totalPlayers >= 10 && rank > data.totalPlayers - data.demotionCount
        ? "demotion"
        : "steady";
  // The existing repository pages twenty players starting at rank four.
  const playerPage = Math.max(1, Math.floor((rank - 4) / 20) + 1);
  const query = new URLSearchParams({ scope: data.scope, page: String(playerPage) });
  if (data.activeFellowshipId) query.set("fellowship", data.activeFellowshipId);
  const isOnPage = data.podium.some((entry) => entry.isCurrentUser)
    || data.entries.some((entry) => entry.isCurrentUser);

  return (
    <section className={styles.position}>
      <h2>{t("yourPosition")}</h2>
      <div className={styles.positionCard}>
        <div className={styles.positionIdentity}>
          <PlayerAvatar
            avatarKey={player.avatarKey}
            frameKey={player.avatarFrameKey}
            displayName={player.displayName}
            size="lg"
          />
          <div className="min-w-0">
            <p>{t("rankOf", { rank, count: data.totalPlayers })}</p>
            <strong className="truncate">{player.displayName} ({t("you")})</strong>
            <CountryFlag countryCode={player.countryCode} label={t("countryFlag")} />
          </div>
        </div>
        <BeaconScore value={data.scope === "all-time" ? player.beaconXp : player.weeklyXp} />
        <p>{t("beaconPointsHeader")}</p>
        {zone ? (
          <span className={styles.status} data-zone={zone}>
            {t(zone === "promotion" ? "promote" : zone === "demotion" ? "demote" : "stay")}
          </span>
        ) : null}
        {isOnPage ? (
          <Button
            onClick={() => document.getElementById("leaderboard-you")?.scrollIntoView({ block: "center" })}
          >
            {t("jumpToMe")}
          </Button>
        ) : (
          <NavigationButton href={"/leaderboard?" + query + "#leaderboard-you"} pendingLabel={t("opening")}>
            {t("jumpToMe")}
          </NavigationButton>
        )}
      </div>
    </section>
  );
}
