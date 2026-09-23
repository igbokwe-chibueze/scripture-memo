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
export function SanctuarySpace({ data }: { data: SanctuaryData }): React.ReactNode {
  return <SanctuaryContent data={data} transport={transport} />;
}
