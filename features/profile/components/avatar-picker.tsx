"use client";

import { CheckIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlayerAvatar } from "@/features/profile/components/player-avatar";
import {
  AVATAR_CATALOG,
  isFreeAvatar,
  AVATAR_FRAME_KEYS,
  type AvatarFrameKey,
  type AvatarKey,
} from "@/features/profile/data/avatar-catalog";
import { cn } from "@/lib/utils";
import { NavigationButton } from "@/components/shared/navigation-button";

export type AvatarPickerProps = {
  avatarKey: AvatarKey;
  frameKey: AvatarFrameKey;
  displayName: string;
  avatarChangeIndicator?: React.ReactNode;
  frameChangeIndicator?: React.ReactNode;
  isPartner: boolean;
  disabled: boolean;
  onAvatarChange: (value: AvatarKey) => void;
  onFrameChange: (value: AvatarFrameKey) => void;
};

/** Mobile-first portrait and Partner-frame selector used by profile settings. */
export function AvatarPicker({
  avatarKey,
  frameKey,
  displayName,
  avatarChangeIndicator,
  frameChangeIndicator,
  isPartner,
  disabled,
  onAvatarChange,
  onFrameChange,
}: AvatarPickerProps): React.ReactNode {
  const t = useTranslations("Settings");
  const shop = useTranslations("Shop");

  return (
    <section className="space-y-6" aria-labelledby="avatar-picker-title">
      <div className="flex items-center gap-4 rounded-3xl border bg-linear-to-br from-primary/10 to-reward/10 p-4">
        <PlayerAvatar
          avatarKey={avatarKey}
          frameKey={isPartner ? frameKey : "default"}
          displayName={displayName || t("player")}
          size="xl"
          loading="eager"
        />
        <div className="min-w-0">
          <h3 id="avatar-picker-title" className="font-heading text-xl font-bold">
            {t("chooseAvatar")}
            {avatarChangeIndicator}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("avatarDescription")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AVATAR_CATALOG.filter((avatar) => isFreeAvatar(avatar.key)).map((avatar) => {
          const isSelected = avatar.key === avatarKey;
          return (
            <button
              key={avatar.key}
              type="button"
              disabled={disabled}
              aria-label={t("selectAnimal", {
                animal: t(`animals.${avatar.key}`),
              })}
              aria-pressed={isSelected}
              onClick={() => onAvatarChange(avatar.key)}
              className={cn(
                "relative grid min-h-24 place-items-center rounded-3xl border-2 bg-muted/55 p-2 transition duration-150 active:translate-y-1",
                isSelected
                  ? "border-primary bg-primary/12 shadow-[0_4px_0_color-mix(in_oklab,var(--primary)_65%,black)]"
                  : "border-border shadow-[0_4px_0_color-mix(in_oklab,var(--border)_70%,black)]",
              )}
            >
              <PlayerAvatar
                avatarKey={avatar.key}
                frameKey="default"
                displayName={t(`animals.${avatar.key}`)}
                size="lg"
              />
              {isSelected ? (
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-4" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <NavigationButton
        href="/oil-shop?tab=avatars"
        pendingLabel={shop("avatars")}
        variant="secondary"
        className="min-h-11"
      >
        {shop("avatars")}
      </NavigationButton>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold">{t("profileFrame")} {frameChangeIndicator}</h3>
            <p className="text-sm text-muted-foreground">
              {isPartner ? t("partnerFrameDescription") : t("standardFrameDescription")}
            </p>
          </div>
          {!isPartner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-selection-subtle px-3 py-1 text-xs font-bold text-selection-text dark:text-selection-text">
              <LockIcon className="size-3.5" aria-hidden="true" />
              {t("partnerOnly")}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {AVATAR_FRAME_KEYS.map((candidateFrame) => {
            const isPremium = candidateFrame !== "default";
            const isLocked = isPremium && !isPartner;
            const isSelected = candidateFrame === frameKey;
            return (
              <button
                key={candidateFrame}
                type="button"
                disabled={disabled || isLocked}
                aria-label={t("selectFrame", {
                  frame: t(`frames.${candidateFrame}`),
                })}
                aria-pressed={isSelected}
                onClick={() => onFrameChange(candidateFrame)}
                className={cn(
                  "relative grid min-h-20 place-items-center rounded-2xl border p-2 transition active:translate-y-1",
                  isSelected ? "border-primary bg-primary/10" : "bg-muted/50",
                  isLocked && "opacity-45",
                )}
              >
                <PlayerAvatar
                  avatarKey={avatarKey}
                  frameKey={candidateFrame}
                  displayName={displayName || t("player")}
                  size="md"
                />
                {isLocked ? (
                  <LockIcon
                    className="absolute right-1 top-1 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
