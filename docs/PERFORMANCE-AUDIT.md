# Phase 31 Performance and Polish Audit

**Status:** In progress  
**Started:** 2026-09-01

This document records Phase 31 evidence and remaining checks. It prevents a
passing automated check from being mistaken for a completed mobile or visual
review.

## Automated baseline

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- Non-database automated suites: 100 tests passed.
- Explicit TypeScript `any` audit: no matches in application source.
- Production `console.log` and `debugger` audit: no matches in application
  source.
- Prisma import audit: application queries remain repository-owned.

## Corrections completed

### Database operations

- The Vault summary previously loaded profile, streak, and settings with three
  independent one-to-one queries. It now selects those relations through one
  narrow learner query, reducing a normal Vault load from seven queries to five.
- Gameplay session rendering previously loaded settings and Beacon profile data
  separately. It now selects both one-to-one relations through one narrow
  learner query, reducing the shared gameplay render from five queries to four.
- Neither change adds writes, polling, transactions, or broader record payloads.

### Reduced motion

- Added one shared client preference that combines the operating-system media
  query with Scripture Memo's saved `reduce-motion` setting. Framer-based
  celebrations, route feedback, hints, confetti, and map scrolling now consume
  the combined signal instead of assuming CSS can stop JavaScript animation.
- Oil Shop purchase celebration entry, particles, radial effects, product
  entrance, and hint-balance count-up now become static when either reduced-
  motion source is enabled.
- Beacon level-up copy no longer runs a zero-duration pulse keyframe sequence
  under reduced motion; it renders directly at its final scale.

## Manual verification

- 2026-09-14: The project owner passed all three Oil Shop purchase preview
  checks at `/ui-foundation` with the saved in-app Reduced Motion preference
  enabled: no particles, no entrance/radial animation, and the final hint
  balance appears immediately without counting up.
- The owner directed work to continue with the remaining audit. Do not request
  the accepted preview again; OS-only coverage was not separately reported.

## Source review — 2026-09-14

- Map, Day Selection, and badge collection batch related learner progress;
  their reviewed reads do not query inside a waypoint/day/badge loop.
- Session and shared settings reads already use request-scoped React `cache`.
  Narrowed settings to its eight returned preference fields, omitting internal
  row IDs and timestamps. Query count and returned behavior remain unchanged.
- Notification shell reads are capped at 30 and do not poll. Presence reports
  only while visible, every 15 minutes plus mount/visibility events: four
  periodic action calls per visible hour, excluding lifecycle events. This is
  not a count of physical SQL operations.
- Existing schema indexes cover published waypoint ordering, learner progress
  identity, notification owner/date ordering, and weekly membership identity.
  No index migration was justified by this source-only review.
- Leaderboard responses are bounded, but ranking evaluates the eligible
  population. Joined/COALESCE ordering still needs representative local query
  plans and timings; existing indexes do not prove sort avoidance.
- Map, Vault, and leaderboard views compose server-loaded data with interactive
  children. No client directive was found in feature `views/` files. Deeper
  client dependency and bundle measurement remains open.
- Fellowship detail selection and Vault header navigation findings were
  corrected in the follow-up below. Full-roster growth remains a measurement
  concern; pagination would require a separately defined UX.
- Validation: TypeScript and focused settings-repository ESLint passed.

This is source evidence, not runtime latency or mobile acceptance. Earlier
Vault/gameplay query counts describe repository calls; physical SQL counts
remain to be measured.

## Fellowship and Vault follow-up — 2026-09-14

- Fellowship detail applies public-or-member visibility in the database lookup
  and retains its output visibility guard. Request selection is scoped to the
  authenticated leader; ordinary viewers no longer load applicant rows only
  to discard them. Selected fields match the existing returned DTO.
- Removed the redundant member relation count: the full roster already supplies
  its exact length. Existing roster rank/tie ordering and the 50-request limit
  remain unchanged. No write, transaction, or migration was added.
- Vault header destinations now use NavigationButton and the existing localized
  `Vault.opening` copy. Shared button variants supply visuals; mobile controls
  stack with a minimum 44px height, expanding to a row at larger widths.
- TypeScript, focused ESLint, six Fellowship schema tests, two i18n tests, and
  whitespace checks pass. These schema tests do not exercise database visibility
  filters; no database integration test or query-plan measurement ran.
- Visual acceptance passed: the project owner confirmed the Vault header's
  375px navigation check on 2026-09-14, covering Return to trail and Badge
  collection fit, pending feedback, and destinations. Do not repeat this check.
- Repository runtime coverage is implemented in
  `features/fellowships/repositories/fellowship.repository.test.ts`, covering
  leader/member/visitor access to public/private detail, request privacy,
  invite privacy, member ranking/count, and missing slugs. Execution was blocked
  during preflight: the configured test database lacks `FellowshipJoinRequest`.
  No fixtures were created. The existing migration is
  `20260804135748_fellowship_join_requests`; the test resource's complete
  migration status needed review before updating its schema. Superseded by the
  local isolation resolution below: Fellowship integration now passes locally.

## Route-state continuation — 2026-09-14

- Inventoried all 21 non-admin/product/auth pages (excluding development
  previews). Every page resolves a loading and error boundary through its route
  ancestors. This is file coverage, not rendered acceptance.
- Map, Day Selection, gameplay, Vault, Badges, Sanctuary, Oil Shop, leaderboard,
  and Fellowships have dedicated loading files. Settings, onboarding, and Home
  inherit protected loading; auth/public invitations inherit root loading.
- Source checks found Settings save and Sanctuary save/favorite use shared
  pending controls. Leaderboard and Vault expose explicit empty states.
- Corrected Vault verse-card Sanctuary navigation to use NavigationButton with
  localized pending feedback. Replay uses LoadingButton with spinner/disabled
  state. These card actions stack on mobile. The accepted Vault header was not
  modified, and no replay reward or persistence logic changed.
- Increased the shared error retry control to the required 44px minimum height.
- Fellowship/Oil Shop pending-control gaps and notification read recovery were
  corrected in the follow-ups below. Rendered acceptance remains separate.
- Vault and i18n tests pass (4 total). Browser verification of the changed verse
  card actions/retry target remains open; the earlier header acceptance stands.

### Notification failure recovery

- Individual and bulk read indicators now update only after successful server
  acknowledgement. Rejected actions and thrown connection errors keep notices
  unread, with persistent Sonner feedback and a retryable Read all control.
- Read all uses LoadingButton; notice rows disable during acknowledgement.
  Functional state updates preserve other completed acknowledgements without
  restoring stale snapshots. No extra queries, polling, or server writes were
  introduced. Added pending/retry copy in English, Spanish, and French.
- TypeScript and focused lint passed for the changed components and repository
  test; Vault/i18n suites passed. Fellowship integration is explicitly not a pass
  because its test-schema preflight failed before fixtures.
- Runtime browser checks of notification failure/retry and newly changed card
  controls remain open. No browser tool is available in this session.

## Remaining audit work

### Pending-control follow-up — 2026-09-14

- Fellowship join, request, cancel, invite-code entry, and leader decisions use
  LoadingButton with existing localized pending labels. Only the selected
  operation spins; competing mutations remain disabled. Mobile card/decision
  controls stack with 44px minimum targets. Invite input disables during work.
- Desktop and mobile Oil Shop purchases now use LoadingButton while preserving
  existing visual classes, balance checks, and server purchase behavior. The
  accepted purchase celebration was not modified.
- TypeScript, focused ESLint, Fellowship schema tests (6), i18n tests (2), and
  whitespace checks pass. These checks do not validate rendered mobile layout.
- Read-only `prisma migrate status` against the dedicated test resource found
  27 pending migrations out of 31 checked-in migrations, starting with
  `20260723090000_add_gameplay_attempt_lifecycle` and ending with
  `20260829170000_add_admin_gameplay_test_sessions`. This is broader schema drift
  than the missing Fellowship request table. No migration was applied, and no
  environment file or application data was changed. This finding concerned the
  retired hosted test resource, not the current local development database.
  Superseded by the local isolation resolution below; do not migrate that cloud
  resource as routine development work.

### Local test isolation resolved - 2026-09-14

- Existing development remains on port 51214 with all 31 migrations; no schema
  or data writes were made there. Read-only verification found 3 users, 402
  waypoints, and 4 waypoint progress rows.
- A separate named Prisma Local test instance runs on 51224 with all 31
  migrations applied. Active test URLs now point locally; no Cloud contact was
  made during this setup. Same-port database-name changes were proven unsafe.
- Shared guards reject remote URLs, production, host overrides, and reuse of
  the application port. Startup, guarded migrations, and sequential test commands
  are documented in README.
- Waypoint, progression, reward, and Fellowship checks pass locally, with two
  progression lock-race subtests explicitly skipped. Local serialized append
  success does not prove real concurrent locking. Production race coverage is
  still required on an approved concurrent local PostgreSQL environment.
- Updated the progression fixture to include its required user profile. Reward
  verification reconnects after the intentional constraint failure, then checks
  durable balance and ledger state. Production repository logic was unchanged.

### Repeatable notification scenario - 2026-09-23

- Added `/ui-foundation#notification-testing` with three synthetic unread
  system notices and Connection failure, Request rejected, Success, and Empty
  inbox scenarios. Reset scenario restores the fixture and failure counters.
- Production and preview render the same NotificationInbox component, including
  pending/disabled controls, unread state, Sonner errors, and retry handling.
  Only the production NotificationCenter wrapper binds authenticated actions;
  preview callbacks stay in browser memory and make no persistence requests.
- Failure scenarios reject the first attempt for each individual notice and
  Read all independently; repeating the same operation succeeds. An 800 ms
  delay makes pending states observable. No gameplay, real unread notices,
  database fixtures, or browser Offline setting is required.
- The project owner reported all prepared notification tests passed on
  2026-09-23. Notification scenario acceptance is complete; do not request a
  repeat. This verifies the preview's client acknowledgement handling, not
  server authorization, real network behavior, or persisted notification writes.
- Strict TypeScript and focused ESLint pass. Repaired malformed ignored Next.js
  development route declarations using freshly generated `next typegen` output.
- The subsequent Vault verse-card scenario was prepared and accepted on
  2026-09-23. Both that check and the earlier Vault header remain accepted.

### Prepared Vault verse-card scenario - 2026-09-23

- Added `/ui-foundation#vault-card-testing` with mastered and locked sample
  cards. Both preview and production use the same VaultVerseCard markup and
  shared navigation/loading controls. The accepted Vault header is untouched.
- Preview replay waits 1.2 seconds locally, shows pending/disabled feedback,
  then a success toast. It never invokes the replay Server Action or creates
  a session. Study navigation uses NavigationButton to this preview page with
  `?preview=vault-study`; it does not open a synthetic Sanctuary record.
- This checks card layout, replay pending feedback, locked controls, and link
  wiring. It does not verify real session creation, Sanctuary authorization,
  or guaranteed visible navigation delay on a prefetched route.
- Project-owner acceptance passed on 2026-09-23: 375px card fit and stacked
  controls, replay pending/recovery, preview study navigation, disabled locked
  study, and absent locked replay. Do not repeat this check.
- Next: prepare Fellowship pending-control scenarios without requiring the
  owner to create memberships or join requests through normal gameplay.

### Open checks

#### Read-only ranking plan review - 2026-09-15

- Executed the ranking SQL extracted from the repository with parameterized
  local identities using `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` inside a
  read-only transaction on development port 51214. No data/schema writes,
  statistics updates, fixtures, or hosted connections were performed.
- All-time returned three rows (13.714 ms execution); league and Fellowship
  each returned one row (0.376 ms and 1.007 ms). These are single local samples,
  not warm benchmarks or production performance targets. Planning time was
  separately 50.297 ms, 15.980 ms, and 18.348 ms respectively.
- Plans used the weekly score `(weekId, userId)` unique index, league membership
  `(weekId, userId)` and `(cohortId, userId)` indexes, and Fellowship membership
  `(fellowshipId, userId)` unique index. Window ranking still sorts eligible
  rows before filtering the requested page. The three-row profile sequential
  scan is not evidence of a missing index.
- Country input was null for the selected learner, producing an empty constant
  result; this is not a valid country-scope performance measurement. Representative
  country, large-population, and large-roster measurements remain open.
- Extended source review to Oil Shop and Sanctuary: no per-item query loops.
  Shop reads four independent projections/aggregates; existing user-leading hint
  and purchase indexes support its filters, and the catalogue index covers
  active/type filtering (not necessarily cost/name sort elimination). Sanctuary
  uses learner-scoped notes/favorites/progress and existing composite identity,
  verse, and study-position indexes. Physical relation-query counts remain
  unmeasured. No index migration or production code change was justified.
- Notification failure/retry was subsequently accepted on 2026-09-23. Existing
  purchase-preview and Vault-header acceptance also remains valid.

- Inspect high-read repository methods for additional N+1 or duplicated reads.
- Confirm indexes against final high-read filters and ordering.
- Review client-component boundaries on data-heavy screens.
- Verify loading, empty, error, pending, and disabled states route by route.
- Inspect every player-facing route at a 375px viewport for wrapping, clipping,
  horizontal overflow, touch targets, and content hierarchy.
- Manually verify all motion and confetti surfaces with the in-app setting and
  operating-system setting independently enabled.
- Review Sonner messages for concise, consistent game tone.

Phase 31 is not complete until the remaining checks and required project-owner
manual checks pass.

Local setup validation (2026-09-14): strict TypeScript, full ESLint, four guard
unit tests, and all four integration suite commands passed; the two progression
concurrency subtests remain explicitly skipped as documented above.
