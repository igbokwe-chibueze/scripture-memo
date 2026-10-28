/** Browser navigation events are untrusted input even though they carry only public references. */
import { z } from "zod";
import { bibleReferenceSchema } from "./bible.schema";
import { readingPlanIdSchema } from "./reading-plan-participation.schema";
import { READING_PLANS } from "../data/reading-plan-catalog";
export const bibleAudioNavigationSchema = z
  .object({
    reference: bibleReferenceSchema,
    plan: z
      .object({
        planId: readingPlanIdSchema,
        day: z.number().int().min(1).max(365),
      })
      .optional(),
    background: z.boolean().optional(),
  })
  .refine(
    ({ reference, plan }) =>
      !plan ||
      READING_PLANS[plan.planId].days[plan.day - 1]?.chapters.some(
        (chapter) =>
          chapter.book === reference.book &&
          chapter.chapter === reference.chapter,
      ),
    { message: "Chapter is not assigned to this plan day." },
  );
export const bibleAudioRestSchema = z
  .object({
    planId: readingPlanIdSchema,
    day: z.number().int().min(1).max(365),
  })
  .refine(
    ({ planId, day }) => READING_PLANS[planId].days[day - 1]?.kind === "rest",
    { message: "Invalid rest day." },
  );
