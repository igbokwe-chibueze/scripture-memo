import { z } from "zod";
import { MAX_VERSE_IMPORT_BYTES } from "@/features/verses/constants/verse-import";

/** Untrusted CSV payload contract shared by preview and confirmation actions. */
export const importVersesInputSchema = z.object({
  csvText: z
    .string()
    .min(1, "Choose a non-empty CSV file.")
    // JavaScript string length is checked here before the exact UTF-8 byte check
    // in the parser, preventing an oversized action payload from doing more work.
    .max(MAX_VERSE_IMPORT_BYTES, "The CSV file cannot exceed 1 MB."),
});
