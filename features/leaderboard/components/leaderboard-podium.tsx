"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/shared/country-flag";
import type { LeaderboardEntry, LeaderboardScope } from "@/features/leaderboard/types/leaderboard.types";
import styles from "./leaderboard.module.css";

/** Decorative score artwork stays consistent with the approved player bar. */
export function BeaconScore({ value }: { value: number }): React.ReactNode {
  return (
    <span className={styles.score}>
      <Image src="/images/game-ui/beacon.png" alt="" width={28} height={28} />
      {value.toLocaleString()}
    </span>
  );
}

/**
 * Official top-three ranks only: simulated rivals never receive an official
 * medal. Artwork is layered over bundled portraits; cosmetic inventory is
 * unchanged and equipped frames remain visible in the list and detail dialog.
 */
export function LeaderboardPodium({
  entries,
  scope,
  onSelect,
}: {
  entries: LeaderboardEntry[];
  scope: LeaderboardScope;
  onSelect: (entry: LeaderboardEntry) => void;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  return (
    <section className={styles.podium} aria-label={t("podium")}>
      {[2, 1, 3].map((rank) => {
        const entry = entries.find((candidate) => candidate.rank === rank);
        const metal = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
        // Empty places retain the medal and base without inventing a player.
        const Place = entry ? "button" : "div";
        return (
          <Place
            key={rank}
            id={entry?.isCurrentUser ? "leaderboard-you" : undefined}
            type={entry ? "button" : undefined}
            className={styles.podiumPlayer}
            data-place={rank}
            onClick={entry ? () => onSelect(entry) : undefined}
            aria-label={entry ? `${rank}. ${entry.displayName}` : t("emptyPodiumPlace", { rank })}
          >
            {/* Anchor the portrait to its frame, independently of base height. */}
            <span className={styles.podiumArt}>
              {entry ? (
                <span className={styles.podiumPortrait}>
                  <Image
                    src={`/images/avatars/${entry.avatarKey}.png`}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 70px, 130px"
                    className={styles.portraitImage}
                  />
                </span>
              ) : null}
              <Image
                src={`/images/game-ui/leaderboard/${metal}-frame.png`}
                alt=""
                width={1280}
                height={1280}
                className={styles.medalFrame}
              />
            </span>
            <span className={styles.podiumBase}>
              <Image
                src={`/images/game-ui/leaderboard/${metal}-base.png`}
                alt=""
                fill
                sizes="(max-width: 640px) 120px, 250px"
                className={styles.baseImage}
              />
              {entry ? (
                <span className={styles.podiumDetails}>
                  <span className={styles.podiumName}>
                    <CountryFlag countryCode={entry.countryCode} label={t("countryFlag")} />
                    <span>{entry.displayName}</span>
                  </span>
                  <BeaconScore value={scope === "all-time" ? entry.beaconXp : entry.weeklyXp} />
                </span>
              ) : null}
            </span>
          </Place>
        );
      })}
    </section>
  );
}
