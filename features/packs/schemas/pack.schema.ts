import { z } from "zod";

/** Metadata contract for creating and editing a themed learning pack. */
export const packFormSchema = z.object({
  id: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(3, "Pack name must contain at least 3 characters.")
    .max(80, "Pack name cannot exceed 80 characters."),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters."),
});

export type PackFormInput = z.input<typeof packFormSchema>;
export type PackFormValues = z.output<typeof packFormSchema>;

export const packIdSchema = z.object({ id: z.string().cuid() });

export const packVerseSchema = z.object({
  packId: z.string().cuid(),
  verseId: z.string().cuid(),
});

export const reorderPackVersesSchema = z
  .object({
    packId: z.string().cuid(),
    orderedVerseIds: z.array(z.string().cuid()).min(1).max(220),
  })
  .refine(
    (value) => new Set(value.orderedVerseIds).size === value.orderedVerseIds.length,
    { path: ["orderedVerseIds"], message: "Verse order cannot contain duplicates." },
  );
