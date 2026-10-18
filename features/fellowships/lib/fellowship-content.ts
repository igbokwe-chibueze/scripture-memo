/** Shared bounds keep create/manage forms and server validation in agreement. */
export const FELLOWSHIP_INTRODUCTION_LIMIT = 140;
export const FELLOWSHIP_GUIDELINES_LIMIT = 1000;
export const FELLOWSHIP_GUIDELINE_LIMIT = 160;
export const FELLOWSHIP_GUIDELINE_COUNT_LIMIT = 8;

/** Plain-text lines only; empty lines never become empty bullets in the overview. */
export function splitFellowshipGuidelines(value: string): string[] {
  return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}
