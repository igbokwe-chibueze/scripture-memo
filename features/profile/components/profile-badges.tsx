"use client";

/** Recent awards and a shared modal use only the already-authorized earned-badge DTO. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PlayerProfileData } from "../types/player-profile.types";

/** Keep badges readable on mobile without navigating to the viewer's own collection. */
export function ProfileBadges({
  badges,
  hasMore,
}: {
  badges: PlayerProfileData["badges"];
  hasMore: boolean;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const [open, setOpen] = useState(false);
  const list = (items: PlayerProfileData["badges"]): React.ReactNode => (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((badge) => (
        <li key={badge.id} className="min-w-0 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-2 grid size-16 place-items-center rounded-full border-2 border-primary bg-selection-subtle text-4xl sm:size-20"
          >
            {badge.icon ?? "🏅"}
          </span>
          <h3 className="break-words font-heading text-sm font-bold sm:text-base">
            {badge.name}
          </h3>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold">{t("earnedBadges")}</h2>
        {badges.length > 0 && (
          <Button
            variant="secondary"
            className="min-h-11"
            onClick={() => setOpen(true)}
          >
            {t("viewAll")}
          </Button>
        )}
      </div>
      {badges.length ? (
        list(badges.slice(0, 3))
      ) : (
        <p className="rounded-card border border-border bg-card p-4 text-muted-foreground">
          {t("noBadgesHelp")}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="pr-14">
            <DialogTitle>{t("earnedBadges")}</DialogTitle>
            <DialogDescription>
              {t("badgeCollectionDescription")}
            </DialogDescription>
          </DialogHeader>
          {list(badges)}
          {hasMore && (
            <p className="text-muted-foreground">{t("recentBadges")}</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
