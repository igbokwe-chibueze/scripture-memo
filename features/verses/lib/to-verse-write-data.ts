import { normalizeTags } from "@/features/verses/lib/normalize-tags";
import type { VerseFormValues } from "@/features/verses/schemas/verse.schema";
import type { VerseWriteData } from "@/features/verses/types/verse.types";

/** Maps validated form output into the repository's normalized write contract. */
export function toVerseWriteData(values: VerseFormValues): VerseWriteData {
  return {
    reference: values.reference,
    book: values.book,
    chapter: values.chapter,
    verseStart: values.verseStart,
    verseEnd: values.verseEnd === "" ? null : values.verseEnd,
    reflection: values.reflection || null,
    studyNote: values.studyNote || null,
    tags: normalizeTags(values.tags),
    isActive: values.isActive,
    translations: values.translations,
  };
}
