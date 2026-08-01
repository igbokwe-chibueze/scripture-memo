import { JourneyStage } from "@/lib/generated/prisma/enums";

const REQUIRED_MASTERY_STAGES = Object.values(JourneyStage);

/** Returns true only when one verse has completed every distinct Journey Stage. */
export function hasCompletedEveryJourneyStage(
  stages: ReadonlySet<JourneyStage>,
): boolean {
  return REQUIRED_MASTERY_STAGES.every((stage) => stages.has(stage));
}
