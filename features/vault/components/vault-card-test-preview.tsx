"use client";

import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { VaultVerseCard } from "@/features/vault/components/vault-verse-card";
import type { VaultVerseItem } from "@/features/vault/types/vault.types";

/** Synthetic public-domain verse content; IDs never reach a persistence action. */
const sampleVerse: VaultVerseItem = {
  verseId: "preview-vault-card",
  reference: "Philippians 4:7",
  translation: "KJV",
  text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
  availableTranslations: ["KJV"],
  packSlugs: ["preview-peace"],
  packNames: ["Peace in every season"],
  isFavorite: true,
  hasPersonalNote: true,
  studyAccess: "AVAILABLE",
  completedStages: ["LEARN", "RECALL", "STRENGTHEN", "MASTER"],
};

/**
 * Exercises the real card layout with disposable fixture state. Favorite waits
 * locally to reveal pending/disabled controls; it never starts a game session.
 * Study navigation uses the real NavigationButton but targets this preview page,
 * not a protected Sanctuary record. This is UI coverage, not authorization QA.
 */
export function VaultCardTestPreview(): React.ReactNode {
  const [locked, setLocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const favorite = (): void => {
    startTransition(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      toast.success("Favorite preview complete. No preference was saved.");
    });
  };

  return (
    <section
      id="vault-card-testing"
      aria-labelledby="vault-card-testing-title"
      className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <h2 id="vault-card-testing-title" className="font-heading text-xl font-bold">
        Vault card testing
      </h2>
      <p className="text-sm text-muted-foreground">
        At 375px, check that the card controls fit. Favorite shows
        pending feedback, then a success message. Sanctuary opens this preview
        page. No gameplay is required.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={locked ? "outline" : "default"}
          aria-pressed={!locked}
          disabled={isPending}
          onClick={() => setLocked(false)}
        >
          Mastered card
        </Button>
        <Button
          type="button"
          variant={locked ? "default" : "outline"}
          aria-pressed={locked}
          disabled={isPending}
          onClick={() => setLocked(true)}
        >
          Locked card
        </Button>
      </div>
      {/* Match a single library card column while allowing narrow mobile space. */}
      <div className="mx-auto w-full max-w-md">
        <VaultVerseCard
          verse={{
            ...sampleVerse,
            studyAccess: locked ? "LOCKED" : "AVAILABLE",
            completedStages: locked ? [] : sampleVerse.completedStages,
          }}
          sanctuaryHref="/admin/testing/features#feature-test-previews"
          isPending={isPending}
          onFavorite={favorite}
        />
      </div>
    </section>
  );
}
