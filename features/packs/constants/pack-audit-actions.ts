/** Stable action identifiers used by pack-management audit records. */
export const PACK_AUDIT_ACTIONS = {
  create: "CREATE_PACK",
  update: "UPDATE_PACK",
  addVerse: "ADD_VERSE_TO_PACK",
  removeVerse: "REMOVE_VERSE_FROM_PACK",
  reorderVerses: "REORDER_PACK_VERSES",
  publish: "PUBLISH_PACK",
  hide: "HIDE_PACK",
} as const;
