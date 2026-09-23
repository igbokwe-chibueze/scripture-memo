"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SanctuaryContent, type SanctuaryTransport } from "./sanctuary-content";
import type { SanctuaryData } from "../types/sanctuary.types";

/** Public-domain verse and synthetic learner state; no real IDs or notes. */
const sample: SanctuaryData = {
  verseId: "preview-sanctuary-verse",
  reference: "Psalm 23:1",
  translation: "KJV",
  verseText: "The LORD is my shepherd; I shall not want.",
  reflection: "Consider the care described in this verse.",
  tags: ["Trust"],
  studySections: [],
  personalNote: "A sample reflection for testing.",
  isFavorite: false,
};

/** Each operation rejects once independently, then succeeds after a visible delay. */
function createTransport(rejectOnce: boolean): SanctuaryTransport {
  let noteAttempted = false;
  let favoriteAttempted = false;
  let favorite = false;
  return {
    saveNote: async () => {
      const reject = rejectOnce && !noteAttempted;
      noteAttempted = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      return reject
        ? { success: false, message: "Sample note rejected. Your draft remains; retry to save." }
        : { success: true, message: "Sample note saved. Your real notes are unchanged." };
    },
    toggleFavorite: async () => {
      const reject = rejectOnce && !favoriteAttempted;
      favoriteAttempted = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      if (reject) return { success: false, message: "Sample favorite rejected. Retry to update." };
      favorite = !favorite;
      return { success: true, message: "Sample favorite updated.", data: { isFavorite: favorite } };
    },
  };
}

/** Remounting resets both synthetic responses and the visible draft/favorite. */
function PreviewRun({ rejectOnce }: { rejectOnce: boolean }): React.ReactNode {
  const [transport] = useState(() => createTransport(rejectOnce));
  return (
    <SanctuaryContent
      data={sample}
      transport={transport}
      backHref="/ui-foundation#sanctuary-testing"
    />
  );
}

/** Prepared note/favorite checks require no progression or real account writes. */
export function SanctuaryTestPreview(): React.ReactNode {
  const [rejectOnce, setRejectOnce] = useState(false);
  const [run, setRun] = useState(0);
  return (
    <section id="sanctuary-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-black">Sanctuary control testing</h2>
      <p className="text-sm text-muted-foreground">
        At 375px, open Notes, edit the sample reflection and save. Check pending
        feedback and retry after rejection. Toggle the heart: rejection keeps it
        unchanged, while success updates it. Only sample state changes.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {([false, true] as const).map((reject) => (
          <Button
            key={String(reject)}
            variant={rejectOnce === reject ? "default" : "outline"}
            aria-pressed={rejectOnce === reject}
            onClick={() => {
              setRejectOnce(reject);
              setRun((current) => current + 1);
            }}
          >
            {reject ? "Reject once, then retry" : "Success"}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setRun((current) => current + 1)}>
          Reset scenario
        </Button>
      </div>
      <PreviewRun key={run} rejectOnce={rejectOnce} />
    </section>
  );
}
