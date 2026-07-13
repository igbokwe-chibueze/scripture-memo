/** Stable action identifiers used by verse-management audit records. */
export const VERSE_AUDIT_ACTIONS = {
  create: "CREATE_VERSE",
  update: "UPDATE_VERSE",
  archive: "ARCHIVE_VERSE",
  publish: "PUBLISH_VERSE",
  bulkImport: "BULK_IMPORT_VERSES",
} as const;
