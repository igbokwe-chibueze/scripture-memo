/** Stable audit identifiers for curriculum waypoint mutations. */
export const WAYPOINT_AUDIT_ACTIONS = {
  create: "CREATE_WAYPOINT",
  assignVerse: "ASSIGN_VERSE_TO_WAYPOINT",
  unassignVerse: "UNASSIGN_VERSE_FROM_WAYPOINT",
  reorder: "REORDER_WAYPOINTS",
  publish: "PUBLISH_WAYPOINT",
  hide: "HIDE_WAYPOINT",
  delete: "DELETE_UNUSED_WAYPOINT",
} as const;
