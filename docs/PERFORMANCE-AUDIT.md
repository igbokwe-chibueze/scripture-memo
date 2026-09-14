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
- Pending repository runtime check: leader request history remains visible;
  ordinary members/public visitors receive no review requests; private detail
  remains inaccessible to non-members. Source checks preserve these boundaries,
  but runtime verification has not been reported for this correction.

## Remaining audit work

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
