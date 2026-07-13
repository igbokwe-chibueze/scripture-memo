/** Administrative documentation for one stable application error condition. */
export type ErrorCatalogEntry = {
  code: string;
  title: string;
  feature: ErrorFeature;
  userMessage: string;
  explanation: string;
  commonCauses: readonly string[];
  examples: readonly string[];
  solutions: readonly string[];
};

/** Planned application domains that may contribute entries to the shared manual. */
export type ErrorFeature =
  | "Authentication"
  | "Users"
  | "Settings"
  | "Verses"
  | "Packs"
  | "Waypoints"
  | "Progression"
  | "Gameplay"
  | "Hints"
  | "Rewards"
  | "Streaks"
  | "Badges"
  | "Vault"
  | "Oil Shop"
  | "Fellowships"
  | "Leaderboards"
  | "Administration"
  | "System";

/**
 * Safe, version-controlled source of truth for coded operational errors.
 *
 * Codes identify conditions, not individual occurrences. Entries deliberately
 * exclude stack traces, SQL details, credentials, private user information, and
 * security-sensitive implementation details because this catalogue is rendered
 * in the browser after the ADMIN page verifies authorization.
 */
export const ERROR_CATALOG = [
  {
    code: "WP-001",
    title: "Waypoint locked by learner history",
    feature: "Waypoints",
    userMessage: "This waypoint cannot be changed because learner history exists.",
    explanation: "Progress, day, or game-session records make the waypoint part of permanent curriculum history. Its assignment, Journey Stage, position, and publication state must remain reproducible.",
    commonCauses: ["A learner unlocked or started the waypoint.", "A day-progress or game-session record already references the waypoint."],
    examples: ["An administrator tries to hide a waypoint after a learner starts Day 1.", "A reorder would shift a progressed waypoint to a different number."],
    solutions: ["Leave the waypoint unchanged.", "Create a new hidden waypoint for replacement curriculum content."],
  },
  {
    code: "WP-002",
    title: "Published waypoint must be hidden before editing",
    feature: "Waypoints",
    userMessage: "Hide this unstarted waypoint before changing its assignment.",
    explanation: "Published curriculum cannot change assignment in place. An unstarted waypoint may still be edited, but it must first return to the hidden draft state.",
    commonCauses: ["The edit request was submitted while the waypoint was published.", "The page was stale after another administrator published the waypoint."],
    examples: ["Changing a published Learn waypoint from one verse to another."],
    solutions: ["Hide the waypoint, edit the assignment, verify the Journey Stage, then publish it again.", "Refresh the page if another administrator changed its status."],
  },
  {
    code: "WP-003",
    title: "Assigned verse is unavailable",
    feature: "Waypoints",
    userMessage: "The selected verse is no longer available for curriculum use.",
    explanation: "Waypoint assignments and publication require a currently published verse. The server rechecks availability even when the selection was shown in an older browser view.",
    commonCauses: ["The verse was archived in another session.", "The waypoint is unassigned."],
    examples: ["An administrator selects a verse, then another administrator archives it before the assignment is saved."],
    solutions: ["Refresh the waypoint page and select a published verse.", "Publish the intended verse before assigning it."],
  },
  {
    code: "WP-004",
    title: "Duplicate non-Master Journey Stage",
    feature: "Waypoints",
    userMessage: "This verse already has that Journey Stage.",
    explanation: "A verse may appear only once as Learn, Recall, or Strengthen. Master may appear more than once.",
    commonCauses: ["The same verse and stage were assigned to another waypoint.", "Two administrators attempted similar assignments concurrently."],
    examples: ["John 3:16 already appears as Recall at waypoint 40 and is assigned as Recall again at waypoint 80."],
    solutions: ["Choose the missing Journey Stage.", "Use Master only when an additional Master appearance is intentional.", "Review the existing waypoint reported by the message."],
  },
  {
    code: "WP-005",
    title: "Journey Stage order conflict",
    feature: "Waypoints",
    userMessage: "The proposed change would place Journey Stages out of order.",
    explanation: "Appearances of the same verse must progress in waypoint order from Learn to Recall to Strengthen to Master and may never move backwards.",
    commonCauses: ["A later stage was placed before an earlier stage.", "Reordering shifted one appearance across another appearance of the same verse."],
    examples: ["A Recall appearance is moved before the verse's Learn appearance."],
    solutions: ["Move the earlier Journey Stage to a lower waypoint number.", "Choose a stage consistent with the verse's surrounding appearances."],
  },
  {
    code: "WP-006",
    title: "Published curriculum would contain a hidden gap",
    feature: "Waypoints",
    userMessage: "Published waypoints must remain a continuous sequence.",
    explanation: "Every published waypoint must appear before every hidden waypoint. This prevents learners from reaching a published waypoint through a missing curriculum position.",
    commonCauses: ["Publishing a waypoint while an earlier waypoint is hidden.", "Hiding a waypoint while a later waypoint remains published.", "Reordering a hidden waypoint before a published waypoint."],
    examples: ["Waypoint 10 is hidden while waypoint 11 is published."],
    solutions: ["Publish earlier waypoints first.", "Hide later published waypoints first.", "Restore a published-prefix followed by hidden drafts in the proposed order."],
  },
  {
    code: "WP-007",
    title: "Journey Stage prerequisite is not published",
    feature: "Waypoints",
    userMessage: "Publish the preceding Journey Stage first.",
    explanation: "Recall requires an earlier published Learn appearance, Strengthen requires an earlier published Recall appearance, and Master requires an earlier published Strengthen appearance for the same verse.",
    commonCauses: ["The preceding stage is hidden or missing.", "The preceding stage is positioned after the waypoint being published."],
    examples: ["Publishing a Strengthen waypoint before the verse's Recall waypoint is published."],
    solutions: ["Assign and publish the immediately preceding Journey Stage at an earlier waypoint.", "Correct the waypoint order before publishing."],
  },
  {
    code: "WP-008",
    title: "Waypoint order is stale",
    feature: "Waypoints",
    userMessage: "The waypoint list changed before this order was saved.",
    explanation: "The server requires the submitted order to contain every current waypoint exactly once. This protects changes made by another administrator after the page loaded.",
    commonCauses: ["Another administrator appended or reordered a waypoint.", "The same page was open in multiple browser tabs."],
    examples: ["A new waypoint is appended while another tab still has an older proposed order."],
    solutions: ["Refresh the page, repeat the intended move, and save again."],
  },
  {
    code: "WP-009",
    title: "Waypoint operation could not be completed",
    feature: "Waypoints",
    userMessage: "The waypoint change could not be saved.",
    explanation: "An unexpected server or database failure prevented the operation from completing. Transactional writes roll back instead of leaving a partial curriculum change.",
    commonCauses: ["A temporary database connection problem.", "A transaction timeout.", "An unexpected persistence failure."],
    examples: ["The database becomes unavailable while an order and its audit record are being saved."],
    solutions: ["Refresh and retry once.", "If the error repeats, inspect sanitized server logs and database availability before retrying."],
  },
  {
    code: "WP-010",
    title: "Waypoint no longer exists",
    feature: "Waypoints",
    userMessage: "The selected waypoint no longer exists.",
    explanation: "The server could not find the waypoint identified by the submitted request. No change was made.",
    commonCauses: ["The page contains stale state.", "Test or maintenance data changed after the page loaded."],
    examples: ["An assignment dialog remains open while its test fixture is removed."],
    solutions: ["Refresh the page and repeat the operation against a current waypoint."],
  },
  {
    code: "VRS-001",
    title: "Verse required by published waypoints",
    feature: "Verses",
    userMessage: "This verse cannot be archived while published waypoints use it.",
    explanation: "Archiving the verse would make live curriculum unavailable. The error message identifies the dependent waypoint numbers without exposing learner data.",
    commonCauses: ["One or more published waypoints are assigned to the verse.", "A waypoint was published after the verse-management page loaded."],
    examples: ["Attempting to archive 1 Peter 5:7 while waypoint 4 is published with that assignment."],
    solutions: ["If no learner history exists, hide dependent waypoints before archiving.", "If learner history exists, keep the historical verse and create replacement curriculum separately."],
  },
  {
    code: "VRS-002",
    title: "Verse content locked by learner history",
    feature: "Verses",
    userMessage: "This verse cannot be edited because learner history exists.",
    explanation: "Once learners have history on a waypoint using the verse, its canonical location, translations, reflection, study note, tags, and status remain permanent so previous gameplay is reproducible.",
    commonCauses: ["A learner started a waypoint assigned to the verse.", "An administrator attempted to update a translation used by historical gameplay."],
    examples: ["Changing the NIV text after a game session already used the earlier wording."],
    solutions: ["Keep the historical verse unchanged.", "Create a new verse record and assign it only to future hidden waypoints."],
  },
  {
    code: "VRS-003",
    title: "Verse operation could not be completed",
    feature: "Verses",
    userMessage: "The verse change could not be saved.",
    explanation: "An unexpected server or database failure prevented the verse operation from completing. Transactional writes roll back rather than leaving content without matching audit evidence.",
    commonCauses: ["A temporary database connection problem.", "A transaction timeout.", "An unexpected persistence failure."],
    examples: ["The database connection closes while archiving a verse and writing its audit entry."],
    solutions: ["Refresh and retry once.", "If the error repeats, inspect sanitized server logs and database availability."],
  },
  {
    code: "PRG-001",
    title: "No playable curriculum is available",
    feature: "Progression",
    userMessage: "No playable waypoint is currently available.",
    explanation: "Progression initialization could not find a published waypoint backed by a published verse. No learner progress was invented for hidden or unavailable curriculum.",
    commonCauses: ["All waypoints are hidden.", "A published waypoint references an archived verse.", "The curriculum has not yet been configured."],
    examples: ["A new learner signs in before an administrator publishes the first waypoint."],
    solutions: ["Publish a valid first waypoint from Admin Waypoints.", "Confirm the assigned verse is published, then retry initialization."],
  },
  {
    code: "PRG-002",
    title: "Waypoint is locked for this learner",
    feature: "Progression",
    userMessage: "Complete the preceding waypoint before starting this one.",
    explanation: "The learner has no unlocked progress record for the requested waypoint. Lazy progression deliberately does not create locked rows for the remaining curriculum.",
    commonCauses: ["A future waypoint URL was opened directly.", "The preceding waypoint is not complete."],
    examples: ["A learner crafts a request for waypoint 20 while only waypoint 4 is unlocked."],
    solutions: ["Return to the game map and continue from the unlocked waypoint.", "Verify earlier completion state if the map appears inconsistent."],
  },
  {
    code: "PRG-003",
    title: "Waypoint is no longer playable",
    feature: "Progression",
    userMessage: "This waypoint is no longer available for play.",
    explanation: "The server rechecked curriculum availability and found that the waypoint or its assigned verse is no longer published.",
    commonCauses: ["An administrator hid an unstarted waypoint.", "The assigned verse was archived before gameplay began.", "The browser contains stale curriculum state."],
    examples: ["A learner leaves the map open while an administrator hides the selected unstarted waypoint."],
    solutions: ["Refresh the game map and select an available waypoint.", "Administrators should verify waypoint and verse publication state."],
  },
  {
    code: "PRG-004",
    title: "Challenge day cooldown is active",
    feature: "Progression",
    userMessage: "This challenge day is not unlocked yet.",
    explanation: "The server's UTC timestamp shows that the required 24-hour cooldown has not elapsed. Client countdowns are display-only and cannot override this decision.",
    commonCauses: ["The previous day was completed less than 24 hours ago.", "A direct request attempted to bypass the countdown."],
    examples: ["Day 2 is requested 23 hours after Day 1 completion."],
    solutions: ["Wait until the displayed unlock time and try again.", "Check server clock health if the timestamp remains incorrect after expiry."],
  },
  {
    code: "PRG-005",
    title: "Previous challenge day is incomplete",
    feature: "Progression",
    userMessage: "Complete the previous challenge day first.",
    explanation: "Challenge days must progress from Glimmer to Glow to Radiance. The server found no completed record for the required preceding day.",
    commonCauses: ["A later day URL was opened directly.", "A stale client showed a day before the preceding completion committed."],
    examples: ["Radiance is requested before Glow is complete."],
    solutions: ["Complete the preceding day from the day-selection screen.", "Refresh after a recent completion before retrying."],
  },
  {
    code: "PRG-006",
    title: "Challenge day is already complete",
    feature: "Progression",
    userMessage: "This challenge day has already been completed.",
    explanation: "A repeat completion request was rejected. The unique learner, waypoint, and day record plus the transactional state check prevent duplicate advancement and future duplicate rewards.",
    commonCauses: ["The completion request was submitted twice.", "A browser retried after the first request committed."],
    examples: ["Two near-simultaneous Day 3 completion requests arrive for the same learner."],
    solutions: ["Refresh the map to view the committed progress.", "Do not retry if the completed state is already visible."],
  },
  {
    code: "PRG-007",
    title: "Challenge day was not started by the server",
    feature: "Progression",
    userMessage: "Start this challenge day before completing it.",
    explanation: "Completion requires an existing server-created in-progress day. This prevents a client from skipping gameplay and sending an untrusted completion claim directly.",
    commonCauses: ["A direct completion request omitted the normal start flow.", "The in-progress record was not created or is stale."],
    examples: ["A crafted request attempts to complete Glimmer without a game session."],
    solutions: ["Start the day from the normal day-selection flow.", "Inspect session creation logs if normal gameplay repeatedly produces this code."],
  },
  {
    code: "PRG-008",
    title: "Progression operation could not be completed",
    feature: "Progression",
    userMessage: "Your progression could not be updated.",
    explanation: "An unexpected server or database failure prevented the progression transaction from committing. Atomic transitions roll back instead of leaving partial day or waypoint state.",
    commonCauses: ["A temporary database connection problem.", "A transaction timeout.", "An unexpected persistence failure."],
    examples: ["The database disconnects while Day 3 and the next waypoint are being committed."],
    solutions: ["Refresh and retry once.", "If the error repeats, inspect sanitized server logs and database availability."],
  },
] as const satisfies readonly ErrorCatalogEntry[];

export type AppErrorCode = (typeof ERROR_CATALOG)[number]["code"];
