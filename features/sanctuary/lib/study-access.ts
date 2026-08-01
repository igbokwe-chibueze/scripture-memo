import type { WaypointStatus } from "@/lib/generated/prisma/enums";

export type StudyAccessState = "PRE_STUDY" | "LOCKED" | "PERMANENT" | "UNAVAILABLE";

/** Minimal progress fact needed to evaluate a verse's study window. */
export type VerseStudyProgress = {
  number: number;
  status: WaypointStatus;
};

/**
 * Derives one study state from server-owned waypoint progress.
 *
 * A later active occurrence takes precedence over older completion, preventing
 * a previously learned verse from remaining visible during Recall, Strengthen,
 * or Master practice. Locked future curriculum records do not revoke access
 * until progression actually unlocks that occurrence.
 */
export function getStudyAccessState(progress: VerseStudyProgress[]): StudyAccessState {
  const ordered = [...progress].sort((left, right) => right.number - left.number);
  const active = ordered.find(({ status }) => status !== "COMPLETED" && status !== "LOCKED");
  if (active?.status === "IN_PROGRESS" || active?.status === "COOLDOWN") return "LOCKED";
  if (active?.status === "UNLOCKED") return "PRE_STUDY";
  if (ordered.some(({ status }) => status === "COMPLETED")) return "PERMANENT";
  return "UNAVAILABLE";
}

/** Study content is visible only at the two approved ends of the practice loop. */
export function isStudyAvailable(state: StudyAccessState): boolean {
  return state === "PRE_STUDY" || state === "PERMANENT";
}
