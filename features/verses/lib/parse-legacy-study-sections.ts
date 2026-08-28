import type { VerseStudySectionType } from "@/lib/generated/prisma/enums";
import { STUDY_SECTION_DEFINITIONS } from "@/features/verses/constants/study-sections";

export type ParsedLegacyStudySection = {
  type: VerseStudySectionType;
  position: number;
  content: string;
};

/**
 * Maps the headings used by the audited study-guide document to stable types.
 *
 * This compatibility map belongs at the import boundary. The reader must never
 * infer a card's meaning from human-authored heading text because an editor may
 * rename or translate that heading later.
 */
const LEGACY_HEADING_TYPES = new Map<string, VerseStudySectionType>([
  ["book background", "BOOK_BACKGROUND"],
  ["historical & cultural context", "HISTORICAL_CONTEXT"],
  ["historical and cultural context", "HISTORICAL_CONTEXT"],
  ["study note", "STUDY_NOTE"],
  ["key lesson", "KEY_LESSON"],
  ["application", "APPLICATION"],
  ["cross references", "CROSS_REFERENCES"],
  ["cross-references", "CROSS_REFERENCES"],
  ["word study", "WORD_STUDY"],
  ["prayer", "PRAYER"],
]);

/** Removes only the known title and verse preamble from an imported guide. */
function removeImportedPreamble(markdown: string): string {
  const paragraphs = markdown
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim());

  if (/^\*\*.+study guide\*\*$/i.test(paragraphs[0] ?? "")) {
    paragraphs.shift();
  }

  const possibleVerse = paragraphs[0] ?? "";
  if (possibleVerse.startsWith("*") && possibleVerse.endsWith("*")) {
    paragraphs.shift();
  }

  return paragraphs.join("\n\n").trim();
}

/**
 * Converts the previous single Markdown guide into typed, ordered sections.
 *
 * This function is intentionally pure so migrations, seeders, and CSV imports
 * all interpret legacy content identically. Unknown headings are ignored rather
 * than being assigned to the wrong card. A heading-free note is preserved as a
 * general Study Note, which keeps older hand-entered content from disappearing.
 */
export function parseLegacyStudySections(
  markdown: string | null | undefined,
): ParsedLegacyStudySection[] {
  if (!markdown?.trim()) return [];

  const readerMarkdown = removeImportedPreamble(markdown);
  const headingPattern = /^##\s+(.+)$/gm;
  const matches = [...readerMarkdown.matchAll(headingPattern)];

  if (matches.length === 0) {
    const studyNotePosition = STUDY_SECTION_DEFINITIONS.findIndex(
      ({ type }) => type === "STUDY_NOTE",
    );

    return [
      {
        type: "STUDY_NOTE",
        position: studyNotePosition + 1,
        content: readerMarkdown,
      },
    ];
  }

  const byType = new Map<VerseStudySectionType, string>();
  matches.forEach((match, index) => {
    const heading = match[1]?.trim().toLocaleLowerCase("en") ?? "";
    const type = LEGACY_HEADING_TYPES.get(heading);
    if (!type || byType.has(type)) return;

    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? readerMarkdown.length;
    const content = readerMarkdown.slice(contentStart, contentEnd).trim();
    if (content) byType.set(type, content);
  });

  return STUDY_SECTION_DEFINITIONS.flatMap((definition, index) => {
    const content = byType.get(definition.type);
    return content
      ? [{ type: definition.type, position: index + 1, content }]
      : [];
  });
}
