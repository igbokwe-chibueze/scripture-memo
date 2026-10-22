"use client";

/** Compact player rows share one public-field presentation across lists and discovery. */
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PlayerAvatar } from "@/features/profile";
import { CountryFlag } from "@/components/shared/country-flag";
import { NavigationButton } from "@/components/shared/navigation-button";
import type { FriendListPlayer } from "@/types/player-social.types";
import { FriendControls } from "./friend-controls";
import type { FriendOperation } from "../schemas/friend.schema";

/** Blocked rows stay non-navigable; other rows open the selected player's profile. */
export function FriendPlayerCard({
  player,
  onChanged,
}: {
  player: FriendListPlayer;
  onChanged?: (operation: FriendOperation) => void;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const locale = useLocale();
  const identity = (
    <>
      <PlayerAvatar
        avatarKey={player.avatarKey}
        frameKey={player.avatarFrameKey}
        displayName={player.displayName}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-words font-heading text-xl font-bold">
            {player.displayName}
          </h2>
          {player.countryCode && (
            <CountryFlag
              countryCode={player.countryCode}
              label={
                new Intl.DisplayNames(locale, { type: "region" }).of(
                  player.countryCode,
                ) ?? player.countryCode
              }
              className="h-4 w-6"
            />
          )}
        </div>
        <p className="break-all text-sm text-primary">
          {player.username ? `@${player.username}` : t("noUsername")}
        </p>
        {player.completedWaypoints !== null &&
          player.lifetimeBeaconXp !== null && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <Image
                  src="/images/game-ui/map.png"
                  alt=""
                  width={18}
                  height={18}
                />
                {t("waypointCount", { count: player.completedWaypoints })}
              </span>
              <span className="flex flex-wrap items-center gap-1">
                <Image
                  src="/images/game-ui/beacon.png"
                  alt=""
                  width={18}
                  height={18}
                />
                <strong>
                  {player.lifetimeBeaconXp.toLocaleString(locale)}
                </strong>
                {t("lifetimeBeaconPoints")}
              </span>
            </div>
          )}
      </div>
    </>
  );

  return (
    <article className="flex min-w-0 items-start gap-3 rounded-card border border-border bg-card p-3">
      {player.relationship === "blocked" ? (
        <div className="flex min-w-0 flex-1 items-start gap-3">{identity}</div>
      ) : (
        <NavigationButton
          href={`/profiles/${player.publicId}`}
          pendingLabel={t("opening")}
          prefetch={false}
          variant="ghost"
          className="h-auto min-h-20 min-w-0 flex-1 items-start justify-start gap-3 whitespace-normal p-0 text-left"
        >
          {identity}
        </NavigationButton>
      )}
      <FriendControls
        publicId={player.publicId}
        relationship={player.relationship}
        displayName={player.displayName}
        compact
        onChanged={onChanged}
      />
    </article>
  );
}
