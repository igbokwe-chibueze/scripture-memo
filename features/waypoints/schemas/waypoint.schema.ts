import { z } from "zod";

const journeyStageSchema = z.enum(["LEARN", "RECALL", "STRENGTHEN", "MASTER"]);

/** Validates a verse assignment and its required curriculum stage together. */
export const assignWaypointSchema = z.object({
  waypointId: z.string().cuid(),
  verseId: z.string().cuid(),
  journeyStage: journeyStageSchema,
});

export const waypointIdSchema = z.object({ id: z.string().cuid() });

/** Creating a waypoint accepts no client-controlled position or defaults. */
export const createWaypointSchema = z.object({}).strict();

/** A reorder request must describe the complete 220-slot curriculum exactly once. */
export const reorderWaypointsSchema = z
  .object({ orderedWaypointIds: z.array(z.string().cuid()).min(1) })
  .refine(
    ({ orderedWaypointIds }) => new Set(orderedWaypointIds).size === orderedWaypointIds.length,
    { path: ["orderedWaypointIds"], message: "Waypoint order cannot contain duplicates." },
  );
