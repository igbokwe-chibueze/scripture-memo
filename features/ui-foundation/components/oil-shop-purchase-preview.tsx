"use client";

import { useState } from "react";
import { ShoppingBagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseCelebrationDialog } from "@/features/oil-shop/components/oil-shop";
import type { PurchaseCelebration } from "@/features/oil-shop/components/oil-shop";

const previewPurchase: PurchaseCelebration = {
  item: {
    id: "ui-foundation-traveler-pack",
    name: "Traveler Pack",
    description: "Three extra hints for the trail.",
    cost: 125,
    hintQuantity: 3,
  },
  previousHintBalance: 5,
  newHintBalance: 8,
};

/** Replays the production purchase celebration without changing learner data. */
export function OilShopPurchasePreview(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-violet-300/40 bg-linear-to-br from-violet-50 via-card to-amber-50 p-5 shadow-sm dark:from-violet-950/25 dark:via-card dark:to-amber-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Shop purchase celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Replay the real success screen without spending Glow Points.</p>
        </div>
        <Button type="button" className="min-h-11 rounded-xl font-black" onClick={() => setIsOpen(true)}>
          <ShoppingBagIcon aria-hidden="true" /> Preview purchase
        </Button>
      </div>
      <PurchaseCelebrationDialog
        celebration={isOpen ? previewPurchase : null}
        onClose={() => setIsOpen(false)}
      />
    </section>
  );
}
