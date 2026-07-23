# Scripture Memo Project Log

**Last updated:** 2026-07-23
**Purpose:** Concise continuity backup and current-status summary for Codex
development sessions.

This log supplements normal Codex conversation history; it does not replace it.
When conversation history is available, use that history for detailed context
and reasoning, then use this log to confirm the latest completed work, decisions,
blockers, current task, and next step.

The current codebase and Git state are the final authority. Root `AGENTS.md`
governs implementation rules, while `docs/PRODUCT-OVERVIEW.md` and
`docs/ROADMAP.md` govern current product scope and implementation sequence. If
this log or conversation history disagrees with those sources, follow the
authoritative repository sources and correct this log.

## Project Summary

Scripture Memo is a full-stack, mobile-first scripture memorization web
application built with Next.js 16.2.10, strict TypeScript, Prisma 7, PostgreSQL,
Better Auth, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod, and Sonner.

Players progress through an expanding sequential waypoint curriculum
bootstrapped with 220 records. Every waypoint combines a Three-Day Challenge
(Glimmer, Glow, Radiance) with five ordered game modes (Drag & Drop, Puzzle,
Swap, Cue, Fill). Journey Stages (Learn, Recall, Strengthen, Master) control
long-term verse difficulty. Glow Points are the only currency.

## Current Project State

- Branch: `day-selection-screen`.
- Current committed HEAD at this update: `f643428`.
- Phases 0–9 are complete and manually accepted, including bulk CSV import,
  dynamic verse-list search, and admin pack management.
- The public landing page and internal UI-foundation preview are implemented.
- Better Auth registration, login, logout, onboarding, and protected-route flows
  are implemented and accepted.
- The complete product-aware Prisma schema and migrations are present and were
  applied successfully during Phase 3.
- Root `AGENTS.md` is the single authoritative agent instruction file;
  `docs/AGENTS.md` was removed.
- Phase 9 waypoint management, curriculum-history hardening, and Phase 9A's
  application-wide error reference are merged at the current HEAD.
- Phase 10 progression engine is complete with lazy initialization,
  server-authoritative cooldowns, atomic advancement, and real PostgreSQL tests.
- Phase 11 Game Map, shared responsive trail coordinates, and Trail Navigator
  are implemented and have passed automated and project-owner manual acceptance.
- Phase 12 Day Selection is complete and manually accepted, with server-derived
  states, live cooldowns, and atomic session starts.
- Phase 13 Gameplay Shared Engine is complete and manually accepted with the reusable gameplay
  shell, deterministic generators, server-owned ordered attempts, stage-based
  limits, and atomic final-mode/day completion.
- Phase 14 Drag & Drop Mode is complete and manually accepted, including
  desktop/touch placement, feedback audio, victory variants, the completion
  interstitial, Exit navigation, and administrator Test Replay.

## Current Roadmap Position

Phases 0–14 are complete and manually accepted.
Phase 15 — Puzzle Mode is next.

## Completed Work

### Phase 0 — Requirements Lock

- Product, architecture, progression, and security requirements reviewed.
- Next.js 16.2.10 and installed package documentation established as the
  framework authority.

### Phase 1 — Project Bootstrap

- Next.js App Router, strict TypeScript, Tailwind CSS 4, shadcn/ui, required
  dependencies, root route states, Sonner, aliases, and root-based structure.

### Phase 2 — Global UI Foundation

- Required shadcn primitives and shared UI components.
- Data-table building blocks.
- Protected-route loading and error boundaries.
- Light, dark, and system theme support.
- `/ui-foundation` verification page and product-branded public landing page.
- Tailwind CSS 4 canonical utility syntax policy.

### Phase 3 — Database and Prisma Setup

- Prisma 7 PostgreSQL configuration and server-only singleton.
- Better Auth identity tables preserved.
- All domain enums and product models implemented.
- Notes, favorites, account suspension, and non-rewarding Vault replay support.
- Critical relations, indexes, idempotency keys, reward ledger, and duplicate
  completion/badge constraints.
- Migration `20260712014802_complete_product_schema` created and applied.
- Prisma format, validation, client generation, TypeScript, ESLint, generated
  migration inspection, and production build passed.

### Phase 4 — Core Libraries

- Added the generic `ActionResult` discriminated union and an auth-owned action
  demonstrating the contract without implementing Phase 5 early.
- Added UTC-safe date helpers, permission guards, secret-redacting server logs,
  a process-local fixed-window rate limiter, and gameplay constants.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting Glow Points balance for new users.
- TypeScript, ESLint, diff validation, direct date and permission checks, Prisma
  generation, and the production build passed.

## Current Task

Review, commit, and merge the accepted Phase 14 changes.

## Exact Next Task

Begin Phase 15 — Puzzle Mode after the accepted Phase 14 changes are committed
and merged.

## Important Decisions

- Root `AGENTS.md` overrides supporting documents when instructions conflict.
- Available Codex conversation history remains useful and should be read when
  present; this file is only a continuity backup and status summary.
- Repository state, Git state, root `AGENTS.md`, `PRODUCT-OVERVIEW.md`, and
  `ROADMAP.md` outrank both chat history and this log.
- Agents must not rely on chat history alone.
- Changes should remain uncommitted for review in VS Code Source Control unless
  the project owner explicitly asks Codex to commit or push.
- Bulk verse imports skip and report existing or repeated references; they never
  update existing verses. Imports are limited to 100 rows and 1 MB per file.
- Long predefined dropdowns use searchable comboboxes; short lists such as
  status, sort, theme, and translation remain simple selects.
- Every manual verse mutation and bulk import writes an actor-linked `AuditLog`
  record in the same transaction. Update metadata contains changed field names,
  never translation text, reflections, or study-note content.
- Packs start hidden, require at least one published verse before publishing,
  and automatically hide when their final verse is removed.
- Pack ordering uses one-based `PackVerse.position` values and supports pointer,
  touch, keyboard, and explicit arrow-button reordering.
- All 220 waypoint placeholders start hidden and unassigned with provisional
  `LEARN` stage. Assignment requires an explicit stage, and publishing requires
  an assigned, currently published verse.
- The initial 220 waypoints are a bootstrap count, not a maximum. Administrators
  append individual waypoints to one continuous historical sequence without
  year grouping.
- Published waypoints form a continuous prefix. Per verse, Learn, Recall, and
  Strengthen are unique and ordered; Master may repeat.
- Published but unstarted waypoint assignments must be hidden before editing.
  Any learner-linked history permanently locks waypoint ordering, assignment,
  Journey Stage, and visibility; there is no routine override.
- Published waypoint dependencies prevent verse archival. Once learner history
  exists for a verse's waypoint, the verse content is immutable so historical
  gameplay remains reproducible.
- Curriculum topology writes use one shared transaction-scoped PostgreSQL
  advisory lock. Assignment, publication, archival, and content edits also use
  stable per-verse locks so validation cannot race a conflicting mutation.
- Phase 10 creates progress lazily, unlocks the next actually published waypoint
  by database query, and commits completion plus unlocking atomically.
- The learner map uses an original mobile-first winding trail with tactile
  circular nodes. Its three ring segments map exactly to the three completed
  challenge days; decorative presentation must never inflate real progress.
- Every current and future Map A trail illustration uses the shared positions
  `(50,10)`, `(35,30)`, `(65,50)`, `(40,70)`, and `(60,90)` for both mobile and
  large layouts unless the project owner explicitly approves an exception.
- Map A uses a full-height right-side Trail Navigator at every breakpoint. It
  labels groups sequentially as `Trail N`, lists every published trail including
  locked future groups, and permits jumps only to groups with accessible
  waypoints. Custom trail names are intentionally deferred.
- Map A's bottom-right viewport controls are icon-only: one opens the navigator
  and one returns the learner to the current trail after distant scrolling.
- Map A nodes show only their waypoint control and flame progress. Map B restores
  the earlier Scripture reference and Journey Stage preview; Day Selection still
  owns the authoritative full details for both.
- Pre-launch map comparison uses Map A (winding trail) and Map B (original card
  grid) over one shared data and navigation controller. Tester preference is
  browser-local, URL assignment takes precedence, and neither affects progress.
- Automated destructive database tests use only the separately provisioned
  `scripture-memo-integration-tests` Prisma Postgres resource. `DATABASE_URL`
  remains protected, test configuration fails closed, and Prisma MCP write
  operations require explicit project-owner approval.
- Complex operational failures use stable feature codes from one structured
  catalogue. Sonner shows only the short safe message and code; the ADMIN-only
  reference page renders detailed safe guidance. Ordinary validation stays
  uncoded, and codes identify conditions rather than individual occurrences.
- The error reference is application-wide even though its first entries cover
  Waypoints and Verses. Its permanent link belongs on the future admin front
  page, not on either feature's management page.
- The Phase 4 placeholder Server Action using `ActionResult` belongs to the auth
  feature because authentication is the next feature that will consume the
  shared contract.
- `DEFAULT_HINT_ALLOWANCE = 5`.
- `BASE_GLOW_POINTS = 100` controls the Glimmer earning rate. New users start
  with 0 Glow Points.
- The Phase 4 rate limiter is process-local. Production authentication requires
  a distributed provider shared by every application instance.
- Better Auth's public API uses its database-backed rate limiter. Server Action
  calls use the application limiter because Better Auth excludes internal
  `auth.api` calls from its own request limiter.
- Email verification and password reset are deferred until an email delivery
  provider is selected; neither is required by the Phase 5 roadmap acceptance
  criteria.
- No `src/` directory; application code uses root-based, feature-owned folders.
- Route pages are one-line feature-view re-exports.
- Prisma access is repository-only, except singleton definition and Better Auth
  adapter initialization.
- Server Actions are the default mutation boundary and must validate, authenticate,
  authorize, call repositories, and revalidate.
- Durable application data belongs in PostgreSQL through Prisma, not JSON files.
- Mode 4 is Cue, never Hint; hints are a separate system.
- Timed Journey Stages use one server-authoritative deadline per mode attempt:
  Recall 5 minutes, Strengthen 3 minutes, and Master 2 minutes. Expiry permits a
  fresh retry of that mode without erasing completed modes or awarding progress.
- Hints are disabled during Strengthen and Master.
- Cooldowns, game order, completion, and rewards are server-authoritative.
- Glow Points are the only currency; no XP system exists.
- Reward balance changes require a transaction and immutable ledger entry.
- The database schema includes private notes, favorites, suspension state, and
  explicit Vault replay classification.

## Recent Important File Changes

- `features/map/`: Phase 11 batch repository read, map-state helpers and tests,
  ten-node navigator, waypoint cards, skeleton, protected view composition, and
  extensive intent-focused inline documentation across the complete feature.
- `features/map/components/map-positioner.tsx`, related pure helpers/tests, and
  `/map-positioner`: a browser-local, development-only PNG alignment tool that
  exports ten responsive percentage coordinates without persistence or uploads.
- `public/images/maps/` and `features/map/data/map-themes.ts`: three repeating
  owner-supplied Map A backgrounds with separate five-point mobile and
  large-screen alignment metadata.
- `components/shared/journey-stage-badge.tsx` and
  `components/shared/flame-indicator.tsx`: reusable learner-facing progression
  indicators for the map and upcoming Day Selection screen.
- `app/(protected)/game/map/`: one-line page and loading re-exports.
- `features/auth/views/authenticated-home-placeholder-view.tsx`: discoverable
  link to the new map while the later Game Home phase remains pending.
- `AGENTS.md`: consolidated all agent instructions at the repository root; added
  authority, JSON persistence, and project-continuity rules.
- `docs/AGENTS.md`: deleted after consolidation into root `AGENTS.md`.
- `prisma/schema.prisma`: expanded into the complete product-aware schema.
- `lib/prisma.ts`: hardened Prisma 7 singleton with server-only protection and
  explicit environment validation.
- `prisma/migrations/20260712014802_complete_product_schema/migration.sql`:
  created and applied for the complete schema.
- `docs/PRODUCT-OVERVIEW.md` and `docs/ROADMAP.md`: reconciled schema models and
  index requirements.
- `features/landing/views/landing-view.tsx`: public landing page and canonical
  Tailwind gradient syntax.
- `docs/codex-history/CODEX_SESSION_2026-07-11_RECOVERED.md`: recovered historical
  transcript retained as an archive, not as an authoritative status source.
- `types/api.ts`: standard Server Action result contract.
- The temporary auth foundation action was removed after real auth actions adopted
  the shared `ActionResult` contract.
- `lib/dates.ts`, `lib/permissions.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, and
  `lib/constants.ts`: Phase 4 core libraries.
- `docs/PRODUCT-OVERVIEW.md`: records the five-hint default, 100-point base
  reward, and zero starting balance.
- `features/users/` and `features/settings/`: Phase 6 profile reads, preference
  persistence, settings UI, and authenticated preference synchronization.
- `app/(protected)/settings/page.tsx`: one-line protected settings route.
- `features/auth/`: registration, login, logout, translation onboarding, forms,
  repositories, schemas, and views.
- `lib/auth/session.ts`: authoritative server session helpers.
- `proxy.ts`: protected-route and admin navigation guards.
- `prisma/migrations/20260712032838_add_auth_rate_limit/migration.sql`:
  Better Auth database-backed rate-limit storage.
- `features/verses/components/markdown-editor.tsx`: accessible Markdown study-note
  editor with formatting controls, undo/redo, character count, and a safe preview
  that ignores embedded HTML.

## Outstanding Tasks

- Commit and merge the manually accepted Phase 12 changes.
- Select an email delivery provider before implementing verification or password
  reset.
- Phases 13–32 remain pending in roadmap order.
- `.env.example` remains absent and is required by the security checklist.
- Before upgrading to `pg` 9, update the configured database SSL mode explicitly
  to `verify-full` to preserve the current certificate-verification behavior.

## Blockers and Unresolved Questions

- No implementation blocker exists. The dedicated test database is configured,
  migrated, and verified; both repository integration suites pass and clean up
  their fixtures.
- No email delivery provider has been selected, so verification and password
  reset are intentionally not implemented.
- The recovered transcript contains historical references to the deleted
  `docs/AGENTS.md`. They are intentionally preserved because the file is an
  archive of what occurred, not a live instruction source.

## Dated Session Updates

### 2026-07-23 — Phase 14 Drag & Drop completed and accepted

- Added deterministic hidden-word selection and shuffled word-bank ordering
  within each challenge-day range.
- Added position-based placement helpers and tests so duplicate word text never
  becomes the identity of a draggable token.
- Added desktop mouse dragging, touch dragging, keyboard dragging, mobile
  select-and-tap placement, placed-word return, reset, and per-slot feedback.
- Corrected pointer collision so a blank highlights only while the dragged
  pointer is physically over it, disabled drag auto-scroll to prevent
  disorienting viewport movement, and added immediate pickup/drop tones.
- Refined tap feedback so selecting a word highlights every available blank
  without weakening precise drag-drop collision. Returning a placed word now
  plays audio, while leading and trailing punctuation stays in the verse rather
  than following word-bank tiles.
- Unified selection feedback so starting a drag highlights all available blanks
  even when the word was not clicked first; successful drops still require the
  pointer to be physically inside a blank.
- Added a stronger success chord and an animated, reduced-motion-aware mode
  completion interstitial that waits for explicit Continue rather than
  automatically replacing the mode.
- Added an immediate wrong-answer sound and replaced the single success chord
  with a randomized, non-repeating three-sound victory pool: triumphant chord,
  bright fanfare, and a license-safe synthesized crowd-cheer-style celebration.
  The named pool can be extended or replaced with recorded assets later.
- Added a gameplay Exit control back to the current waypoint's Day Selection
  and an administrator-only Test Replay for completed Drag & Drop modes. Test
  Replay is clearly labeled and makes no attempt, reward, cooldown, or
  progression writes.
- Correct checks call the server-owned attempt completion action before success
  audio, confetti, toast feedback, and progression to Puzzle. Pending state
  prevents duplicate submissions.
- Gameplay, progression, and day-selection tests, strict TypeScript, ESLint,
  diff validation, and the production build pass. The project owner manually
  accepted the completed desktop and mobile interaction experience.

### 2026-07-23 — Journey Stage time limits resolved

- Defined forgiving per-mode limits: Recall 5 minutes, Strengthen 3 minutes,
  and Master 2 minutes; Learn remains untimed.
- Defined server-persisted attempt time as authoritative. Browser suspension,
  refresh, navigation, or device-clock changes cannot extend the deadline.
- Expiry fails only the current attempt and allows an immediate retry without
  erasing previously completed modes or awarding progress.
- Updated root instructions, product requirements, roadmap acceptance, security
  audit guidance, and this continuity log with the same contract.

### 2026-07-23 — Phase 12 manually accepted

- The project owner accepted the Day Selection presentation, challenge-state
  behavior, Journey Stage notices, reward previews, and session-start flow.
- The shared live countdown and server cooldown rejection already have focused
  automated coverage. The natural completion-to-cooldown browser flow remains a
  Phase 13 verification because playable modes and day completion begin there.
- Phase 12 is complete. Phase 13 — Gameplay Shared Engine is next after the
  accepted changes are committed and merged.

### 2026-07-22 — Phase 12 Day Selection implemented

- Added the protected dynamic waypoint route, route skeleton, preferred
  translation display, Journey Stage badge, no-hint/timed-stage notices, and
  mobile-first Glimmer, Glow, and Radiance cards.
- Derived ready, locked, cooldown, and completed states from persisted progress
  and server request time. Countdown expiry refreshes server state; it never
  authorizes gameplay in the browser.
- Added reward previews, complete flames, real-time countdowns, blocked-state
  Sonner feedback, pending buttons, action result toasts, and safe 404 handling
  for unavailable or learner-locked direct URLs.
- Added a validated authenticated Start action and gameplay repository that
  atomically prepare the day and create or resume its server-owned GameSession.
- Added a temporary protected session-ready destination for Phase 12 testing;
  Phase 13 will replace it with the five-mode gameplay shell.
- Corrected the Phase 12 roadmap to include Strengthen among timed Journey
  Stages, matching root instructions and the product specification.

### 2026-07-22 — Phase 11 manually accepted

- The project owner confirmed the complete Game Map works as intended,
  including Map A and Map B, shared responsive trail positioning, continuous
  loading, locked trail visibility, distant navigation, and return-to-current.
- Phase 11 is complete. Phase 12 — Day Selection Screen is next after the
  accepted changes are committed and merged.

### 2026-07-22 — Trail Navigator implemented

- Added a full-height right-side Map A panel with thumbnails, sequential trail
  numbers, waypoint ranges, completion progress, and current/locked/completed
  treatments.
- Kept all published trails visible while disabling navigation to fully locked
  groups. Opening centers the current trail in the panel.
- Distant jumps replace the small rendered trail window with the destination
  and its neighbors, preserving progressive rendering as the curriculum grows.
- Navigation honors the operating-system reduced-motion preference.
- Replaced the text trigger with a bottom-right icon control and added an
  adjacent icon control that returns directly to the current trail.

### 2026-07-22 — Shared trail coordinates approved

- Applied the project owner's five approved waypoint positions to mobile and
  large layouts across all three current trail themes.
- Centralized the positions so newly added trail artwork inherits the same
  layout unless the project owner explicitly requests different coordinates.
- Updated the configuration test to guard the exact shared layout.

### 2026-07-14 — Positioner field naming and help clarified

- Renamed the Preview Settings field to `Current-state waypoint`, clarifying
  that it chooses the marker receiving the larger active-player treatment.
- Renamed the sticky-toolbar selector to `Edit waypoint`, clarifying that it
  selects the marker whose coordinates are being changed without altering the
  simulated current state.
- Added keyboard-focusable, touch-sized tooltip icons to every Preview Settings
  field and to the toolbar selector, with distinct explanations of count,
  current state, preview width, breakpoint, and both button diameters.
- TypeScript, ESLint, all 16 map tests, and diff validation passed. The compact
  workspace production build passed immediately before this labels-and-help-only
  change; its final rerun was unavailable because the execution service reported
  an account usage limit. No database operation occurred.

### 2026-07-14 — Map positioner compact workspace implemented

- Removed the tall page header and above-preview configuration cards so the
  development route opens directly into the image workspace.
- Added a sticky compact toolbar with an Image Settings modal, tooltip-labelled
  mobile/large layout icons, Fit/Actual preview icons, active-waypoint selector,
  live zoom summary, and a controls-sheet trigger below desktop width.
- Kept the full inspector sticky beside the preview on desktop and moved the same
  settings, position fields, reset action, and export tools into a scrollable
  side sheet on smaller screens.
- Added Fit mode that calculates one non-enlarging scale for the PNG and waypoint
  controls together. Actual mode preserves configured CSS dimensions with a
  scrollable workspace. Clipping checks now use the rendered scaled diameter.
- Added pure coverage for Fit scaling. TypeScript, ESLint, all 16 map tests, the
  production build, and diff validation passed. No image upload, persistence,
  database operation, commit, or push occurred.

### 2026-07-14 — Five-waypoint continuous trail and responsive positioner implemented

- Changed Map A alone to one complete 9:16 image per five-waypoint group. Map B
  retains its original paginated groups of ten.
- Removed Map A's previous/next group controls. It now opens centered on the
  player's current map, preloads one neighboring map in each direction, mounts
  earlier history while scrolling upward, and mounts future maps while scrolling
  downward. Prepend anchoring prevents scroll jumps when history appears above.
- Restored the repeating Map 1 → Map 2 → Map 3 sequence with separate mobile and
  large-screen position arrays ready for owner-reviewed coordinates.
- Expanded `/map-positioner` with editable image dimensions, waypoint count,
  current-waypoint selection, breakpoint, mobile/large preview widths, normal and
  current button diameters, independent responsive coordinates, real-size
  draggable markers, boundary-clipping warnings, and full configuration export.
- Updated Phase 11 documentation and pure tests for independent group sizes,
  configurable positioner layouts, clipping detection, responsive theme data,
  and indefinite artwork repetition. TypeScript, ESLint, all 15 map tests, the
  production build, and diff validation passed. No database operation occurred.

### 2026-07-14 — Map A mobile clipping and crowding hardened

- Made Map A waypoint controls responsive: 64px normal and 72px current nodes on
  mobile, restoring the original 80px and 96px sizes from the `sm` breakpoint.
- Reduced the mobile card footprint, current-node label, status icon, flame
  indicator, spacing, borders, and shadows while preserving the required 44px
  minimum touch target and the full desktop presentation.
- Added responsive horizontal safe-edge clamping so percentage coordinates
  cannot place part of a waypoint card outside narrow artwork. Pulled each
  panel's final node away from the cloud seam and compacted the seam on mobile.
- Map B and progression behavior remain unchanged. TypeScript, ESLint, all 11
  map tests, the production build, and diff validation passed. No database
  operation was performed.

### 2026-07-14 — Five-waypoint PNG panels and atmospheric join implemented

- Preserved each logical group of ten waypoints while presenting it as two
  vertically stacked 9:16 panels with five comfortably spaced nodes per image.
- Added two repeating compositions: Map 1 + Map 2 and Map 3 + Map 1. Newly
  appended curriculum groups continue alternating these arrangements without a
  visual maximum or any change to progression data.
- Added a responsive CSS cloud-and-mist layer across the panel boundary. It sits
  above both images but below the waypoint controls, cannot intercept input, and
  does not modify the replaceable source PNGs.
- Updated configuration tests to guarantee five in-bounds positions per panel,
  two panels and ten positions per composition, and indefinite composition
  repetition. TypeScript, ESLint, all 11 map tests, the production build, and
  diff validation passed. No database operation was performed.

### 2026-07-14 — Owner-supplied PNG themes previewed in Map A

- Replaced Map A's generated scenery and SVG road with the three supplied PNGs,
  repeating Map 1 → Map 2 → Map 3 for an unlimited number of groups.
- Applied the owner's exact Map 1 positioner export and added initial road-based
  alignment coordinates for Maps 2 and 3 pending visual refinement.
- Kept waypoint buttons, status, flames, current-node emphasis, locking feedback,
  group navigation, progression data, and Map B behavior unchanged.
- Added pure configuration tests for ten in-bounds positions and indefinite
  three-theme cycling. No database or progression data was changed.

### 2026-07-14 — Development PNG map positioner implemented

- Added the development-only `/map-positioner` route; production requests are
  rejected by Proxy with HTTP 404 and repeated server-view `notFound()` defense,
  while metadata and the response are `noindex`.
- Added local PNG selection with exact natural aspect-ratio preview, ten draggable
  and keyboard-adjustable waypoint markers, numeric controls, reset, and
  paste-ready percentage-coordinate export.
- Kept selected artwork entirely inside the browser through a temporary object
  URL. No upload, Server Action, filesystem write, Prisma call, or database
  operation exists in the tool.
- Added pure tests for boundary normalization, pointer conversion, and export
  formatting; the standard map test script now includes them.
- TypeScript, ESLint, eight map tests, production build, diff checks, a live
  development HTTP 200 check, and a production HTTP 404 check passed.

### 2026-07-14 — Game Map documentation audit completed

- Audited every TypeScript/TSX script in `features/map` plus the shared flame and
  Journey Stage indicators used by the map.
- Expanded file, exported API, state, accessibility, responsive-layout, browser
  persistence, SVG geometry, privacy, and data-integrity comments without
  changing map behavior or database state.
- Preserved the required one-line route re-exports and added no comments there.
- TypeScript, ESLint, all five map tests, and working-tree diff validation pass.

### 2026-07-14 — Comparative Map A and Map B testing added

- Preserved the current winding campaign trail as Map A and recovered the
  original Phase 11 card-grid presentation from Git history as Map B.
- Added one accessible segmented switch, browser-local preference persistence,
  and deterministic `?variant=a` / `?variant=b` tester links.
- Centralized locked-waypoint feedback and gameplay routing so both variants
  consume identical progress data and cannot diverge behaviorally.
- Kept waypoint controls, status treatment, and flame progress minimal in Map A.
  After further owner review, Map B restored its original Scripture and Journey
  Stage previews while Day Selection remains the authoritative detail screen.
- Added focused variant parsing and precedence tests. No schema, migration,
  repository query, progression rule, or database data changed.
- Corrected Map B phone-width clipping by compacting long Journey Stage badges,
  allowing Scripture references to wrap safely, tightening status/flame spacing,
  and using one column below 360px instead of forcing unusably narrow cards.

### 2026-07-13 — Phase 11 mobile campaign trail redesign

- Replaced the initial responsive card grid with an original mobile-first
  winding trail inspired by familiar campaign-map interaction patterns without
  copying external artwork or branding.
- Added alternating tactile nodes, connected SVG trail progress, exact
  three-day rings, active-waypoint callout, distinct status treatments,
  scrollable group indicators, and lightweight code-native scenery.
- Redesigned the route skeleton and page header to match the immersive trail
  composition while retaining accessibility, reduced-motion behavior, dark
  mode, existing progression rules, and the batched repository read.
- Simplified node labels after product-owner review: removed visible verse and
  Journey Stage details from the map and retained only flame progress beneath
  each waypoint control.

### 2026-07-13 — Phase 11 Game Map implemented

- Added the protected `/game/map` experience and a discoverable entry from the
  temporary authenticated home.
- Loaded all currently published waypoints plus one learner's sparse waypoint
  and completed-day progress in one batched Prisma request without N+1 reads.
- Rendered one responsive ten-waypoint group at a time with scrollable range
  navigation, Journey Stage badges, status, flame count, locked guidance, and
  current-node emphasis.
- Added an intentional no-curriculum state, route-level ten-card skeleton, and
  the stable future Day Selection destination used by Phase 12.
- Added three pure map-state tests. Strict TypeScript, ESLint, diff validation,
  repository-boundary and thin-route checks, and the production build passed.
  No migration, seed, MCP write, or destructive database operation was run.

### 2026-07-13 — Dedicated Prisma Postgres test database verified

- Installed and authenticated Prisma's official Codex plugin and MCP server.
- Created the non-default `scripture-memo-integration-tests` database as a
  separate Prisma project in Europe (Frankfurt); the existing application
  database was not queried, migrated, or modified.
- Added fail-closed test URL and confirmation validation compatible with Prisma
  Postgres resource URLs, plus focused guard tests.
- Applied all four existing migrations only to the new test resource, without
  seeding it.
- Phase 9 waypoint lifecycle/concurrency and Phase 10 progression/curriculum-lock
  integration suites both passed against real PostgreSQL and completed cleanup.

### 2026-07-13 — Phase 10 curriculum-lock race corrected

- Accepted PR review feedback that first-waypoint initialization and the next
  waypoint unlock could race administrator curriculum mutations.
- Progression now acquires the same transaction-scoped curriculum advisory lock
  used by waypoint administration and holds it across availability selection and
  learner-progress creation.
- Extended isolated database coverage to exercise initialization and next-unlock
  behavior while an administrator transaction holds and mutates under that lock.

### 2026-07-13 — Phase 10 progression engine implemented

- Added lazy first-playable-waypoint initialization and idempotent registration
  and login repair hooks without pre-creating future locked progress.
- Added UTC-safe day ordering and cooldown utilities with focused unit tests.
- Added transaction-locked gameplay preparation and trusted day completion;
  repeat completion, skipped days, cooldown bypass, locked waypoints, and stale
  publication state are rejected server-side.
- Made Day 3 completion, current waypoint completion, and next published
  waypoint unlock atomic. Curriculum numbering gaps are supported and reaching
  the end of currently published curriculum returns a caught-up result.
- Added eight application-wide progression error references and a guarded
  PostgreSQL integration suite. Unit tests, catalogue tests, strict TypeScript,
  lint, architecture checks, diff validation, and production build passed. The
  suite was subsequently executed successfully on the dedicated test resource.

### 2026-07-13 — Operational error-code foundation implemented

- Extended failed `ActionResult` responses with catalogue-derived typed codes and
  added a shared persistent Sonner presenter for coded failures.
- Added 13 documented waypoint and verse codes covering curriculum history,
  publication continuity, Journey Stage rules, stale state, dependencies, and
  unexpected transactional failures.
- Added the server-authorized, searchable, `noindex` `/admin/error-reference`
  page. Its permanent link is intentionally deferred to the future admin front
  page instead of coupling the shared manual to Waypoints or Verses.
- Added fast catalogue tests for code uniqueness, format, and documentation
  completeness while leaving ordinary field validation uncoded.
- Updated authoritative agent, product, roadmap, security, and continuity
  documentation. Catalogue tests, strict TypeScript, ESLint, diff checks,
  thin-route validation, and the production build all passed.

### 2026-07-13 — Direct waypoint positioning added

- Added a per-row **Move to position** dialog for efficient long-distance
  waypoint reordering while retaining arrow controls for small adjustments.
- Direct moves validate whole-number bounds, progressed-waypoint immutability,
  the continuous published prefix, and per-verse Journey Stage order before
  updating local state.
- Successful moves report the requested destination and affected-position count,
  appear in the existing movement preview, and remain pending until **Save
  order** is selected.
- Strict TypeScript, ESLint, diff validation, and the production build passed.

### 2026-07-13 — Phase 9 curriculum-history hardening implemented

- Made published waypoint assignments editable only after hiding an unstarted
  waypoint and made every waypoint with learner-linked records immutable.
- Blocked verse archival while a published waypoint depends on it and froze
  verse content once learner history exists.
- Serialized curriculum topology and verse dependency mutations with shared
  PostgreSQL advisory locks and expanded assignment audit metadata to include
  previous and new state.
- Added an isolated PostgreSQL integration suite guarded by `TEST_DATABASE_URL`;
  its original URL-name check was later replaced by the Prisma Postgres-aware
  fail-closed guard after the dedicated resource was provisioned.
- Added the direct `server-only` dependency needed by standalone repository test
  execution without weakening the Next.js server boundary.
- Updated root instructions, product behavior, Phase 9 acceptance, and Phase 10
  progression constraints. Prisma validation, TypeScript, ESLint, diff checks,
  thin-route validation, and the production build passed.

### 2026-07-13 — Phase 9 assignment modal regression corrected

- Added the missing assigned-waypoint statistic alongside total, unassigned,
  published, and hidden counts.
- Reset assignment-dialog verse and stage state from persisted props on open,
  close, cancellation, successful save, and rejected save so a failed attempt
  cannot appear as the current assignment when the modal is reopened.
- TypeScript, ESLint, `git diff --check`, and the production build passed after
  the regression correction.

### 2026-07-13 — Phase 9 scalability and curriculum invariants revised

- Replaced the fixed 220 limit with ADMIN append-at-end behavior while retaining
  the idempotent 220-record bootstrap seed.
- Added waypoint statistics, continuous publish/hide rules, per-verse stage
  uniqueness and ordering, progress-aware reorder locks, pending visibility
  feedback, detailed movement previews, and aligned assignment-dialog actions.
- Added a PostgreSQL partial unique index migration so Learn, Recall, and
  Strengthen cannot duplicate for a verse while Master remains repeatable.
- Applied the invariant migration successfully. TypeScript, ESLint, Prisma
  validation, `git diff --check`, architecture checks, and the production build
  all passed; revised Phase 9 manual acceptance remains.

### 2026-07-13 — Phase 9 waypoint management implemented

- Approved the hidden, unassigned placeholder lifecycle with provisional
  `LEARN` stage and documented its lack of gameplay effect before publication.
- Added the Phase 9 repository, validated ADMIN actions, atomic audit records,
  fixed-slot ordering, searchable verse assignment, explicit Journey Stage
  selection, visibility controls, admin route, and Prisma 7 seed workflow.
- Added `tsx` as a development dependency for the documented TypeScript seed.
- Seeded all 220 placeholders successfully; a repeat run inserted zero and
  preserved all 220, confirming idempotency.
- TypeScript, ESLint, `git diff --check`, architecture checks, and the production
  Next.js build passed. Manual ADMIN acceptance remains.

### 2026-07-13 — Phase 8 manually accepted

- The project owner confirmed that all Phase 8 manual acceptance tests passed.
- Pack creation, published-verse membership, persistent ordering, visibility
  controls, empty-pack publishing prevention, and automatic hiding after final
  verse removal are accepted.
- Phase 8 is complete; Phase 9 — Admin Waypoint Management is the next roadmap
  task.

### 2026-07-13 — Phase 8 admin pack management implemented

- Added ADMIN-authorized pack repositories, Zod schemas, seven Server Actions,
  transaction-backed audit logging, and hidden/published lifecycle enforcement.
- Added `/admin/packs`, `/admin/packs/new`, and `/admin/packs/[id]/edit` through
  one-line route re-exports with protected loading and error boundaries.
- Added list, metadata form, searchable published-verse assignment, removal,
  persistent ordering, and publish/hide confirmation UI.
- Reordering supports mouse, touch, keyboard sensors, and explicit move buttons;
  two-phase temporary positions preserve the database uniqueness constraint.
- Phase 8 automated verification passed; manual ADMIN acceptance remains.

### 2026-07-13 — Phase 7 audit hardening

- Accepted PR review feedback that publish/archive availability changes lacked
  accountability records and applied the correction consistently to create,
  update, publish, and archive.
- Added stable audit action identifiers and centralized bounded request-IP
  extraction for server-derived audit context.
- Verse writes and their audit records now commit or roll back together.
- Update audits record changed field names only; status audits record prior and
  new availability without duplicating authored content.

### 2026-07-13 — Reference card and searchable long lists

- The project owner accepted canonical form and CSV boundary checks.
- Redesigned the Scripture reference card with a prominent generated-reference
  summary and aligned responsive location controls.
- Added a shared accessible searchable-select pattern and applied it to Bible
  books and countries while preserving simple controls for short lists.

### 2026-07-13 — Canonical Bible location validation implemented

- Added a reproducible, count-only dataset for all 66 books, 1,189 chapters, and
  31,102 NIV/KJV-compatible verse positions.
- Manual creation and editing now use a book selector, dynamic chapter and verse
  bounds, and a read-only generated reference preview.
- Server validation regenerates every reference from structured fields and
  rejects impossible locations independently of client controls.
- Removed `reference` from the CSV contract; imports use the same canonical
  validation and generation rules as individual forms.

### 2026-07-13 — Immediate verse filters implemented

- The project owner manually accepted CSV import and debounced search.
- Book, tag, publication status, and sorting controls now update immediately,
  preserve URL state, reset pagination, and show shared pending feedback.
- Removed the redundant Apply Filters button.

### 2026-07-12 — Phase 7 admin verse management implemented

- Added ADMIN-protected verse repositories, schemas, actions, normalization,
  create/edit forms, list table, filters, pagination, and publish/archive flow.
- All three MVP translations are required and `normalizedText` is generated only
  in the repository from trusted server input.
- Tags use normalized join records and Unicode-safe stable slugs.
- TypeScript, ESLint, diff validation, production build, thin-route checks, and
  repository-only Prisma architecture pass.
- Manual acceptance requires an ADMIN account; initial administrator bootstrap
  remains a project-owner decision.
- Upgraded the study-note field from a plain textarea to a Markdown editor with
  mobile-friendly controls, keyboard shortcuts, write/preview modes, and safe
  React rendering. Markdown remains in the existing `studyNote` text column.
- Fixed an intermittent post-create verse-list failure by removing an unnecessary
  read-only Prisma transaction. Independent list queries now use the normal
  connection-pool queue, and failures receive sanitized contextual server logs.
- The project owner manually accepted create, edit, filter, sort, archive, and
  publish behavior, completing the original Phase 7 acceptance criteria.
- Added an approved CSV enhancement with a downloadable strict template,
  row-level preview, duplicate and invalid-row reporting, server revalidation,
  transactional creation, normalized translations, and an admin audit record.
- Verse reference/book search now updates after a 300ms typing debounce while
  retaining URL-backed filters and pagination reset behavior.

### 2026-07-12 — Phase 6 profile and settings implemented

- Added protected profile/settings repositories, validation, action, form, view,
  and one-line route.
- Added ISO country selection, public-safe journey statistics, Bible translation,
  audio, reduced-motion, and theme preferences.
- Profile identity and preferences update atomically using the server session ID;
  no client-provided user ID is accepted.
- Added a protected-layout preference synchronizer so saved theme, motion, and
  audio state reapply across authenticated navigation and later sessions.
- TypeScript, ESLint, diff validation, production build, repository-boundary
  audit, thin-route audit, and anonymous `/settings` redirect passed.
- Manual authenticated persistence testing remains before Phase 6 is accepted.
- Fixed post-login continuation: Proxy-provided internal destinations such as
  `/settings` are now preserved through login, validated against the protected
  route allowlist to prevent open redirects, and resumed after authentication.

### 2026-07-12 — Phase 5 accepted

- The project owner confirmed the manual authentication flow works correctly.
- Final verification passed: Prisma format/validate/generate, TypeScript, ESLint,
  diff validation, production build, five-rule password-schema behavior, public
  auth rendering, and anonymous redirects for game, translation, and admin paths.
- Phase 5 is complete; Phase 6 — User Profile and Settings is next.

### 2026-07-12 — Phase 5 authentication implemented

- Added validated register/login/logout actions, onboarding repository writes,
  responsive forms, translation selection, session helpers, and protected routes.
- Added full-session Proxy guards for protected and admin routes.
- Added and applied Better Auth's database-backed rate-limit migration.
- Verified Prisma, TypeScript, ESLint, production build, public auth rendering,
  and anonymous protected-route redirects.
- Left manual credential and admin-role acceptance testing to the project owner;
  no test user was inserted into the configured database.
- Improved login-to-registration continuity: the entered login email is carried
  once through tab-scoped `sessionStorage`, then removed after prefilling the
  registration form. Passwords are never persisted and emails are not placed in
  URLs or server logs.
- Added an accessible password visibility toggle and live password-strength
  checker to registration. Added only the approved special-character validation
  rule while preserving the existing length, letter, and number requirements.
- Refined password-field polish after visual review: visibility controls are
  anchored to the input midpoint, and the Good strength state uses a dedicated
  lime treatment that remains distinct in dark mode.
- Strengthened registration passwords by replacing the general letter rule with
  separate lowercase and uppercase requirements. The live checker now uses five
  requirements and reserves Strong for passwords satisfying all five.
- Diagnosed translation onboarding that saved successfully but remained on the
  pending screen. Removed overlapping client push/refresh navigation, added a
  safe action failure result, and made settings persistence self-healing with an
  upsert for partially onboarded accounts.

### 2026-07-12 — Phase 4 completed

- Implemented all Phase 4 core-library tasks and the approved auth-owned action
  contract example.
- Set the free hint allowance to 5 and base reward to 100 while retaining a zero
  starting balance for new users.
- Verified TypeScript, ESLint, diff checks, date arithmetic, permission failures,
  Prisma generation, and the production build.
- Left all changes uncommitted for project-owner review.

### 2026-07-12 — Continuity system established

- Reviewed root instructions, product overview, roadmap, current repository,
  Git history/state, and the recovered 2026-07-11 transcript.
- Added the project continuity workflow to root `AGENTS.md`.
- Created and populated this project log.
- Confirmed normal conversation history remains part of future context recovery.
- Confirmed the repository is authoritative when any source disagrees.
- No application code changed; changes were intentionally left uncommitted.

### 2026-07-12 — Phase 4 action ownership approved

- The project owner approved `features/auth/actions/` as the owner of Phase 4's
  placeholder Server Action using the shared `ActionResult` type.
- Phase 4 implementation has not started and awaits an explicit instruction to
  proceed.

### 2026-07-12 — Phase 3 completed

- Completed the full product-aware Prisma schema.
- Applied migration `20260712014802_complete_product_schema`.
- Verified Prisma generation/validation, TypeScript, ESLint, critical database
  constraints, and the production build.

### 2026-07-11 — Foundation work recovered

- Recovered the prior development transcript into the codex-history archive.
- Completed project bootstrap and global UI foundation work.
- Added the landing page, theme system, shared components, and UI preview.
