import { z } from "zod";

/** Shared identifier validation for every private Sanctuary mutation. */
const sanctuaryVerseIdSchema = z.string().trim().min(1).max(64);

/** Validates the only learner-authored long-form Sanctuary content. */
export const saveSanctuaryNoteSchema = z.object({
  verseId: sanctuaryVerseIdSchema,
  content: z.string().trim().max(5_000, "Keep your note under 5,000 characters."),
});

/** Validates favorite toggles without trusting ownership from the client. */
export const toggleSanctuaryFavoriteSchema = z.object({
  verseId: sanctuaryVerseIdSchema,
});
