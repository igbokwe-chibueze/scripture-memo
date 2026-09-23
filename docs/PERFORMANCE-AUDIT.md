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

### Prepared Fellowship control scenarios - 2026-09-23

- Added `/ui-foundation#fellowship-testing` with a public group, private group,
  pending cancellation, prefilled invite code, and two pending leader decisions.
  Reset restores every prerequisite without gameplay or account setup.
- Production and preview share directory/request components and transition,
  pending, disabled, toast, and result-handling logic. Production wrappers bind
  authenticated Server Actions; the preview imports no persistence actions and
  changes only synthetic browser state after a 1.2-second delay.
- Success and reject-once/retry modes are available. Verify join, request,
  cancellation, invite entry, approval, and rejection; only the selected action
  should spin and competing mutations within its panel should disable. Directory
  and leader panels are independent, as on their separate production screens.
- Preview navigation and search are contained; link destinations also stay on
  UI Foundation so prefetch cannot resolve synthetic Fellowship IDs.
- Local HTTP verification returned 200 and confirmed the section exists.
  TypeScript, focused lint, and six Fellowship schema tests passed. These are
  not browser-interaction or server authorization/persistence acceptance.
- Owner reported the Fellowship tests passed after the selector-highlight fix
  on 2026-09-23. Acceptance covers the prepared controls and scenarios; do not
  repeat the Fellowship check.

### Prepared Oil Shop control scenarios - 2026-09-23

- Added `/ui-foundation#oil-shop-testing` with a sample pack and synthetic
  balances. Success, reject-once/retry, insufficient balance, and reset are ready
  without gameplay or real Glow spending.
- Production and preview share OilShopContent, including mobile modal/desktop
  detail purchase controls and acknowledgement handling. The production wrapper
  binds the unchanged authenticated purchase and admin diagnostic actions.
  Preview responses use only browser memory; admin diagnostics are hidden.
- Owner reported all prepared Oil Shop control tests passed on 2026-09-23.
  Record functional acceptance separately from the subsequent color correction;
  no repeat of those functional scenarios is required.
- The already accepted purchase celebration is unchanged and needs no retest.
  This preview does not establish real payment/ledger or authorization coverage.

### Oil Shop palette alignment - 2026-09-23

- Owner requested uniformity after the preview showed fixed navy/purple cards
  against the light application theme. Source inspection found hardcoded dark
  surfaces, white copy, purple gradients, and yellow button overrides.
- Balance cards, catalogue, tabs, product rows, desktop detail, and mobile product
  modal now use shared card/background/muted/border and foreground tokens. View
  and purchase buttons use existing shared variants without local color overrides.
  Small amber/violet currency accents have light/dark foreground variants.
- The real shop page background now follows the shared background token. Product
  artwork and the illustrated hero remain; the accepted celebration source is
  unchanged. No global theme or shared button implementation was modified.
- TypeScript, focused ESLint, and local HTTP verification passed. The preview
  returned 200 with the updated card markup. No browser rendering/contrast
  measurement was available; light/dark visual acceptance remains pending.
- Next: inspect the existing Oil Shop preview in light and dark themes, including
  the mobile product modal at 375px and desktop detail card. Functional acceptance
  remains recorded and does not need to be repeated.

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

Fellowship preview correction (2026-09-23): scenario button variants now track the active mode after the owner reported a stale Success highlight. Manual acceptance remains pending.

Purchase success palette follow-up (2026-09-23): owner extended theme alignment to the celebration. Dialog, text, close control, reward panel, and hint counter now use semantic tokens; animation/reduced-motion and purchase behavior are unchanged. Light/dark color acceptance remains pending.

Oil Shop artwork follow-up (2026-09-23): transparent spark/backpack/lantern PNGs
replace the illustrated scenery across catalogue, details, and success thumbnail.
Code supplies semantic theme backgrounds. All three packs are available in the
in-memory preview. Alpha validation, TypeScript, focused ESLint, and preview/
asset HTTP checks passed. Light/dark and 375px visual acceptance remains pending;
previously accepted functional and reduced-motion checks remain accepted.

Oil Shop header follow-up (2026-09-23): compact semantic card header replaces
the dark scene. Luna holding the oil bottle is transparent; text/artwork use
separate columns with wrapping. Loading dimensions align. The existing isolated
shop preview renders the same header. Browser visual acceptance remains pending.

Oil Shop composition follow-up (2026-09-23): live balances moved into the header;
selected pack details use the existing desktop context rail above Partner.
Selected-only View styling and subtle card selection ring added. Below 1280px,
details remain modal. Standalone preview has an inline desktop fallback.
TypeScript, focused lint, diff checks and preview HTTP passed. New composition,
selection switching and header balance update acceptance remain pending.

Selected-pack height correction (2026-09-23): owner rejected the nested scrollbar.
Removed Hint pack label and inner scrolling; artwork yields height before text
and purchase controls. Desktop visual acceptance remains pending.

### Settings save continuation - 2026-09-23

- Owner accepted the latest Oil Shop no-inner-scroll correction. Do not repeat it.
- Reviewed Settings and Sanctuary save feedback. Sanctuary already uses coded
  persistent errors and explicit four-second success toasts (source evidence).
- Settings name, locale, Bible translation, theme and switches were still editable
  during save; they now disable consistently. Thrown transport failures retain
  the draft and show persistent safe feedback. Successful saves reset dirty state.
- Added /ui-foundation#settings-testing using the same form with sample preferences.
  Success, rejection/retry and connection-failure/retry require no account changes.
  Production-only wrapper retains real persistence and preference synchronization.
- Next manual check: at 375px, edit a sample name and save in each scenario.
  Fields lock while pending; failures retain edits; retry succeeds; successful
  saves disable Save until another edit. No previously accepted shop retest needed.
- Validation: TypeScript, focused ESLint, diff checks and preview HTTP/section verification passed.

### Sanctuary control continuation - 2026-09-23

- Owner passed the prepared Settings scenarios. Do not repeat this check.
- Added /ui-foundation#sanctuary-testing with sample verse, note and favorite.
  Production and QA share the rendering and pending/result handling; only the
  production wrapper binds authenticated persistence actions.
- Success and reject-once/retry responses are delayed and in memory. Each action
  rejects independently, and Reset restores the draft and favorite state.
- Owner reported Sanctuary testing passed: prepared 375px Notes/save and heart
  controls, pending feedback, state preservation on rejection, and retry are
  accepted. Do not repeat these scenarios. This is preview acceptance, not
  verification of server authorization or persisted note/favorite writes.
- Validation: TypeScript, focused ESLint, diff checks and preview HTTP/section verification passed.

### OS-only motion follow-up - 2026-09-23

- Source review found that global CSS described an OS fallback but implemented
  only the app reduce-motion class. Added the OS media rule for CSS animations,
  transitions and smooth scrolling, preserving minimal completion durations.
- JavaScript loading/error/hint/confetti/celebration paths consume the shared
  preference; map navigation reads both sources. This is source evidence.
- Added /ui-foundation#motion-testing: read-only OS/app/effective status and CSS
  spin/pulse samples. Existing production preview scenarios follow below it.
- Owner reported the prepared OS-only motion test passed: app Reduced Motion
  off, device reduced motion on, On/Off/On labels, static CSS samples, suppressed
  loading/celebration motion and usable controls. Do not repeat this check.
- TypeScript and focused ESLint passed. This accepts the prepared preview scope;
  it does not establish untested route-specific motion behavior.

### Toast and client-boundary source review - 2026-09-23

- Read-only TypeScript AST inspection covered 485 feature/component TS/TSX files:
  all 47 direct toast.error calls explicitly use duration Infinity. The shared
  showActionError helper also persists errors and includes optional error codes.
- The root Toaster supplies duration 4000. There are 83 direct success/info/warning
  calls; explicit duration overrides were inspected separately. This is source
  configuration evidence, not stopwatch/browser acceptance or full copy approval.
- All 45 files under feature views directories have no use-client directive.
  Sanctuary and leaderboard views were inspected as server-loaded compositions.
  This does not establish the transitive size of their interactive client trees.
- Bundle measurement candidates: SanctuaryContent imports react-markdown and
  remark-gfm inside the client tree; GameShell eagerly imports all five mode
  components, including drag-and-drop dependencies. No speculative lazy-loading
  or server/client restructuring was applied without production size evidence.
- Leaderboard league/country refresh is visibility-gated at 15 minutes: up to
  four scheduled route refreshes per visible hour, excluding initial navigation,
  enrollment and user-driven changes. This is not a physical SQL operation count.
- No application code, database, user preference or dependency changed in this
  review. OS-only motion acceptance was subsequently reported by the owner;
  the earlier Proceed instruction alone was not recorded as a test pass.

### Production bundle baseline - 2026-09-23

- Completed installed Turbopack experimental-analyze --output. Reproducible method
  and exact grouping are in CLIENT-BUNDLE-BASELINE.md; generated local report is
  .next/diagnostics/analyze.
- Route-associated browser JS attribution: Sanctuary 1,304,448 bytes / 26 chunks;
  gameplay 1,345,857 bytes / 28 chunks. Shared modules overlap. These totals are
  not initial downloads, compressed transfer sizes or runtime timings.
- Sanctuary Markdown-family subset: 113,160 bytes. Gameplay modes: 36,013 bytes;
  @dnd-kit packages: 43,998 bytes.
- Next optimization candidate: render static Sanctuary study Markdown on the
  server and compare analyzer output. Do not infer savings from subset size alone.
- Gameplay lazy-loading deferred pending timed-attempt loading design; server
  deadlines continue while chunks load. No application refactor made this session.
- Baseline production attribution is complete. Browser network/timing measurements,
  remaining route reviews and representative database plans remain open.

### Sanctuary client-boundary optimization - 2026-09-23

- Moved static study Markdown, tags, reflection, empty state, and contents lists
  into server-rendered Sanctuary components. The client retains mobile tab state,
  private note editing, favorite state, pending controls, and Sonner feedback.
- The production page and isolated preview pass rendered server content through
  the same interactive shell. Preview data now includes a Markdown study section
  so heading, emphasis, and list rendering can be checked without progression.
- Identical analyzer method reduced route-associated browser JS from 1,304,448
  to 1,155,119 bytes: 149,329 bytes / 11.4%. Associated chunks fell 26 to 25;
  the defined Markdown-family subset fell 113,160 bytes to zero.
- TypeScript, focused ESLint, diff checks, preview HTTP 200, and the production
  analyzer passed. The owner subsequently passed the 375px Study/Notes rendering,
  switching, and desktop alignment check. Do not repeat this regression check.
- Exact method, limits, and before/after figures: CLIENT-BUNDLE-BASELINE.md.

### Day Selection mobile-state continuation - 2026-09-23

- Added `/ui-foundation#day-selection-testing` using the production Day Selection
  composition with completed, ready, and locked cards plus the Recall timing
  notice. The preview needs no curriculum progress or gameplay setup.
- Production keeps the authenticated start action as its default. The preview
  injects delayed in-memory success and reject-once responses, so it creates no
  session, reward, cooldown, progression row, or database operation.
- Next manual check: at 375px, confirm the header, timing rule, cards, status
  badges, and controls have no clipping or horizontal overflow. Start Glow to
  verify pending feedback; retry after the prepared rejection; tap Radiance for
  its blocked explanation.
- TypeScript, focused ESLint, whitespace validation, and preview HTTP/section
  verification passed. The project owner subsequently passed the prepared 375px
  layout, pending/retry, and locked-explanation scenarios. Do not repeat this check.

### Gameplay mobile-state continuation - 2026-09-23

- Added `/ui-foundation#gameplay-testing` using the production gameplay shell,
  representative Glimmer/Learn data, and the first Drag & Drop mode.
- The production start action remains the default. The preview injects delayed
  in-memory success and reject-once responses and uses the existing local test
  hint path. It creates no real attempt, progress, reward, cooldown, or hint use.
- Next manual check: at 375px, inspect the header, menu, progress, Beacon bar,
  mode card, and footer for clipping or horizontal overflow. Verify the local
  hint modal, Begin pending state, reject/retry recovery, and initial Drag & Drop
  layout. Do not submit the sample answer because answer completion is outside
  this isolated shell check.
- TypeScript, focused ESLint, whitespace validation, and preview HTTP/section
  verification passed. Rendered mobile acceptance remains pending.
- The owner's first 375px review rejected the mode-entry card: its horizontal
  flex layout crushed the pace copy, wrapped the mode title poorly, clipped Luna,
  and made the primary action compete with the artwork.
- Reworked the production card mobile-first. The title now owns the full width;
  the compact pace/timer panel and contained Luna form a middle row; and Begin
  spans the card below them. Larger screens retain roomier sizing.
- TypeScript, focused ESLint, whitespace validation, and preview HTTP verification
  pass after the correction. Visual acceptance remains pending.

### Map A mobile floating-control correction - 2026-09-23

- The return-to-current and Trail Navigator controls used the viewport's bottom
  edge on every breakpoint. The fixed mobile navigation occupied that same area
  and painted over them.
- Mobile controls now sit above the navigation and safe-area inset. At `md` and
  above, they retain the original 1rem bottom position beside the desktop rail.
- Unlimited future-trail scrolling is intentionally unchanged at the project
  owner's direction.
- TypeScript, focused ESLint, whitespace validation, and all 10 focused map tests
  pass. Mobile visual acceptance remains pending.
- Panel-animation work is deferred at the owner's request. All recent CSS and
  Framer Motion experiments, manual unmounting, and list-scroll timing changes
  were reverted. The original shared Sheet behavior and centering are restored;
  the mobile floating-button visibility fix remains.
