"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SanctuaryContent, type SanctuaryTransport } from "./sanctuary-content";
import { SANCTUARY_TEST_DATA } from "../data/sanctuary-test-data";

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
function PreviewRun({
  rejectOnce,
  studyContent,
  contentsNavigation,
}: {
  rejectOnce: boolean;
  studyContent: React.ReactNode;
  contentsNavigation: React.ReactNode;
}): React.ReactNode {
  const [transport] = useState(() => createTransport(rejectOnce));
  return (
    <SanctuaryContent
      data={SANCTUARY_TEST_DATA}
      transport={transport}
      studyContent={studyContent}
      contentsNavigation={contentsNavigation}
      backHref="/admin/testing/features#feature-test-previews"
    />
  );
}

/** Prepared note/favorite checks require no progression or real account writes. */
export function SanctuaryTestPreview({
  studyContent,
  contentsNavigation,
}: {
  studyContent: React.ReactNode;
  contentsNavigation: React.ReactNode;
}): React.ReactNode {
  const [rejectOnce, setRejectOnce] = useState(false);
  const [run, setRun] = useState(0);
  return (
    <section id="sanctuary-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-bold">Sanctuary control testing</h2>
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
      <PreviewRun
        key={run}
        rejectOnce={rejectOnce}
        studyContent={studyContent}
        contentsNavigation={contentsNavigation}
      />
    </section>
  );
}
