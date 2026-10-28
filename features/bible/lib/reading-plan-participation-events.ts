/** Explicit local progress edits emit intent only, never a network request.
 * The persistent authenticated Bible provider subscribes; offline previews remain
 * entirely device-only unless that coordinator is deliberately mounted.
 */
import type { ReadingPlanParticipationInput } from "../schemas/reading-plan-participation.schema";
export const PLAN_PARTICIPATION_INTENT =
  "scripture-memo:plan-participation-intent";
export const PLAN_PARTICIPATION_UPDATED =
  "scripture-memo:plan-participation-updated";

/** Called only after an explicit local save/reset has succeeded. */
export function notifyReadingPlanParticipation(
  input: ReadingPlanParticipationInput,
): void {
  window.dispatchEvent(
    new CustomEvent(PLAN_PARTICIPATION_INTENT, { detail: input }),
  );
}
