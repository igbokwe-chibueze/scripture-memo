"use client";

import { useState } from "react";
import { AwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BadgeUnlockScreen } from "@/features/badges/components/badge-unlock-screen";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";

const PREVIEWS = {
  COMMON: {
    id: "preview-common",
    name: "First Steps",
    description: "Complete your first Learn stage.",
    icon: "🌱",
    rarity: "COMMON",
    rewardAmount: 50,
    balance: 500,
  },
  UNCOMMON: {
    id: "preview-uncommon",
    name: "Verse Scholar",
    description: "Master 10 verses.",
    icon: "📚",
    rarity: "UNCOMMON",
    rewardAmount: 100,
    balance: 1_100,
  },
  RARE: {
    id: "preview-rare",
    name: "Perfectionist",
    description: "Complete 10 sessions perfectly on the first attempt.",
    icon: "💯",
    rarity: "RARE",
    rewardAmount: 200,
    balance: 2_400,
  },
  EPIC: {
    id: "preview-epic",
    name: "Scripture Master",
    description: "Master 50 verses.",
    icon: "👑",
    rarity: "EPIC",
    rewardAmount: 350,
    balance: 5_350,
  },
  LEGENDARY: {
    id: "preview-legendary",
    name: "Eternal Light",
    description: "Maintain a 365-day streak.",
    icon: "🌟",
    rarity: "LEGENDARY",
    rewardAmount: 500,
    balance: 8_750,
  },
} as const satisfies Record<string, BadgeUnlockResult>;

/** Replays every rarity treatment without writing badge or reward progress. */
export function BadgeUnlockPreview(): React.ReactNode {
  const [preview, setPreview] = useState<keyof typeof PREVIEWS | null>(null);
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Badge unlock celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify every player-controlled rarity treatment and reward level.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PREVIEWS) as Array<keyof typeof PREVIEWS>).map((rarity) => (
            <Button
              key={rarity}
              type="button"
              variant={rarity === "LEGENDARY" ? "default" : "outline"}
              className={rarity === "LEGENDARY" ? "bg-amber-400 text-slate-950 hover:bg-amber-300" : undefined}
              onClick={() => setPreview(rarity)}
            >
              <AwardIcon aria-hidden="true" />
              {rarity.charAt(0) + rarity.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>
      {preview && (
        <BadgeUnlockScreen badge={PREVIEWS[preview]} onContinue={() => setPreview(null)} />
      )}
    </section>
  );
}
