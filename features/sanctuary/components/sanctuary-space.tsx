"use client";

import { SanctuaryContent, type SanctuaryTransport } from "./sanctuary-content";
import { saveSanctuaryNoteAction } from "../actions/save-sanctuary-note.action";
import { toggleSanctuaryFavoriteAction } from "../actions/toggle-sanctuary-favorite.action";
import type { SanctuaryData } from "../types/sanctuary.types";

const transport: SanctuaryTransport = {
  saveNote: saveSanctuaryNoteAction,
  toggleFavorite: toggleSanctuaryFavoriteAction,
};

/** Production binding preserves authenticated note and favorite persistence. */
export function SanctuarySpace({
  data,
  studyContent,
  contentsNavigation,
}: {
  data: SanctuaryData;
  studyContent: React.ReactNode;
  contentsNavigation: React.ReactNode;
}): React.ReactNode {
  return (
    <SanctuaryContent
      data={data}
      transport={transport}
      studyContent={studyContent}
      contentsNavigation={contentsNavigation}
    />
  );
}
