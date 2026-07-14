import type { JourneyStage, WaypointStatus } from "@/lib/generated/prisma/enums";

/**
 * Stable identifiers used by comparative pre-launch map testing.
 *
 * These values are deliberately presentation-only. They are stored in the
 * browser and URL, never in learner progression, so changing a map cannot alter
 * unlocks, rewards, or any other server-authoritative state.
 */
export type MapVariant = "a" | "b";

/**
 * Read-only, serializable learner state needed to render one curriculum node.
 *
 * The server constructs this minimal DTO rather than passing Prisma records to
 * the client. That prevents accidental exposure of unrelated user or curriculum
 * fields and gives both map variants one stable input contract.
 */
export type MapWaypoint = {
  /** Internal stable key used for React identity and the Day Selection URL. */
  id: string;
  /** Human-facing curriculum number; gaps are valid and must be preserved. */
  number: number;
  /** Canonical display reference used only by the richer Map B preview. */
  reference: string;
  /** Curriculum-owned difficulty stage used only by the Map B badge. */
  journeyStage: JourneyStage;
  /** Persisted learner status, or LOCKED when lazy progress has no row. */
  status: WaypointStatus;
  /** Completed challenge-day count, clamped by the server to the range 0–3. */
  flameCount: number;
  /** True only for the lowest playable unfinished waypoint in the curriculum. */
  isCurrent: boolean;
};

/**
 * One ordered waypoint section rendered independently for predictable performance.
 * Map A uses five nodes per illustration while Map B uses ten nodes per page.
 * Group boundaries use actual curriculum numbers instead of assuming N+1, so
 * legitimate numbering gaps remain visible and navigable.
 */
export type MapWaypointGroup = {
  /** Zero-based UI index, independent of curriculum waypoint numbering. */
  index: number;
  /** First actual waypoint number displayed in this group. */
  startNumber: number;
  /** Last actual waypoint number displayed in this group. */
  endNumber: number;
  /** Ordered nodes mounted for the selected section only. */
  waypoints: MapWaypoint[];
};
