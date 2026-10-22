"use client";

import { useState } from "react";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PurchaseCelebrationDialog,
  type PurchaseCelebration,
} from "@/features/oil-shop";

const previewPurchase: PurchaseCelebration = {
  item: {
    id: "ui-foundation-traveler-pack",
    name: "Small pack",
    description: "Three extra hints for the trail.",
    cost: 120,
    hintQuantity: 3,
  },
  previousHintBalance: 5,
  newHintBalance: 8,
};

const previewAvatar: PurchaseCelebration = {
  kind: "avatar",
  avatarKey: "fox",
  collection: ["lion", "dove", "deer", "fox"],
};

/** Replays the production purchase celebration without changing learner data. */
export function OilShopPurchasePreview(): React.ReactNode {
  const [preview, setPreview] = useState<"hints" | "avatar" | null>(null);

  return (
    <section className="rounded-2xl border border-selection-border/40 bg-linear-to-br from-selection via-card to-reward p-5 shadow-sm dark:from-selection/25 dark:via-card dark:to-reward/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Shop purchase celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Replay the real success screen without spending Glow Points.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" className="min-h-11" onClick={() => setPreview("hints")}>
            <ShoppingBagIcon aria-hidden="true" />
            Preview hint purchase
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => setPreview("avatar")}>
            Preview avatar purchase
          </Button>
        </div>
      </div>
      <PurchaseCelebrationDialog
        celebration={preview === "hints" ? previewPurchase : preview === "avatar" ? previewAvatar : null}
        onClose={() => setPreview(null)}
      />
    </section>
  );
}
