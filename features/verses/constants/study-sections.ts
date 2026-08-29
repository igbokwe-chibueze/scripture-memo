import type { VerseStudySectionType } from "@/lib/generated/prisma/enums";

export type StudySectionFormKey =
  | "bookBackground"
  | "historicalContext"
  | "studyNote"
  | "keyLesson"
  | "application"
  | "crossReferences"
  | "wordStudy"
  | "prayer";

export type StudySectionDefinition = {
  key: StudySectionFormKey;
  type: VerseStudySectionType;
  label: string;
  description: string;
};

/**
 * Canonical section order shared by admin writes and learner-facing reads.
 *
 * WHY: Keeping this sequence in one place prevents form order, persistence
 * order, and Sanctuary presentation from drifting apart as the app grows.
 */
export const STUDY_SECTION_DEFINITIONS: StudySectionDefinition[] = [
  {
    key: "bookBackground",
    type: "BOOK_BACKGROUND",
    label: "Book Background",
    description: "Authorship, audience, and the book's purpose.",
  },
  {
    key: "historicalContext",
    type: "HISTORICAL_CONTEXT",
    label: "Historical & Cultural Context",
    description: "The setting and cultural details that clarify the passage.",
  },
  {
    key: "studyNote",
    type: "STUDY_NOTE",
    label: "Study Note",
    description: "The main explanation of the verse and its meaning.",
  },
  {
    key: "keyLesson",
    type: "KEY_LESSON",
    label: "Key Lesson",
    description: "A concise central truth the learner should retain.",
  },
  {
    key: "application",
    type: "APPLICATION",
    label: "Application",
    description: "Practical prompts for living out the passage.",
  },
  {
    key: "crossReferences",
    type: "CROSS_REFERENCES",
    label: "Cross References",
    description: "Related passages, preferably as a Markdown list.",
  },
  {
    key: "wordStudy",
    type: "WORD_STUDY",
    label: "Word Study",
    description: "Important original-language or contextual terms.",
  },
  {
    key: "prayer",
    type: "PRAYER",
    label: "Prayer",
    description: "A short prayer shaped by the verse.",
  },
];
